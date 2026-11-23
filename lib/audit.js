'use strict';

const fs = require('fs');
const path = require('path');
const { ADVISORIES, TYPOSQUAT } = require('./advisories');
const {
  walk, readLines, readText, rel, isVulnerableVersion,
  scoreFromFindings, gradeFromScore, SEVERITY_HOURS,
} = require('./utils');

function finding(rule, title, severity, file, line, evidence, fix, category) {
  return { id: rule, rule, title, severity, file, line, evidence: String(evidence).slice(0, 300), fix, category };
}

// ---------------------------------------------------------------- secrets
const SECRET_PATTERNS = [
  { id: 'secret-aws-key', title: 'AWS access key in source code', severity: 'critical', re: /AKIA[0-9A-Z]{16}/, fix: 'Move the key to an environment variable and rotate it — a committed AWS key must be treated as leaked.' },
  { id: 'secret-github-token', title: 'GitHub token in source code', severity: 'critical', re: /(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,})/, fix: 'Move the token to an environment variable and revoke it on GitHub.' },
  { id: 'secret-private-key', title: 'Private key in source code', severity: 'critical', re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, fix: 'Remove the private key from the repo, move it to a secret store, and generate a new key pair.' },
  { id: 'secret-jwt', title: 'Hardcoded JWT secret', severity: 'critical', re: /(jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*['"][^'"]{4,}['"]/, fix: 'Read the JWT secret from an environment variable (e.g. process.env.JWT_SECRET) and use a long random value.' },
  { id: 'secret-password', title: 'Hardcoded password', severity: 'critical', re: /(password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i, fix: 'Read the password from an environment variable; never commit a real password.' },
  { id: 'secret-api-key', title: 'Hardcoded API key', severity: 'critical', re: /(api[_-]?key|API_KEY)\s*[:=]\s*['"][^'"]{8,}['"]/i, fix: 'Read the API key from an environment variable and rotate the exposed key.' },
  { id: 'secret-session', title: 'Hardcoded session secret', severity: 'high', re: /(session[_-]?secret|SESSION_SECRET)\s*[:=]\s*['"][^'"]{4,}['"]/i, fix: 'Read the session secret from an environment variable.' },
  { id: 'secret-generic', title: 'High-entropy secret-like string', severity: 'high', re: /(secret|token|api[_-]?key)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{24,}['"]/i, fix: 'Confirm whether this is a real credential; if so, move it to an environment variable.' },
];

function scanSecrets(files, root, gitignored, findings) {
  for (const file of files) {
    const base = path.basename(file);
    const r = rel(root, file);
    // Skip the demo .env.example and any file that is only a placeholder doc.
    if (base === '.env.example') continue;
    // A .env file that is gitignored is a local file, not a committed secret.
    if (base === '.env' || base.startsWith('.env.')) {
      if (gitignored.has('.env') || gitignored.has(base)) continue;
      findings.push(finding('secret-committed-env', 'Committed .env file', 'critical', r, 1,
        `${base} is present in the project and is not gitignored — secrets in it can leak via git history.`,
        'Add .env to .gitignore, remove it from git history, and rotate every secret it contains.', 'secrets'));
      continue;
    }
    if (!/\.(js|ts|jsx|tsx|json|py|java|properties|yml|yaml|env)$/.test(file)) continue;
    if (file.endsWith('package.json') || file.endsWith('package-lock.json')) continue;
    const lines = readLines(file);
    lines.forEach((line, i) => {
      if (/process\.env/.test(line)) return; // env-var reads are the fix, not a finding
      // Obviously fake placeholders are not secrets — skip the whole line.
      if (/EXAMPLE|PLACEHOLDER|CHANGE_ME|your-.*-here|xxx+/i.test(line)) return;
      for (const p of SECRET_PATTERNS) {
        if (p.re.test(line)) {
          if (p.id === 'secret-aws-key' && /AKIAIOSFODNN7EXAMPLE/.test(line)) continue;
          // Avoid double-flagging the same line as both jwt/password and generic.
          if (p.id === 'secret-generic' && findings.some(f => f.file === r && f.line === i + 1 && f.category === 'secrets')) continue;
          findings.push(finding(p.id, p.title, p.severity, r, i + 1, line.trim(), p.fix, 'secrets'));
          break;
        }
      }
    });
  }
}

// ------------------------------------------------------------- dependencies
function scanDependencies(files, root, findings) {
  for (const file of files) {
    if (path.basename(file) !== 'package.json') continue;
    const r = rel(root, file);
    let pkg;
    try { pkg = JSON.parse(readText(file)); } catch { continue; }
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    for (const [name, spec] of Object.entries(deps).sort()) {
      for (const adv of ADVISORIES) {
        if (name === adv.package && isVulnerableVersion(String(spec), adv.fixedIn)) {
          findings.push(finding('dep-vulnerable', `Vulnerable dependency: ${name} ${spec} (${adv.cve})`, adv.severity, r, 1,
            `"${name}": "${spec}" — ${adv.title} (${adv.cve}). Fixed in ${adv.fixedIn}.`,
            `Upgrade ${name} to ${adv.fixedIn} or later and re-run npm audit.`, 'dependencies'));
        }
      }
      const typo = TYPOSQUAT.find(t => t.name === name);
      if (typo) {
        findings.push(finding('dep-typosquat', `Suspicious package name: ${name} (looks like ${typo.looksLike})`, 'high', r, 1,
          `"${name}" closely resembles the popular package "${typo.looksLike}".`,
          `Verify ${name} is the package you intended; remove it if it was a typo.`, 'dependencies'));
      }
    }
    // package-lock.json, if present, is checked the same way (locked versions).
    const lockFile = path.join(path.dirname(file), 'package-lock.json');
    if (fs.existsSync(lockFile)) {
      let lock;
      try { lock = JSON.parse(readText(lockFile)); } catch { lock = null; }
      if (lock && lock.packages) {
        for (const [key, entry] of Object.entries(lock.packages).sort()) {
          const name = key.replace(/^node_modules\//, '');
          if (!name || name.includes('/')) continue;
          for (const adv of ADVISORIES) {
            if (name === adv.package && entry.version && isVulnerableVersion(entry.version, adv.fixedIn)) {
              if (findings.some(f => f.rule === 'dep-vulnerable' && f.evidence.includes(`"${name}"`))) continue;
              findings.push(finding('dep-vulnerable', `Vulnerable dependency: ${name} ${entry.version} (${adv.cve})`, adv.severity, rel(root, lockFile), 1,
                `Locked "${name}": "${entry.version}" — ${adv.title}. Fixed in ${adv.fixedIn}.`,
                `Upgrade ${name} to ${adv.fixedIn} or later.`, 'dependencies'));
            }
          }
        }
      }
    }
  }
}

function runNpmAudit(root) {
  // Optional passthrough; non-fatal if npm or network is unavailable.
  // npm audit exits non-zero when it finds vulnerabilities, so read
  // its stdout regardless of the exit code.
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync('npm', ['audit', '--json'], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const data = JSON.parse(res.stdout || '{}');
    if (!data.metadata) return { available: false, criticalHigh: 0, raw: null };
    const count = (data.metadata.vulnerabilities.critical || 0) + (data.metadata.vulnerabilities.high || 0);
    return { available: true, criticalHigh: count, raw: data.metadata.vulnerabilities };
  } catch {
    return { available: false, criticalHigh: 0, raw: null };
  }
}

// ----------------------------------------------------------- auth / config
function scanAuthConfig(files, root, findings) {
  for (const file of files) {
    if (!/\.(js|ts|jsx|tsx|java)$/.test(file)) continue;
    const text = readText(file);
    const lines = text.split(/\r?\n/);
    const r = rel(root, file);
    const hasAuthHelper = /requireAuth|isAuthenticated|verifyToken|isAdmin|Authorization/.test(text);
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/Access-Control-Allow-Origin['"]?\s*[:=,]\s*['"]?\*/.test(line) || /origin\s*:\s*['"]\*['"]/.test(line) || /cors\(\s*\)/.test(line)) {
        findings.push(finding('auth-cors-wildcard', 'CORS allows any origin (*)', 'high', r, n, line.trim(), 'Restrict CORS to the exact origins the app serves (e.g. https://your-domain.com).', 'auth-config'));
      }
      if (/\.(get|post|put|delete|use)\s*\(\s*['"]\/(debug|__debug__|test-debug)/.test(line)) {
        findings.push(finding('auth-debug-endpoint', 'Debug endpoint exposed', 'high', r, n, line.trim(), 'Remove the debug endpoint, or protect it with authentication and disable it in production.', 'auth-config'));
      }
      if (/pathname\s*===?\s*['"]\/debug['"]|url\s*===?\s*['"]\/debug['"]/.test(line) || /['"]\/debug['"]/.test(line) && /if\s*\(/.test(line)) {
        if (!findings.some(f => f.rule === 'auth-debug-endpoint' && f.file === r)) {
          findings.push(finding('auth-debug-endpoint', 'Debug endpoint exposed', 'high', r, n, line.trim(), 'Remove the debug endpoint, or protect it with authentication and disable it in production.', 'auth-config'));
        }
      }
      if (/\.(get|post|put|delete)\s*\(\s*['"]\/admin/.test(line) && !/requireAuth|isAdmin|verifyToken|auth/.test(line)) {
        findings.push(finding('auth-admin-no-auth', 'Admin route has no authentication', 'critical', r, n, line.trim(), 'Add authentication (and an admin-role check) before the admin handler.', 'auth-config'));
      }
      if (/pathname\s*===?\s*['"]\/admin['"]/.test(line) && !hasAuthHelper) {
        findings.push(finding('auth-admin-no-auth', 'Admin route has no authentication', 'critical', r, n, line.trim(), 'Add authentication (and an admin-role check) before the admin handler.', 'auth-config'));
      }
      if (/jwt\.decode\s*\(/.test(line) && !/^\s*\/\//.test(line)) {
        findings.push(finding('auth-jwt-decode', 'JWT decoded without verification (jwt.decode)', 'critical', r, n, line.trim(), 'Use jwt.verify() with the secret and check expiry; jwt.decode() trusts any token.', 'auth-config'));
      }
      if (/secret\s*:\s*['"][^'"]+['"]/.test(line) && /session|express-session/.test(text)) {
        findings.push(finding('auth-session-secret', 'Hardcoded session secret', 'high', r, n, line.trim(), 'Read the session secret from an environment variable.', 'auth-config'));
      }
      if (/\.csrf\(\)\.disable\(\)|csrf\(AbstractHttpConfigurer::disable/.test(line)) {
        findings.push(finding('auth-csrf-disabled', 'CSRF protection disabled', 'high', r, n, line.trim(), 'Re-enable CSRF protection for browser-facing forms, or justify the exemption in code.', 'auth-config'));
      }
      // SQL concatenation in Java files is owned by scanSpring
      // (spring-sql-concat); the generic check covers JS/TS only so the
      // same line is never flagged twice.
      if (!file.endsWith('.java') && /SELECT|INSERT|UPDATE|DELETE/i.test(line) && /(\+\s*[a-zA-Z_$]|\$\{|`\s*\+|"\s*\+|'\s*\+)/.test(line) && /["'`]/.test(line)) {
        findings.push(finding('data-sql-concat', 'SQL query built by string concatenation (SQL injection risk)', 'critical', r, n, line.trim(), 'Use parameterised queries / prepared statements instead of concatenating user input into SQL.', 'data-rls'));
      }
      if (/\.from\(\s*['"]/.test(line) && /supabase/i.test(text)) {
        // handled at project level below; per-line marker not needed
      }
    });
    // Manual JWT decoding: splitting a token and base64-decoding its
    // payload by hand, with no signature verification anywhere.
    if (/split\(['"]\.['"]\)/.test(text) && /base64/.test(text) && /token/i.test(text) && !/verify|jwt\.decode/.test(text)) {
      const idx = lines.findIndex(l => /split\(['"]\.['"]\)/.test(l));
      findings.push(finding('auth-jwt-decode', 'JWT decoded without verification (token payload base64-decoded by hand)', 'critical', r, idx + 1, lines[idx].trim(), 'Use jwt.verify() with the secret and check expiry; decoding a token by hand trusts any token.', 'auth-config'));
    }
    // Server entry without rate limiting.
    if (/createServer\s*\(|express\s*\(\s*\)/.test(text) && !/rateLimit|rate-limit|express-rate-limit|throttle|RateLimiter/.test(text)) {
      const idx = lines.findIndex(l => /createServer|express\s*\(\s*\)/.test(l));
      findings.push(finding('auth-no-rate-limit', 'No rate limiting on the server', 'medium', r, idx + 1, lines[idx].trim(), 'Add rate limiting (e.g. express-rate-limit, or a simple per-IP counter) on login and API routes.', 'auth-config'));
    }
    // Uses jsonwebtoken but never verifies a token.
    if (/jsonwebtoken|require\(['"]jwt['"]\)/.test(text) && !/jwt\.verify|verify\(/.test(text)) {
      const idx = lines.findIndex(l => /jsonwebtoken|require\(['"]jwt/.test(l));
      findings.push(finding('auth-jwt-no-verify', 'JWT library used but no token verification found', 'high', r, idx + 1, lines[idx].trim(), 'Verify every incoming token with jwt.verify() before trusting it.', 'auth-config'));
    }
    // Stripe webhook without signature verification.
    if (/stripe/i.test(text) && /webhook/i.test(text) && !/constructEvent/.test(text)) {
      const idx = lines.findIndex(l => /webhook/i.test(l));
      findings.push(finding('data-stripe-webhook', 'Stripe webhook handler without signature verification', 'critical', r, idx + 1, lines[idx].trim(), 'Verify the webhook signature with stripe.webhooks.constructEvent() using the endpoint secret.', 'data-rls'));
    }
    // BOLA-prone endpoint: /:id (Express) or /api/<resource>/<param> (raw http).
    const bolaLine = lines.findIndex(l => /\/:[a-zA-Z]+Id|\/:id/.test(l) || /startsWith\(['"]\/api\/\w+\//.test(l));
    if (bolaLine >= 0) {
      const hasOwnership = /owner\s*===|order\.owner|\.owner\s*===|req\.user/.test(text) && /owner/.test(text);
      const hasUserCheck = /req\.user/.test(text) && /owner/.test(text);
      if (!hasOwnership && !hasUserCheck) {
        findings.push(finding('data-bola', 'BOLA-prone endpoint: resource by ID with no ownership check', 'high', r, bolaLine + 1, lines[bolaLine].trim(), 'Check that the logged-in user owns the requested resource before returning it.', 'data-rls'));
      }
    }
  }
  // Supabase without RLS policies (project level).
  const allText = files.filter(f => /\.(js|ts|jsx|tsx)$/.test(f)).map(f => readText(f)).join('\n');
  const hasSupabaseQuery = /\.from\(\s*['"][a-zA-Z_]+['"]\)/.test(allText) && /supabase/i.test(allText);
  if (hasSupabaseQuery) {
    const hasPolicy = files.some(f => {
      const t = readText(f);
      return /CREATE POLICY|ENABLE ROW LEVEL SECURITY/i.test(t);
    });
    if (!hasPolicy) {
      const supFile = files.find(f => /supabase/i.test(readText(f)) && /\.from\(/.test(readText(f)));
      const r = supFile ? rel(root, supFile) : 'supabase client';
      const lineNo = supFile ? readLines(supFile).findIndex(l => /\.from\(/.test(l)) + 1 : 1;
      findings.push(finding('data-supabase-no-rls', 'Supabase queries used with no Row Level Security policy file', 'high', r, lineNo,
        'Supabase client queries found, but no migration/policy file enables Row Level Security.',
        'Enable RLS on every table and add CREATE POLICY rules so users can only read their own rows.', 'data-rls'));
    }
  }
}

// ------------------------------------------------------------ Spring Boot
function scanSpring(files, root, findings) {
  for (const file of files) {
    const base = path.basename(file);
    const r = rel(root, file);
    if (base === 'application.properties' || base === 'application.yml' || base === 'application.yaml') {
      const lines = readLines(file);
      const text = lines.join('\n');
      lines.forEach((line, i) => {
        const m = line.match(/^\s*([\w.-]*(password|secret|key|token)[\w.-]*)\s*[:=]\s*(.+?)\s*$/i);
        if (m) {
          const value = m[3].trim().replace(/^['"]|['"]$/g, '');
          if (value && !value.includes('${') && !/^(changeme|example|placeholder)$/i.test(value)) {
            findings.push(finding('spring-secret', `Hardcoded secret in ${base}: ${m[1]}`, 'critical', r, i + 1, line.trim(), `Move ${m[1]} to an environment variable (e.g. \${${m[1].toUpperCase().replace(/[.-]/g, '_')}}) or a secret store.`, 'spring-boot'));
          }
        }
      });
      if (/spring\.datasource\.url\s*[:=]/.test(text) && !/hikari/i.test(text)) {
        findings.push(finding('spring-pool-defaults', 'Database connection-pool settings not configured (HikariCP defaults)', 'low', r, 1,
          'A datasource URL is configured but no HikariCP pool settings (maximum-pool-size, connection-timeout) are set.',
          'Set spring.datasource.hikari.maximum-pool-size and connection-timeout explicitly for production.', 'spring-boot'));
      }
    }
    if (file.endsWith('.java')) {
      const lines = readLines(file);
      lines.forEach((line, i) => {
        // Only sensitive paths are flagged: /admin, /api, /actuator,
        // /users, anyRequest, or a /** wildcard. Public paths such as
        // /health, /login and /public are legitimate for permitAll().
        const sensitivePath = /\/admin|\/api|\/actuator|\/users|anyRequest|\/\*\*/.test(line);
        const publicPath = /\/health|\/login|\/public/.test(line);
        if (/permitAll\(\)/.test(line) && sensitivePath && !publicPath) {
          findings.push(finding('spring-permitall-admin', 'Spring Security permitAll on a sensitive path', 'critical', r, i + 1, line.trim(), 'Require authentication (and an admin role) for /admin and other sensitive paths.', 'spring-boot'));
        }
        if (/SELECT|INSERT|UPDATE|DELETE/i.test(line) && /(\+\s*[a-zA-Z_$]|\$\{)/.test(line) && /["'`]/.test(line)) {
          findings.push(finding('spring-sql-concat', 'Spring/JPA query built by string concatenation (SQL injection risk)', 'critical', r, i + 1, line.trim(), 'Use parameterised queries (@Query with named parameters or JdbcTemplate with ? placeholders).', 'spring-boot'));
        }
      });
    }
  }
}

// ------------------------------------------------------------------- main
function runAudit(targetPath, opts = {}) {
  const root = path.resolve(targetPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Target directory not found: ${targetPath}`);
  }
  const files = walk(root).sort();
  const gitignorePath = path.join(root, '.gitignore');
  const gitignored = new Set();
  if (fs.existsSync(gitignorePath)) {
    for (const l of readText(gitignorePath).split(/\r?\n/)) {
      const t = l.trim();
      if (t && !t.startsWith('#')) gitignored.add(t);
    }
  }
  let findings = [];
  scanSecrets(files, root, gitignored, findings);
  scanDependencies(files, root, findings);
  scanAuthConfig(files, root, findings);
  scanSpring(files, root, findings);

  // Deterministic order: file, line, rule.
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  // De-duplicate identical findings.
  const seen = new Set();
  findings = findings.filter(f => {
    const k = `${f.rule}|${f.file}|${f.line}|${f.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let npmAudit = null;
  if (opts.npmAudit) npmAudit = runNpmAudit(root);

  const score = scoreFromFindings(findings);
  const grade = gradeFromScore(score, findings);
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  const fixHours = findings.reduce((s, f) => s + (SEVERITY_HOURS[f.severity] || 0), 0);
  const fixEstimate = fixHours % 1 === 0 ? `${fixHours}h` : `${fixHours.toFixed(1)}h`;

  return {
    tool: 'vibe-code-rescue',
    version: '1.0.0',
    target: (() => { const r = rel(process.cwd(), root); return r && !r.startsWith('..') ? r : path.basename(root); })(),
    targetAbsolute: root,
    score, grade,
    counts: { total: findings.length, ...bySeverity },
    fixEstimate,
    findings,
    npmAudit,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { runAudit, scanSecrets, scanDependencies, scanAuthConfig, scanSpring };

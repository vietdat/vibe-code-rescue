'use strict';

const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

function badgeMarkdown(result) {
  const grade = result.grade;
  const color = grade === 'A' ? 'brightgreen' : grade === 'B' ? 'green' : grade === 'C' ? 'yellow' : grade === 'D' ? 'orange' : 'red';
  return `![vibe-rescue grade ${grade} (${result.score}/100)](https://img.shields.io/badge/vibe--rescue-${grade}%20${result.score}%2F100-${color})`;
}

function plainSummary(f) {
  const map = {
    'secret-aws-key': 'An AWS access key is written directly in the code. Anyone who sees this code can use the key.',
    'secret-github-token': 'A GitHub token is written directly in the code. Anyone who sees it can act as that account.',
    'secret-private-key': 'A private key is stored in the code. It must be replaced, because anyone with the code has the key.',
    'secret-jwt': 'The key used to sign login tokens is written in the code. Anyone who reads it can forge a login.',
    'secret-password': 'A real password is written in the code.',
    'secret-api-key': 'An API key is written in the code. Anyone who sees it can use the service as you.',
    'secret-session': 'The session secret is written in the code, so sessions can be forged.',
    'secret-generic': 'A long secret-like value is written in the code. Check whether it is a real credential.',
    'secret-committed-env': 'A file holding secrets (.env) is in the project and could be committed to git.',
    'dep-vulnerable': 'A library with a known security hole is in use. Updating it closes the hole.',
    'dep-typosquat': 'A package name looks like a typo of a popular package. It may be the wrong package.',
    'auth-cors-wildcard': 'Any website on the internet is allowed to call this app, including malicious ones.',
    'auth-debug-endpoint': 'A debug page is reachable by anyone. It can leak internal information.',
    'auth-admin-no-auth': 'The admin page can be opened without logging in.',
    'auth-jwt-decode': 'Login tokens are read without checking they are genuine.',
    'auth-jwt-no-verify': 'The app uses login tokens but never checks they are genuine.',
    'auth-session-secret': 'The session secret is written in the code, so sessions can be forged.',
    'auth-csrf-disabled': 'Protection against cross-site request forgery is switched off.',
    'auth-no-rate-limit': 'There is no limit on how fast someone can send requests, so brute-force and spam are easy.',
    'data-sql-concat': 'Database queries are built by joining text together, so an attacker can inject their own SQL.',
    'data-bola': 'A resource can be fetched by its number/ID without checking who owns it, so one user can see another user\'s data.',
    'data-supabase-no-rls': 'Database rows are queried directly with no row-level security rules, so users may see each other\'s rows.',
    'data-stripe-webhook': 'Payment notifications are accepted without checking they really came from Stripe.',
    'spring-secret': 'A secret is written directly in the Spring configuration file.',
    'spring-permitall-admin': 'Spring Security lets anyone open a sensitive page without logging in.',
    'spring-sql-concat': 'A database query is built by joining text together, so an attacker can inject their own SQL.',
    'spring-pool-defaults': 'Database connection-pool limits are not set, so the app may run out of connections under load.',
  };
  return map[f.rule] || f.title;
}

function toMarkdown(result) {
  const lines = [];
  lines.push('# Vibe-Code Rescue Report');
  lines.push('');
  lines.push(`**Target:** \`${result.target}\``);
  lines.push('');
  lines.push(`**Grade: ${result.grade} (${result.score}/100)**`);
  lines.push('');
  lines.push(badgeMarkdown(result));
  lines.push('');
  lines.push('## What this means');
  lines.push('');
  if (result.grade === 'A') lines.push('This codebase passed the checks. Keep the good habits: secrets in environment variables, dependencies up to date, and admin pages behind login.');
  else if (result.grade === 'B') lines.push('This codebase is in decent shape, with a few issues to fix before it handles real user data.');
  else if (result.grade === 'C') lines.push('This codebase works, but it has real security gaps. Fix the Critical and High items before launching.');
  else if (result.grade === 'D') lines.push('This codebase has serious security gaps. Do not put real user data on it until the Critical items are fixed.');
  else lines.push('This codebase is not safe to launch as it is. Several Critical issues let an attacker take over accounts, read other users\' data, or use your cloud keys.');
  lines.push('');
  lines.push(`**Findings:** ${result.counts.total} total — ${result.counts.critical} Critical, ${result.counts.high} High, ${result.counts.medium} Medium, ${result.counts.low} Low.`);
  lines.push('');
  lines.push(`**Estimated fix time:** ${result.fixEstimate} (rough estimate: Critical ~2h, High ~1h, Medium ~30min, Low ~15min each).`);
  lines.push('');
  if (result.live) {
    lines.push('## Live probes');
    lines.push('');
    for (const p of result.live.probes) {
      lines.push(`- **${p.name}**: ${p.result} — ${p.detail}`);
    }
    lines.push('');
  }
  lines.push('## Findings');
  lines.push('');
  if (result.findings.length === 0) {
    lines.push('No findings. Nothing to fix.');
  } else {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
    for (const f of sorted) {
      lines.push(`### [${SEVERITY_LABEL[f.severity]}] ${f.title}`);
      lines.push('');
      lines.push(`${plainSummary(f)}`);
      lines.push('');
      lines.push(`- **Where:** \`${f.file}:${f.line}\``);
      lines.push(`- **Evidence:** \`${f.evidence}\``);
      lines.push(`- **Fix:** ${f.fix}`);
      lines.push('');
    }
  }
  lines.push('## How the grade works');
  lines.push('');
  lines.push('The score starts at 100. Critical findings subtract 6 points, High 3, Medium 2, Low 1. Grades: A (90+), B (80+), C (70+), D (60+), F (below 60). Any Critical finding caps the grade at C, and any High finding caps it at B — a codebase with a critical hole is never an "A". The same code always gets the same score — the checks are deterministic and run offline.');
  lines.push('');
  lines.push('## Limits');
  lines.push('');
  lines.push('These are static checks and live probes, not a full penetration test. Some findings are heuristics and can be false positives — see `docs/` for what each check looks for and where it can be wrong. A good grade does not prove an app is secure.');
  lines.push('');
  lines.push(`_Generated by vibe-code-rescue v${result.version} on ${result.generatedAt}._`);
  lines.push('');
  return lines.join('\n');
}

function toTextSummary(result) {
  const lines = [];
  lines.push(`vibe-code-rescue — ${result.target}`);
  lines.push(`Grade: ${result.grade} (${result.score}/100) — ${result.counts.total} findings (${result.counts.critical} critical, ${result.counts.high} high, ${result.counts.medium} medium, ${result.counts.low} low)`);
  lines.push(`Estimated fix time: ${result.fixEstimate}`);
  if (result.findings.length) {
    lines.push('');
    for (const f of result.findings) {
      lines.push(`[${f.severity.toUpperCase()}] ${f.file}:${f.line} — ${f.title}`);
    }
  } else {
    lines.push('No findings.');
  }
  if (result.live) {
    lines.push('');
    lines.push('Live probes:');
    for (const p of result.live.probes) lines.push(`- ${p.name}: ${p.result} — ${p.detail}`);
  }
  return lines.join('\n');
}

module.exports = { toMarkdown, toTextSummary, badgeMarkdown, plainSummary };

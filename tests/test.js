'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'vibe-rescue.js');
const DEMO = path.join(ROOT, 'demo', 'vulnerable-app');
const SPRING = path.join(ROOT, 'demo', 'spring-boot-sample');

const { runAudit } = require('../lib/audit');
const { toMarkdown } = require('../lib/report');
const { gradeFromScore } = require('../lib/utils');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-rescue-test-'));
}

function write(root, relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

function runCli(args, cwd = ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

// ------------------------------------------------------------ secrets
test('secret detection: true positives on a vulnerable fixture', () => {
  const dir = tmpDir();
  write(dir, 'config.js', [
    "const JWT_SECRET = 'demo-jwt-secret-do-not-use';",
    "const API_KEY = 'sk-demo-fake-api-key-12345678';",
    "const password = 'demo-password-1234';",
  ].join('\n'));
  write(dir, '.env', 'DB_PASSWORD=demo-password-1234\n');
  const result = runAudit(dir);
  const rules = result.findings.map(f => f.rule);
  assert.ok(rules.includes('secret-jwt'), 'expected secret-jwt');
  assert.ok(rules.includes('secret-api-key'), 'expected secret-api-key');
  assert.ok(rules.includes('secret-password'), 'expected secret-password');
  assert.ok(rules.includes('secret-committed-env'), 'expected secret-committed-env');
});

test('secret detection: no false positive on clean code', () => {
  const dir = tmpDir();
  write(dir, 'app.js', [
    'const greeting = "hello world";',
    'const apiUrl = process.env.API_URL || "https://example.com";',
    'const jwtSecret = process.env.JWT_SECRET;',
    'function add(a, b) { return a + b; }',
  ].join('\n'));
  write(dir, '.env.example', 'JWT_SECRET=CHANGE_ME\nAPI_URL=https://example.com\n');
  const result = runAudit(dir);
  const secrets = result.findings.filter(f => f.category === 'secrets');
  assert.deepEqual(secrets, [], `expected no secret findings, got ${JSON.stringify(secrets)}`);
  assert.equal(result.counts.critical, 0);
});

test('secret detection: placeholder-only values are not flagged', () => {
  const dir = tmpDir();
  write(dir, 'config.js', [
    "const password = 'CHANGE_ME';",
    "const JWT_SECRET = 'your-secret-here';",
    "const API_KEY = 'EXAMPLE-KEY-12345678';",
  ].join('\n'));
  const result = runAudit(dir);
  const secrets = result.findings.filter(f => f.category === 'secrets');
  assert.deepEqual(secrets, [], `expected no secret findings, got ${JSON.stringify(secrets)}`);
});

test('secret detection: obviously fake AWS example key is not flagged', () => {
  const dir = tmpDir();
  write(dir, 'docs.js', '// Example key from AWS docs: AKIAIOSFODNN7EXAMPLE\nconst x = 1;\n');
  const result = runAudit(dir);
  assert.ok(!result.findings.some(f => f.rule === 'secret-aws-key'));
});

// -------------------------------------------------------- dependencies
test('dependency audit: flags lodash 4.17.20 (CVE-2020-8203) and minimist 1.2.5', () => {
  const dir = tmpDir();
  write(dir, 'package.json', JSON.stringify({ name: 'x', dependencies: { lodash: '4.17.20', minimist: '1.2.5' } }));
  const result = runAudit(dir);
  const vuln = result.findings.filter(f => f.rule === 'dep-vulnerable');
  assert.equal(vuln.length, 2);
  assert.ok(vuln.some(f => f.evidence.includes('CVE-2020-8203')));
  assert.ok(vuln.some(f => f.evidence.includes('CVE-2021-44906')));
});

test('dependency audit: fixed lodash 4.17.21 is not flagged; typosquat is flagged', () => {
  const dir = tmpDir();
  write(dir, 'package.json', JSON.stringify({ name: 'x', dependencies: { lodash: '4.17.21', lodahs: '4.17.21' } }));
  const result = runAudit(dir);
  assert.ok(!result.findings.some(f => f.rule === 'dep-vulnerable'), 'fixed lodash must not be flagged');
  assert.ok(result.findings.some(f => f.rule === 'dep-typosquat'), 'expected dep-typosquat for lodahs');
});

// ------------------------------------------------------------- grading
test('grade determinism: same input twice gives the same score and grade', () => {
  const a = runAudit(DEMO);
  const b = runAudit(DEMO);
  assert.equal(a.score, b.score);
  assert.equal(a.grade, b.grade);
  assert.deepEqual(a.findings, b.findings);
});

test('demo app: audit finds 15+ real flaws and grades F', () => {
  const result = runAudit(DEMO);
  assert.ok(result.findings.length >= 15, `expected 15+ findings, got ${result.findings.length}`);
  assert.equal(result.grade, 'F');
  assert.ok(result.counts.critical > 0);
});

test('spring sample: audit finds secrets, permitAll and SQL concat', () => {
  const result = runAudit(SPRING);
  const rules = result.findings.map(f => f.rule);
  assert.ok(rules.includes('spring-secret'), 'expected spring-secret');
  assert.ok(rules.includes('spring-permitall-admin'), 'expected spring-permitall-admin');
  assert.ok(rules.some(r => r === 'spring-sql-concat' || r === 'data-sql-concat'), 'expected SQL concat finding');
  // One flaw, one finding: the Java SQL concat must not be double-counted.
  const sqlConcat = result.findings.filter(f => f.rule === 'data-sql-concat' || f.rule === 'spring-sql-concat');
  assert.equal(sqlConcat.length, 1, `expected exactly 1 SQL-concat finding, got ${sqlConcat.length}`);
});

test('spring permitAll: public paths are not flagged, sensitive paths are', () => {
  const dir = tmpDir();
  write(dir, 'src/main/java/com/example/demo/SecurityConfig.java', [
    'package com.example.demo;',
    'public class SecurityConfig {',
    '  void configure() {',
    '    http.authorizeHttpRequests(auth -> auth',
    '      .requestMatchers("/health").permitAll()',
    '      .requestMatchers("/login").permitAll()',
    '      .requestMatchers("/public/**").permitAll()',
    '      .requestMatchers("/admin/**").permitAll());',
    '  }',
    '}',
  ].join('\n'));
  const result = runAudit(dir);
  const permitAll = result.findings.filter(f => f.rule === 'spring-permitall-admin');
  assert.equal(permitAll.length, 1, `expected exactly 1 permitAll finding (for /admin), got ${JSON.stringify(permitAll)}`);
  assert.match(permitAll[0].evidence, /\/admin/);
});

test('grade cap: 95 points with one Critical is C, with one High is B', () => {
  assert.equal(gradeFromScore(95, []), 'A');
  assert.equal(gradeFromScore(95, [{ severity: 'critical' }]), 'C');
  assert.equal(gradeFromScore(95, [{ severity: 'high' }]), 'B');
  assert.equal(gradeFromScore(92, [{ severity: 'critical' }]), 'C');
});

test('report generation contains file:line evidence', () => {
  const result = runAudit(DEMO);
  const md = toMarkdown(result);
  assert.match(md, /Grade: F/);
  assert.match(md, /config\.js:\d+/);
  assert.match(md, /vibe-rescue-report|vibe--rescue/);
  for (const f of result.findings.slice(0, 5)) {
    assert.ok(md.includes(`${f.file}:${f.line}`), `report missing ${f.file}:${f.line}`);
  }
});

// ------------------------------------------------------------------ fix
test('--fix on a temp copy of the demo improves the score', () => {
  const dir = tmpDir();
  fs.cpSync(DEMO, dir, { recursive: true });
  const before = runAudit(dir);
  const res = runCli(['audit', dir, '--fix']);
  assert.equal(res.status, 1, `expected exit 1 (critical findings remain) after fix, got ${res.status}: ${res.stdout} ${res.stderr}`);
  assert.match(res.stdout, /Applied fixes/);
  const after = runAudit(dir);
  assert.ok(after.score > before.score, `score did not improve: before ${before.score}, after ${after.score}`);
  assert.ok(after.findings.length < before.findings.length, 'finding count did not drop after --fix');
  // --fix never deletes user files.
  assert.ok(fs.existsSync(path.join(dir, 'server.js')));
  assert.ok(fs.existsSync(path.join(dir, 'config.js')));
});

test('--fix creates .bak backups and lists required env vars', () => {
  const dir = tmpDir();
  fs.cpSync(DEMO, dir, { recursive: true });
  const res = runCli(['audit', dir, '--fix']);
  assert.match(res.stdout, /\.bak/);
  assert.match(res.stdout, /environment variables/i);
  assert.ok(fs.existsSync(path.join(dir, 'config.js.bak')));
});

// ---------------------------------------------------------- CLI exit codes
test('CLI exit codes: 0 on clean code, non-zero when critical findings exist', () => {
  const clean = tmpDir();
  write(clean, 'app.js', 'function add(a, b) { return a + b; }\nmodule.exports = { add };\n');
  const ok = runCli(['audit', clean]);
  assert.equal(ok.status, 0, `clean audit should exit 0, got ${ok.status}: ${ok.stdout} ${ok.stderr}`);
  assert.match(ok.stdout, /Grade: A/);

  const bad = runCli(['audit', DEMO]);
  assert.equal(bad.status, 1, `demo audit should exit 1, got ${bad.status}`);
  assert.match(bad.stdout, /Grade: F/);
});

test('CLI: --format json prints parseable JSON with score and findings', () => {
  const res = runCli(['audit', DEMO, '--format', 'json']);
  const parsed = JSON.parse(res.stdout);
  assert.equal(typeof parsed.score, 'number');
  assert.equal(parsed.grade, 'F');
  assert.ok(Array.isArray(parsed.findings) && parsed.findings.length >= 15);
});

test('CLI: missing target exits 2', () => {
  const res = runCli(['audit', '/nonexistent-dir-xyz']);
  assert.equal(res.status, 2);
});

// ------------------------------------------------------------- SKILL.md
test('SKILL.md frontmatter is valid and references scripts that exist', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'vibe-rescue', 'SKILL.md'), 'utf8');
  assert.ok(skill.startsWith('---\n'), 'SKILL.md must start with YAML frontmatter');
  const end = skill.indexOf('\n---', 3);
  assert.ok(end > 0, 'SKILL.md frontmatter must close');
  const fm = skill.slice(4, end);
  assert.match(fm, /^name: vibe-rescue/m);
  assert.match(fm, /^description: .+/m);
  for (const script of ['bin/vibe-rescue.js', 'lib/audit.js', 'lib/report.js', 'lib/fix.js', 'lib/live.js', 'scripts/install.sh']) {
    assert.ok(skill.includes(script), `SKILL.md must reference ${script}`);
    const full = script.startsWith('bin/') || script.startsWith('lib/')
      ? path.join(ROOT, script)
      : path.join(ROOT, 'skills', 'vibe-rescue', script);
    assert.ok(fs.existsSync(full), `referenced script missing: ${script}`);
  }
});

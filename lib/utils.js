'use strict';

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  '.vibe-rescue-reports', 'reports',
]);
const SKIP_FILES = new Set(['package-lock.json']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (e.isFile()) {
      // Never audit our own output: report files would re-flag the
      // findings they quote, and .bak backups hold pre-fix code.
      if (e.name.startsWith('vibe-rescue-report.')) continue;
      if (e.name.endsWith('.bak')) continue;
      out.push(full);
    }
  }
  return out;
}

function readLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/);
  } catch {
    return [];
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function rel(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

// Parse a semver-ish string ("^4.17.20", "~1.2.5", "4.17.20") into [major, minor, patch].
// Returns null for ranges we cannot resolve to a single version (*, latest, >=x, URLs, file:, etc.).
function parseVersion(spec) {
  if (!spec || typeof spec !== 'string') return null;
  let s = spec.trim();
  if (s === '*' || s === 'latest' || s.startsWith('http') || s.startsWith('file:') || s.startsWith('git')) return null;
  if (/[<>=|& ]/.test(s) && !/^[\^~]/.test(s)) return null;
  s = s.replace(/^[\^~v= ]+/, '');
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function isVulnerableVersion(spec, fixedIn) {
  const v = parseVersion(spec);
  const fixed = parseVersion(fixedIn);
  if (!v || !fixed) return false;
  return compareVersions(v, fixed) < 0;
}

const SEVERITY_WEIGHT = { critical: 6, high: 3, medium: 2, low: 1 };
const SEVERITY_HOURS = { critical: 2, high: 1, medium: 0.5, low: 0.25 };

function gradeFromScore(score, findings = []) {
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  // A single Critical finding caps the grade at C, and a High finding
  // caps it at B — a codebase with a critical hole is never an "A",
  // however few findings it has in total.
  const order = { A: 0, B: 1, C: 2, D: 3, F: 4 };
  if (findings.some(f => f.severity === 'critical') && order[grade] < order.C) grade = 'C';
  else if (findings.some(f => f.severity === 'high') && order[grade] < order.B) grade = 'B';
  return grade;
}

function scoreFromFindings(findings) {
  let score = 100;
  for (const f of findings) score -= SEVERITY_WEIGHT[f.severity] || 0;
  if (score < 0) score = 0;
  return score;
}

module.exports = {
  walk, readLines, readText, rel, parseVersion, compareVersions,
  isVulnerableVersion, gradeFromScore, scoreFromFindings,
  SEVERITY_WEIGHT, SEVERITY_HOURS, SKIP_FILES,
};

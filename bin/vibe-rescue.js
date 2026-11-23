#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { runAudit } = require('../lib/audit');
const { toMarkdown, toTextSummary, badgeMarkdown } = require('../lib/report');
const { applyFix } = require('../lib/fix');
const { probeLive } = require('../lib/live');

const VERSION = '1.0.0';

function help() {
  return [
    'vibe-code-rescue — audit an AI-generated (vibe-coded) codebase',
    '',
    'Usage:',
    '  vibe-rescue audit <path> [--live <url>] [--fix] [--format json|md] [--output <file>] [--npm-audit]',
    '  vibe-rescue --help',
    '  vibe-rescue --version',
    '',
    'Options:',
    '  --live <url>     Also probe a running app (admin access, BOLA, rate limiting, webhook).',
    '  --fix            Apply only safe, reversible fixes (env-var placeholders,',
    '                   security headers, .gitignore entries). Backups are saved as .bak.',
    '  --format json|md Print the full report as JSON or Markdown instead of the summary.',
    '  --output <file>  Write the report (Markdown, or JSON with --format json) to <file>.',
    '  --npm-audit      Also run `npm audit` (non-fatal if npm/network is unavailable).',
    '',
    'Exit codes: 0 = no Critical findings, 1 = one or more Critical findings, 2 = usage error.',
    'The report is also written to vibe-rescue-report.md and vibe-rescue-report.json',
    'inside the audited directory, unless --output is given.',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { command: null, target: null, live: null, fix: false, format: null, output: null, npmAudit: false };
  const rest = [...argv];
  while (rest.length) {
    const a = rest.shift();
    if (a === 'audit') args.command = 'audit';
    else if (a === '--live') args.live = rest.shift() || null;
    else if (a === '--fix') args.fix = true;
    else if (a === '--format') args.format = rest.shift() || null;
    else if (a === '--output') args.output = rest.shift() || null;
    else if (a === '--npm-audit') args.npmAudit = true;
    else if (a === '--help' || a === '-h') args.command = 'help';
    else if (a === '--version' || a === '-v') args.command = 'version';
    else if (!a.startsWith('-') && !args.target) args.target = a;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`Error: ${e.message}\n\n${help()}`);
    process.exitCode = 2;
    return;
  }
  if (args.command === 'help' || (!args.command && !args.target)) {
    console.log(help());
    return;
  }
  if (args.command === 'version') {
    console.log(`vibe-code-rescue ${VERSION}`);
    return;
  }
  if (!args.target) {
    console.error(`Error: missing target directory.\n\n${help()}`);
    process.exitCode = 2;
    return;
  }
  if (args.format && !['json', 'md'].includes(args.format)) {
    console.error('Error: --format must be json or md.');
    process.exitCode = 2;
    return;
  }

  const target = path.resolve(args.target);

  if (args.fix) {
    const fixResult = applyFix(target);
    if (fixResult.changes.length === 0) {
      console.log('No safe fixes to apply.');
    } else {
      console.log('Applied fixes:');
      for (const c of fixResult.changes) console.log(`  - ${c.file}: ${c.action}`);
    }
    if (fixResult.requiredEnv.length) {
      console.log('');
      console.log('Set these environment variables (values were replaced with placeholders):');
      for (const name of fixResult.requiredEnv) console.log(`  ${name}=...`);
      console.log('Rotate any secret that was previously committed — changing the code does not un-leak it.');
    }
    console.log('');
  }

  let result;
  try {
    result = runAudit(target, { npmAudit: args.npmAudit });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exitCode = 2;
    return;
  }

  if (args.live) {
    const live = await probeLive(args.live);
    result.live = live;
    // Live failures are reported as findings so the grade reflects them.
    for (const p of live.probes) {
      if (p.result === 'FAIL') {
        result.findings.push({
          id: 'live-' + p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          rule: 'live-probe',
          title: `Live probe failed: ${p.name}`,
          severity: 'high',
          file: 'live-probe',
          line: 1,
          evidence: p.detail,
          fix: 'Fix the underlying issue (add login to the route, check ownership, add rate limiting, verify the webhook signature).',
          category: 'live',
        });
      }
    }
    // Recompute the grade, counts and fix estimate after adding live
    // findings, deterministically.
    const { scoreFromFindings, gradeFromScore, SEVERITY_HOURS } = require('../lib/utils');
    result.score = scoreFromFindings(result.findings);
    result.grade = gradeFromScore(result.score, result.findings);
    const liveFixHours = result.findings.reduce((s, f) => s + (SEVERITY_HOURS[f.severity] || 0), 0);
    result.fixEstimate = liveFixHours % 1 === 0 ? `${liveFixHours}h` : `${liveFixHours.toFixed(1)}h`;
    result.counts.total = result.findings.length;
    result.counts.critical = result.findings.filter(f => f.severity === 'critical').length;
    result.counts.high = result.findings.filter(f => f.severity === 'high').length;
    result.counts.medium = result.findings.filter(f => f.severity === 'medium').length;
    result.counts.low = result.findings.filter(f => f.severity === 'low').length;
  }

  const md = toMarkdown(result);
  const json = JSON.stringify(result, null, 2);

  if (args.format === 'json') {
    console.log(json);
  } else if (args.format === 'md') {
    console.log(md);
  } else {
    console.log(toTextSummary(result));
    console.log('');
    console.log('Badge:');
    console.log(badgeMarkdown(result));
  }

  // Always write the report files (unless --output overrides the location).
  try {
    if (args.output) {
      fs.writeFileSync(args.output, args.format === 'json' ? json : md, 'utf8');
      console.log(`\nReport written to ${args.output}`);
    } else {
      fs.writeFileSync(path.join(target, 'vibe-rescue-report.md'), md, 'utf8');
      fs.writeFileSync(path.join(target, 'vibe-rescue-report.json'), json, 'utf8');
      if (!args.format) {
        const relReport = path.relative(process.cwd(), path.join(target, 'vibe-rescue-report.md')) || 'vibe-rescue-report.md';
        console.log(`\nFull report written to ${relReport} and vibe-rescue-report.json`);
      }
    }
  } catch (e) {
    console.error(`Warning: could not write report files: ${e.message}`);
  }

  process.exitCode = result.counts.critical > 0 ? 1 : 0;
}

main().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exitCode = 2;
});

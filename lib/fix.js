'use strict';

const fs = require('fs');
const path = require('path');
const { walk, readText, rel } = require('./utils');

// Safe, reversible fixes only:
//  - replace hardcoded secret values with process.env placeholders
//    (a .bak backup is written next to each changed file first)
//  - add security headers to a plain Node http server
//  - add .env / report entries to .gitignore
// NEVER deletes user files. Prints exactly what it changed.
const SECRET_ASSIGN = /((?:password|passwd|pwd|jwt[_-]?secret|JWT_SECRET|api[_-]?key|API_KEY|session[_-]?secret|SESSION_SECRET|secret)\s*[:=]\s*)['"][^'"]+['"]/gi;
const CONST_SECRET = /((?:const|let|var)\s+(?:[A-Z_]*?(?:SECRET|PASSWORD|API_KEY|TOKEN)[A-Z_]*)\s*=\s*)['"][^'"]+['"]/g;
const ENV_ASSIGN = /^([A-Z_]+)\s*=\s*.+$/;

function envNameFor(key) {
  const clean = key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .toUpperCase();
  if (/PASSWORD/.test(clean)) return clean.includes('DB') || clean.includes('DATABASE') ? 'DB_PASSWORD' : clean;
  return clean;
}

function applyFix(root) {
  const changes = [];
  const requiredEnv = [];
  const files = walk(root).sort();

  for (const file of files) {
    const base = path.basename(file);
    if (base.endsWith('.bak')) continue;
    if (base === 'package.json' || base === 'package-lock.json') continue;
    if (!/\.(js|ts|jsx|tsx)$/.test(file) && base !== '.env') continue;
    const original = readText(file);
    let text = original;
    if (base === '.env') {
      const lines = text.split(/\r?\n/);
      const out = lines.map(line => {
        const m = line.match(ENV_ASSIGN);
        if (!m) return line;
        const name = m[1];
        if (/SECRET|PASSWORD|KEY|TOKEN/.test(name)) {
          requiredEnv.push(name);
          return `${name}=CHANGE_ME`;
        }
        return line;
      });
      text = out.join('\n');
    } else {
      text = text.replace(SECRET_ASSIGN, (match, prefix) => {
        const key = prefix.replace(/[:=\s]+$/, '').replace(/['"]/g, '');
        const env = envNameFor(key);
        if (!requiredEnv.includes(env)) requiredEnv.push(env);
        return `${prefix}process.env.${env}`;
      });
      text = text.replace(CONST_SECRET, (match, prefix) => {
        const m = prefix.match(/(?:const|let|var)\s+([A-Z_]+)/);
        const env = m ? m[1] : 'SECRET';
        if (!requiredEnv.includes(env)) requiredEnv.push(env);
        return `${prefix}process.env.${env}`;
      });
    }
    if (text !== original) {
      fs.writeFileSync(`${file}.bak`, original, 'utf8');
      fs.writeFileSync(file, text, 'utf8');
      changes.push({ file: rel(root, file), action: 'replaced hardcoded secret value(s) with process.env placeholder(s); backup saved as .bak' });
    }
  }

  // Security headers for a plain Node http server.
  for (const file of files) {
    if (!file.endsWith('server.js')) continue;
    const text = readText(file);
    if (/X-Content-Type-Options/.test(text)) continue;
    if (!/createServer/.test(text)) continue;
    const headerBlock = [
      "  res.setHeader('X-Content-Type-Options', 'nosniff');",
      "  res.setHeader('X-Frame-Options', 'DENY');",
      "  res.setHeader('Referrer-Policy', 'no-referrer');",
      "  res.setHeader('Content-Security-Policy', \"default-src 'self'\");",
    ].join('\n');
    const idx = text.indexOf('createServer');
    const brace = text.indexOf('{', idx);
    if (brace === -1) continue;
    const after = text.slice(0, brace + 1) + '\n' + headerBlock + text.slice(brace + 1);
    fs.writeFileSync(`${file}.bak`, text, 'utf8');
    fs.writeFileSync(file, after, 'utf8');
    changes.push({ file: rel(root, file), action: 'added security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Content-Security-Policy); backup saved as .bak' });
  }

  // .gitignore entries.
  const giPath = path.join(root, '.gitignore');
  const existing = fs.existsSync(giPath) ? readText(giPath) : '';
  const needed = ['.env', '*.bak', 'vibe-rescue-report.md', 'vibe-rescue-report.json'];
  const missing = needed.filter(e => !existing.split(/\r?\n/).map(s => s.trim()).includes(e));
  if (missing.length) {
    const suffix = (existing && !existing.endsWith('\n') ? '\n' : '') + missing.join('\n') + '\n';
    fs.writeFileSync(giPath, existing + suffix, 'utf8');
    changes.push({ file: '.gitignore', action: `added entries: ${missing.join(', ')}` });
  }

  return { changes, requiredEnv: [...new Set(requiredEnv)].sort() };
}

module.exports = { applyFix };

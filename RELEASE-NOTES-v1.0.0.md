# vibe-code-rescue v1.0.0 — draft release notes

First public release.

## What it is

An installable agent skill + runnable CLI that audits AI-generated
("vibe-coded") codebases and produces a plain-language client report
with a grade (A–F).

## What's in it

- **CLI** (`bin/vibe-rescue.js`): `audit <path>`, `--live <url>`,
  `--fix`, `--format json|md`. Node 18+, zero runtime dependencies,
  deterministic and offline.
- **Checks**: secrets (AWS keys, GitHub tokens, private keys,
  hardcoded passwords/JWT secrets/API keys, committed `.env`),
  dependencies (built-in advisory list, typosquat names, optional
  `npm audit`), auth/config (admin routes without auth, JWT decoded
  without verification, CORS `*`, missing rate limiting, debug
  endpoints), data/RLS (Supabase without RLS policies, BOLA-prone
  `/:id` endpoints, Stripe webhooks without signature verification,
  SQL built by string concatenation), and a Spring Boot profile
  (secrets in `application.properties`, `permitAll()` on sensitive
  paths, concatenated queries, CSRF disabled, pool defaults).
- **Report**: plain-language Markdown + JSON, with severity,
  `file:line` evidence, a fix estimate, a deterministic grade, and a
  badge snippet.
- **`--fix`**: safe, reversible fixes only — env-var placeholders
  (with `.bak` backups), security headers, `.gitignore` entries.
  Never deletes user files.
- **`--live`**: probes a running app for unauthenticated admin/debug
  access, BOLA, rate limiting, and unsigned webhooks.
- **Skill**: `skills/vibe-rescue/SKILL.md` installs into Claude Code,
  Codex, OpenCode, or Cursor.
- **Demos**: a deliberately vulnerable Node demo app (no install
  needed) and a Spring Boot sample (audited from source, no build).

## Try it

```bash
git clone https://github.com/vietdat/vibe-code-rescue.git
cd vibe-code-rescue
node bin/vibe-rescue.js audit demo/vulnerable-app
```

## Notes

- The demo apps are intentionally vulnerable and must never be
  deployed. All secrets in them are fake placeholders.
- A good grade does not prove an app is secure — these are static
  checks and live probes, not a penetration test. See `docs/` for
  what each check looks for and where it can false-positive.

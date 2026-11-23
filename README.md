# vibe-code-rescue

Audit AI-generated (vibe-coded) code before you launch it: a Claude Code skill + Node.js CLI that finds leaked secrets, broken access control, BOLA, SQL injection and vulnerable dependencies, and writes a plain-language report with a grade.

## The problem: AI-built apps ship the same security mistakes

Vibe coding — building an app by asking an AI coding assistant such as Claude Code, Cursor, Lovable or Bolt to write the code — is fast. But an AI-built app can leak secrets, let anyone open other users' data, or ship fake packages. Typical vibe-coded apps commit API keys and passwords, leave the admin page open without a login, let one user read another user's orders (BOLA), build database queries by joining text together (SQL injection), skip Row Level Security (RLS) on Supabase tables, accept Stripe webhooks without checking the signature, and install vulnerable or typosquat dependencies. This installable agent skill and static-analysis CLI is a code audit and security audit for that exact problem, with secrets scanning built in: point it at the code, get a plain-language report with a grade, and fix what matters before real users and real data are involved. It also audits Spring Boot apps — secrets in `application.properties`, `permitAll()` on sensitive paths, concatenated queries — and probes a running app live.

## Who is this for

- **You built an app with AI and want to launch it.** You used Claude Code, Cursor, Lovable, Bolt or a similar tool, the app works, and now you want to know whether it is safe to put real users on it.
- **You were handed a vibe-coded app to fix.** A client or a founder gives you an AI-generated codebase and asks "what is wrong with this?" — run the audit, hand them the plain-language report.
- **You review AI-generated code.** Freelancers, auditors and developers who rescue vibe-coded apps: the CLI gives you a deterministic grade and `file:line` evidence for every finding.
- **You build with Spring Boot or Supabase.** The Spring Boot profile and the Supabase / RLS checks cover the stacks vibe coding produces most.

## Quick start: audit your vibe-coded app in 30 seconds

No install needed — Node 18+ only, zero runtime dependencies.

```bash
git clone https://github.com/vietdat/vibe-code-rescue.git
cd vibe-code-rescue
node bin/vibe-rescue.js audit demo/vulnerable-app
```

Real output from that command (run on the bundled demo app):

```
vibe-code-rescue — demo/vulnerable-app
Grade: F (17/100) — 19 findings (9 critical, 9 high, 1 medium, 0 low)
Estimated fix time: 27.5h

[CRITICAL] .env:1 — Committed .env file
[CRITICAL] auth.js:11 — JWT decoded without verification (token payload base64-decoded by hand)
[HIGH] auth.js:24 — High-entropy secret-like string
[CRITICAL] config.js:5 — Hardcoded JWT secret
[CRITICAL] config.js:6 — Hardcoded API key
[HIGH] config.js:7 — Hardcoded session secret
[CRITICAL] config.js:8 — Hardcoded password
[CRITICAL] db.js:5 — SQL query built by string concatenation (SQL injection risk)
[CRITICAL] db.js:11 — SQL query built by string concatenation (SQL injection risk)
[HIGH] package.json:1 — Suspicious package name: lodahs (looks like lodash)
[HIGH] package.json:1 — Vulnerable dependency: lodash 4.17.20 (CVE-2020-8203)
[HIGH] package.json:1 — Vulnerable dependency: minimist 1.2.5 (CVE-2021-44906)
[MEDIUM] server.js:16 — No rate limiting on the server
[HIGH] server.js:17 — CORS allows any origin (*)
[CRITICAL] server.js:27 — Admin route has no authentication
[HIGH] server.js:34 — Debug endpoint exposed
[HIGH] server.js:40 — BOLA-prone endpoint: resource by ID with no ownership check
[HIGH] server.js:69 — Supabase queries used with no Row Level Security policy file
[CRITICAL] server.js:76 — Stripe webhook handler without signature verification

Badge:
![vibe-rescue grade F (17/100)](https://img.shields.io/badge/vibe--rescue-F%2017%2F100-red)

Full report written to demo/vulnerable-app/vibe-rescue-report.md and vibe-rescue-report.json
```

The audit also writes a plain-language report (`vibe-rescue-report.md`)
and a JSON report (`vibe-rescue-report.json`) into the audited folder.
Exit code is `0` when there are no Critical findings, `1` when there
are, and `2` for a usage error.

## Install the Claude Code skill (also Codex, OpenCode, Cursor)

The skill (`skills/vibe-rescue/SKILL.md`) tells your coding agent to
run the CLI, interpret its JSON report, and apply fixes. It works from
a local clone — the skill runs the CLI at `<clone>/bin/vibe-rescue.js`,
so keep the clone where the agent can reach it.

```bash
# Claude Code (default)
bash skills/vibe-rescue/scripts/install.sh claude-code
# Codex, OpenCode, or Cursor
bash skills/vibe-rescue/scripts/install.sh codex
bash skills/vibe-rescue/scripts/install.sh opencode
bash skills/vibe-rescue/scripts/install.sh cursor
```

Or install by hand: copy the `skills/vibe-rescue/` folder into your
agent's skills folder:

| Agent | Skills folder |
| --- | --- |
| Claude Code | `~/.claude/skills/vibe-rescue` |
| Codex | `~/.codex/skills/vibe-rescue` |
| OpenCode | `~/.config/opencode/skills/vibe-rescue` |
| Cursor | `~/.cursor/skills/vibe-rescue` |

## What the security audit checks: secrets, auth, BOLA, SQL injection, Spring Boot

| Family | What it looks for |
| --- | --- |
| Secrets | AWS keys, GitHub tokens, private keys, hardcoded passwords / JWT secrets / API keys / session secrets, committed `.env` files |
| Dependencies | Known-vulnerable versions from a small built-in advisory list (e.g. lodash < 4.17.21, CVE-2020-8203), typosquat package names, optional `npm audit` passthrough (`--npm-audit`) |
| Auth / config | Admin routes without auth, JWT decoded without verification, hardcoded session secrets, CORS `*`, missing rate limiting, debug endpoints |
| Data / RLS | Supabase queries with no Row Level Security policy file, BOLA-prone `/:id` endpoints, Stripe webhooks without signature verification, SQL built by string concatenation |
| Spring Boot | Secrets in `application.properties` / `.yml`, `permitAll()` on sensitive paths, concatenated JPA/JDBC queries, CSRF disabled, connection-pool defaults |
| Live probes (`--live` only) | Unauthenticated `/admin` and `/debug`, BOLA (fetch user A's order as user B), rate limiting (30 rapid requests), unsigned Stripe webhook |

See `docs/` for what each check looks for and where its heuristics can
false-positive. A good grade does not prove an app is secure — these
are static checks and live probes, not a penetration test.

## How the grade works: score, A–F grade, fix estimate

The score starts at 100. Critical findings subtract 6, High 3, Medium 2,
Low 1. Grades: A (90+), B (80+), C (70+), D (60+), F (below 60). Any
Critical finding caps the grade at C, and any High finding caps it at B.
The same code always gets the same score — the checks are deterministic
and run offline. See `docs/grading.md`.

## Try it on the demo app: a deliberately vulnerable app

`demo/vulnerable-app/` is a deliberately vulnerable demo shop, built so
the CLI has something real to catch. It runs with zero install (Node
built-ins only):

```bash
node demo/vulnerable-app/server.js
# listening on http://localhost:3000
```

It must never be deployed and never be given real secrets — every
secret in it is a fake placeholder. It exhibits 19 flaws, including a
hardcoded JWT secret and API key, a committed `.env`, an unauthenticated
`/admin` route, a BOLA endpoint (`/api/orders/:id`), SQL built by string
concatenation, CORS `*`, no rate limiting, vulnerable dependencies
(lodash 4.17.20, minimist 1.2.5), a typosquat package (`lodahs`), a
debug endpoint, and a Stripe-style webhook with no signature verification.

`demo/spring-boot-sample/` is a minimal Maven project with Spring Boot
flaws (hardcoded secrets in `application.properties`, `permitAll()` on
`/admin/**`, CSRF disabled, a concatenated query). It is audited from
source only — no build required:

```bash
node bin/vibe-rescue.js audit demo/spring-boot-sample
# Grade: D (60/100) — 8 findings (6 critical, 1 high, 0 medium, 1 low)
```

## Fix it with --fix: safe, reversible fixes

```bash
node bin/vibe-rescue.js audit demo/vulnerable-app --fix
```

`--fix` only does three things, and it prints exactly what it changed:

1. Replaces hardcoded secret values with `process.env.*` placeholders
   (a `.bak` backup is saved next to each changed file).
2. Adds security headers to a plain Node `http` server.
3. Adds `.env`, `*.bak`, and report files to `.gitignore`.

It never deletes user files. Run it on a copy of the demo and re-audit
to see the improvement — verified here: the demo goes from
**F (17/100), 19 findings** to **F (47/100), 13 findings** after
`--fix`. The remaining findings (unauthenticated admin route, SQL
injection, BOLA, unsigned webhook, vulnerable dependencies) need hand
fixes — the skill's `SKILL.md` lists how to fix each one.

Rotating a leaked secret is a human job: replacing the code does not
un-leak a key that was already committed.

## Test a running app with --live: BOLA, admin access, rate limiting

```bash
node demo/vulnerable-app/server.js &
node bin/vibe-rescue.js audit demo/vulnerable-app --live http://localhost:3000
```

Against the demo, all five live probes fail (unauthenticated `/admin`
and `/debug`, BOLA, no rate limiting, unsigned webhook), and the grade
drops from F (17/100) to F (2/100). Only probe apps you own or have
permission to test, and prefer staging over production. See
`docs/live-probes.md` for the probe details and limits.

Other useful forms:

```bash
node bin/vibe-rescue.js audit <path> --format json   # full JSON report on stdout
node bin/vibe-rescue.js audit <path> --format md     # full Markdown report on stdout
node bin/vibe-rescue.js audit <path> --npm-audit     # also run `npm audit` (non-fatal if unavailable)
node bin/vibe-rescue.js --help
```

## How it compares: vibe-preflight and vibe-coding-security

- **vs vibe-preflight** (globalmpc/vibe-preflight): also a Claude Code
  skill with a plain-language report, covering security, dependencies,
  runaway costs, unfinished code, and Docker/hosting readiness. Its
  README describes a static pre-launch check — reading the project and
  writing a report — and does not describe live endpoint probes.
  vibe-code-rescue adds a runnable CLI (no agent needed), `--live`
  probes against a running app, `--fix`, and a dedicated Spring Boot
  profile.
- **vs vibe-coding-security** (boxed-dev/vibe-coding-security): a
  69-point pre-launch security checklist. In its own words: "Not a
  SaaS. Not a scanner. A flat list you run through before you push to
  prod." vibe-code-rescue is the runnable counterpart: it runs the
  checks itself, gives a grade, and can apply safe fixes.

## More from the same author

- [ai-photo-to-film-kit](https://github.com/vietdat/ai-photo-to-film-kit) — sibling repo: an AI photo-to-film prompt + storyboard kit for turning still photos into a cinematic film. Publishing alongside this repo.
- [wedding-invitation-starter](https://github.com/vietdat/wedding-invitation-starter) — a free, open-source Next.js template for online wedding invitations.
- [damcuoionline](https://github.com/vietdat/damcuoionline) — a virtual Vietnamese wedding in 3D, in the browser: dress up, pick a table, cheers, and send lucky money via VietQR.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm test` before sending
a change — all tests must pass. New checks need a test (true positive
and a clean case) and a note in `docs/`. Never commit a real secret;
use obviously fake placeholders such as `AKIAIOSFODNN7EXAMPLE`.

## License

MIT — see [LICENSE](LICENSE).

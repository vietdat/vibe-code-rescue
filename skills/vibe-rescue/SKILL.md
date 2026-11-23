---
name: vibe-rescue
description: Audit an AI-generated (vibe-coded) codebase for security flaws and produce a plain-language client report with a grade. Use when the user asks to review, audit, rescue, or fix a vibe-coded app, check a codebase for secrets, auth gaps, BOLA, SQL injection, or vulnerable dependencies, or asks "is this app safe to launch?". Run the bundled CLI, interpret its JSON report, and apply fixes.
---

# Vibe Rescue

Audit an AI-generated ("vibe-coded") codebase and produce a plain-language
client report with a grade (A–F). The skill is a wrapper around the
`vibe-rescue` CLI in this repo (`bin/vibe-rescue.js`, `lib/`). The CLI does
the deterministic checks; you interpret the results and apply fixes.

## When to use this skill

- The user asks you to review, audit, or "rescue" a vibe-coded app.
- The user asks whether an app is safe to launch, or what is wrong with it.
- The user asks to fix the findings from a previous audit.
- The user gives you a codebase (a folder, a repo, a zip) with no tests,
  no auth, or obvious AI-generated code.

## How to run an audit

1. Find the project folder. If the user has not given one, ask.
2. Run the CLI from the repo root (Node 18+, no install needed, no
   runtime dependencies):

```bash
node bin/vibe-rescue.js audit <path-to-project>
```

3. For the full machine-readable report:

```bash
node bin/vibe-rescue.js audit <path-to-project> --format json
```

The CLI also writes `vibe-rescue-report.md` and `vibe-rescue-report.json`
into the audited folder. Read those files — do not re-derive the grade
yourself.

4. If the app is running, probe it live (admin access, BOLA, rate
   limiting, unsigned webhook):

```bash
node bin/vibe-rescue.js audit <path-to-project> --live http://localhost:3000
```

## Interpreting the report

- **Grade A (90+)**: safe to proceed; mention the remaining Low items.
- **Grade B (80+)**: decent; fix the High items before launch.
- **Grade C (70+)**: real gaps; fix Critical and High items before launch.
- **Grade D (60+)**: serious gaps; do not launch with real user data.
- **Grade F (below 60)**: not safe to launch as it is.

The score starts at 100. Critical findings subtract 6, High 3, Medium 2,
Low 1. The same code always gets the same score.

Grades: **A** (90+), **B** (80+), **C** (70+), **D** (60+), **F** (below 60).
Any Critical finding caps the grade at C, and any High finding caps it at B.

- Every finding has `file:line` evidence. Quote that evidence when you
  explain an issue — never describe a finding without its location.
- The report is written in plain language for a non-technical client.
  When you talk to the client, use the report's wording, not jargon.
- The `fixEstimate` is a rough total (Critical ~2h, High ~1h,
  Medium ~30min, Low ~15min). Say it is an estimate, not a quote.

## Applying fixes

Only apply fixes the user approves. Safe, reversible fixes can be applied
with:

```bash
node bin/vibe-rescue.js audit <path-to-project> --fix
```

`--fix` only does three things, and it prints exactly what it changed:

1. Replaces hardcoded secret values with `process.env.*` placeholders
   (a `.bak` backup is saved next to each changed file).
2. Adds security headers to a plain Node `http` server.
3. Adds `.env`, `*.bak`, and report files to `.gitignore`.

It never deletes user files. After `--fix`, re-run the audit and show
the before/after grade — the score must improve. If it does not, say so
and investigate instead of claiming it worked.

Fixes `--fix` does **not** do (do them by hand, one at a time):

- Add authentication to an admin route — add a login check and an
  admin-role check before the handler.
- Fix a BOLA endpoint — check that the logged-in user owns the resource
  before returning it.
- Fix SQL injection — use parameterised queries / prepared statements.
- Verify a Stripe webhook — use `stripe.webhooks.constructEvent()`
  with the endpoint secret.
- Fix a vulnerable dependency — upgrade to the fixed version named in
  the finding and re-run the audit.
- Add rate limiting — add a per-IP limit on login and API routes.
- Add Supabase RLS — enable Row Level Security and add `CREATE POLICY`
  rules so users can only read their own rows.
- Fix Spring Boot issues — move secrets to environment variables,
  remove `permitAll()` from sensitive paths, re-enable CSRF, and use
  parameterised queries.

After any hand fix, re-run the audit to confirm the finding is gone.

## What the CLI checks

| Family | What it looks for |
| --- | --- |
| Secrets | AWS keys, GitHub tokens, private keys, hardcoded passwords / JWT secrets / API keys / session secrets, committed `.env` files |
| Dependencies | Known-vulnerable versions from a small built-in advisory list (e.g. lodash < 4.17.21, CVE-2020-8203), typosquat package names, optional `npm audit` passthrough |
| Auth / config | Admin routes without auth, JWT decoded without verification, hardcoded session secrets, CORS `*`, missing rate limiting, debug endpoints |
| Data / RLS | Supabase queries with no RLS policy file, BOLA-prone `/:id` endpoints, Stripe webhooks without signature verification, SQL built by string concatenation |
| Spring Boot | Secrets in `application.properties` / `.yml`, `permitAll()` on sensitive paths, concatenated JPA/JDBC queries, CSRF disabled, connection-pool defaults |
| Live probes (`--live` only) | Unauthenticated `/admin` and `/debug`, BOLA (fetch user A's order as user B), rate limiting (30 rapid requests), unsigned Stripe webhook |

See `docs/` in this repo for what each check looks for and where its
heuristics can false-positive. A good grade does not prove an app is
secure — these are static checks and live probes, not a penetration test.

## Limits — say these out loud

- The CLI is deterministic and offline; it cannot find logic bugs, only
  the patterns listed above.
- Heuristics can false-positive (for example, a route that is protected
  by middleware the CLI cannot see). Check the evidence before claiming
  a finding is real.
- Rotating a leaked secret is a human job: replacing code does not
  un-leak a key that was already committed. Tell the user to rotate it.

## Scripts in this repo

- `bin/vibe-rescue.js` — CLI entry point (`audit`, `--live`, `--fix`, `--format`).
- `lib/audit.js` — the deterministic checks.
- `lib/report.js` — plain-language report and grade.
- `lib/fix.js` — safe, reversible fixes.
- `lib/live.js` — live probes against a running app.
- `scripts/install.sh` — install this skill into an agent's skills folder.

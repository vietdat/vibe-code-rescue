# Secrets checks

## What it looks for

- AWS access keys (`AKIA…`, 20 characters)
- GitHub tokens (`ghp_…`, `github_pat_…`, `gho_…`)
- Private keys (`-----BEGIN … PRIVATE KEY-----`)
- Hardcoded JWT secrets, passwords, API keys and session secrets — a
  named key assigned a quoted literal value, for example
  `password: "hunter2"` or `JWT_SECRET = 'abc123'`
- High-entropy secret-like strings (a `secret` / `token` / `api-key`
  assignment with a 24+ character value)
- A committed `.env` file (a file literally named `.env`, or
  `.env.<name>`, that is not listed in `.gitignore`)

## Limits and false positives

- The check is pattern-based. It cannot tell a real secret from a
  convincingly fake one, so every finding needs a human to confirm it
  is real before rotating anything.
- Obviously fake placeholders are skipped: values containing
  `EXAMPLE`, `PLACEHOLDER`, `CHANGE_ME`, or `your-…-here`, and the
  documented AWS example key `AKIAIOSFODNN7EXAMPLE`.
- Values read from the environment (`process.env.JWT_SECRET`) are
  never flagged — that is the correct pattern.
- A `.env` file that is listed in `.gitignore` is treated as a local
  file, not a committed secret, and is not flagged.
- A secret that was already committed stays leaked even after the code
  is fixed. Rotate it: fixing the code does not un-leak it.

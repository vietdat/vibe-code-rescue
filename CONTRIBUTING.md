# Contributing

Thanks for helping improve vibe-code-rescue. Keep it simple: this repo
is intentionally small, dependency-free, and deterministic.

## How to contribute

1. Fork the repo and create a branch for your change.
2. Run `npm test` before and after your change. All tests must pass.
3. If you add a check, add a test for it (true positive and a clean
   case with no false positive), and document it in `docs/`.
4. If you add a dependency advisory, only include advisories you can
   verify: a real CVE id and a correct fixed version. Do not add
   entries from memory without checking.
5. Keep user-facing text in English. Keep the CLI working on Node 18+
   with zero runtime dependencies (Node built-ins only).
6. Never commit a real secret, API key, or credential — in code,
   fixtures, or git history. Use obviously fake placeholders such as
   `AKIAIOSFODNN7EXAMPLE`.

## Reporting a false positive

Open an issue with the finding, the `file:line` evidence, and a
minimal code sample that triggers it (with any real secrets removed).
That is the fastest way to get a heuristic fixed.

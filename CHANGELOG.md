# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-11-22

### Added

- Initial release.
- `vibe-rescue` CLI (`bin/vibe-rescue.js`, `lib/`): deterministic,
  offline audit with zero runtime dependencies (Node 18+).
- Checks for secrets, dependencies (built-in advisory list),
  auth/config, data/Row Level Security, and Spring Boot.
- Plain-language report (`vibe-rescue-report.md` / `.json`) with a
  deterministic grade (A–F) and numeric score, severity, `file:line`
  evidence, fix estimate, and badge markdown.
- `--fix`: safe, reversible fixes only (env-var placeholders with
  `.bak` backups, security headers, `.gitignore` entries).
- `--live`: probes a running app for unauthenticated admin/debug
  access, BOLA, rate limiting, and unsigned Stripe webhooks.
- Installable agent skill (`skills/vibe-rescue/SKILL.md`) for Claude
  Code, Codex, OpenCode, and Cursor, with `scripts/install.sh`.
- Deliberately vulnerable demo app (`demo/vulnerable-app/`, Node
  built-ins only, no install needed) and Spring Boot sample
  (`demo/spring-boot-sample/`, static audit only, no build needed).
- Tests (`node:test`), docs per check family, and GitHub Actions CI.

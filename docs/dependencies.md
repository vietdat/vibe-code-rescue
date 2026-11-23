# Dependency checks

## What it looks for

- Known-vulnerable versions from a small built-in advisory list. Only
  advisories we are sure about are included, each with a correct CVE
  id and fixed version:
  - `lodash` < 4.17.21 — prototype pollution, CVE-2020-8203
  - `minimist` < 1.2.6 — prototype pollution, CVE-2021-44906
  - `qs` < 6.10.3 — prototype pollution, CVE-2022-24999
  - `json5` < 2.2.2 — prototype pollution, CVE-2022-46175
  - `semver` < 7.5.2 — ReDoS, CVE-2022-25883
- Both `package.json` (declared range) and `package-lock.json`
  (locked version) are checked.
- Typosquat names: a small list of suspicious spellings that closely
  resemble popular packages (for example `lodahs` for `lodash`,
  `expres` for `express`, `axois` for `axios`).
- Optional `npm audit` passthrough (`--npm-audit`): runs `npm audit
  --json` and reports its counts. It is non-fatal if npm or the
  network is unavailable.

## Limits and false positives

- The built-in list is deliberately small. It does **not** replace
  `npm audit` or a vulnerability database — a package can be
  vulnerable without being on this list. Use `--npm-audit` for wider
  coverage when the network is available.
- Version ranges that cannot be resolved to a single version (`*`,
  `latest`, `>=x`, URLs, `file:`) are skipped rather than guessed.
- A typosquat flag is a suspicion, not proof: a similarly named
  package can be legitimate. Check the package page before removing it.

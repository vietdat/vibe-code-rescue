# Grading

## How the grade works

The score starts at 100. Critical findings subtract 6, High 3, Medium 2,
Low 1. Grades: A (90+), B (80+), C (70+), D (60+), F (below 60). Any
Critical finding caps the grade at C, and any High finding caps it at B.

The cap amplifies a single false positive: a middleware-protected admin
route that the checker flags as Critical can turn a 92-point codebase
into grade C. Check the `file:line` evidence before trusting the grade.

The `fixEstimate` in the report is the sum of the rough fix times
(Critical ~2h, High ~1h, Medium ~30min, Low ~15min each).
It is an estimate, not a quote.

## Determinism

The same code always gets the same score: findings are sorted by
file, line, then rule, and de-duplicated. The audit runs offline
(except `--live` probes and the optional `--npm-audit` passthrough),
so the result does not depend on the network, the time of day, or
any model.

## What a grade does and does not mean

- A good grade means "none of the checked patterns were found". It
  does not prove the app is secure — these are static checks and
  live probes, not a penetration test.
- A bad grade means "fix these concrete issues first". Every finding
  has `file:line` evidence and a fix, so the grade is a starting
  point for work, not a verdict on the developer.

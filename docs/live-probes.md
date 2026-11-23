# Live probes (`--live`)

## What it does

Against a running app (`--live http://localhost:3000`), the CLI
probes five things with the global `fetch`:

1. **Unauthenticated `/admin`** — `GET /admin` with no login.
   A `200` is a failure; a `401`/`403`/redirect is a pass.
2. **Unauthenticated `/debug`** — same idea for `/debug`.
3. **BOLA** — `GET /api/orders/1` with header `x-user-id: user-b`.
   If the returned order belongs to someone else (`user-a`), the
   endpoint lets one user read another user's data.
4. **Rate limiting** — 30 rapid requests to `/api/orders/1`.
   If none returns `429`, no rate limiting was observed.
5. **Stripe webhook** — `POST /webhook/stripe` with a fake payload
   and no Stripe signature. A `200` means the webhook accepts
   unsigned payloads.

Live failures are added to the report as `high` findings and lower
the grade.

## Limits and false positives

- The probes assume conventional paths (`/admin`, `/debug`,
  `/api/orders/1`, `/webhook/stripe`). An app that uses different
  paths will get "could not reach" errors, not false passes — read
  the probe detail, not just the headline.
- The BOLA probe uses the `x-user-id` header, which only the demo
  app understands. A real app that authenticates with cookies or
  bearer tokens needs a probe adapted to its auth scheme — the demo
  probe is a starting point, not a universal test.
- Thirty rapid requests can look like an attack to a WAF. Only probe
  apps you own or have permission to test, and prefer a staging
  environment over production.
- A `200` on `/admin` does not always mean "open": some apps return
  `200` with a login page. The probe reports the status; a human
  should confirm what the page actually shows.

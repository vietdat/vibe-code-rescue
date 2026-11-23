# Vulnerable demo app — DEMO ONLY

This is a **deliberately vulnerable** demo shop, built so `vibe-rescue`
has something real to catch. It is intentionally insecure and must
**never be deployed, never connected to real data, and never given real
secrets**. Every secret in it is a fake placeholder (for example
`demo-jwt-secret-do-not-use-in-production`).

## Run it (no install needed)

```bash
node server.js
# listening on http://localhost:3000
```

It uses only Node built-ins (`http`), so there is nothing to install.
The `package.json` lists vulnerable dependencies on purpose — the server
does not load them, they exist so the dependency audit has something to flag.

## Audit it

```bash
node ../../bin/vibe-rescue.js audit .
node ../../bin/vibe-rescue.js audit . --live http://localhost:3000
```

## Flaws it exhibits (the audit should find 15+)

- Hardcoded JWT secret, API key, session secret and database password (`config.js`, `.env`)
- Committed `.env` file
- Unauthenticated `/admin` route
- BOLA endpoint: `/api/orders/:id` returns any user's order with no ownership check
- SQL built by string concatenation (`db.js`)
- CORS allows any origin (`*`)
- No rate limiting
- Vulnerable dependencies: lodash 4.17.20 (CVE-2020-8203), minimist 1.2.5 (CVE-2021-44906)
- Typosquat package: `lodahs` (looks like `lodash`)
- Debug endpoint `/debug` that leaks the JWT secret
- Stripe-style webhook `/webhook/stripe` with no signature verification
- JWT decoded without verification (`auth.js`)
- Supabase-style queries with no Row Level Security policy file

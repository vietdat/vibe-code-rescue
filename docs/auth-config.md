# Auth and config checks

## What it looks for

- Admin routes with no authentication: an Express route for
  `/admin…` whose handler line has no `requireAuth` / `isAdmin` /
  `verifyToken` / `auth`, or a raw Node `http` handler for `/admin`
  in a file with no auth helper at all.
- JWT decoded without verification: `jwt.decode(…)` (trusts any
  token), or a file that uses `jsonwebtoken` but never calls
  `jwt.verify(…)`.
- Hardcoded session secret: a `secret: '…'` value in a file that
  configures a session.
- CORS wildcard: `Access-Control-Allow-Origin: *`, `origin: '*'`,
  or a bare `cors()` call.
- Missing rate limiting: a server entry point (`http.createServer`
  or `express()`) with no rate-limit / throttle reference anywhere
  in that file.
- Debug endpoints: a route for `/debug`, `/__debug__`, or
  `/test-debug`.
- CSRF disabled (Spring): `.csrf().disable()` or
  `csrf(AbstractHttpConfigurer::disable)`.

## Limits and false positives

- The admin-route check looks at the route line itself. If auth is
  applied as middleware on a parent router (`app.use('/admin',
  requireAuth, adminRouter)`), the check may flag a route that is
  actually protected. Read the evidence before concluding.
- The rate-limit check is per file: a limiter configured in another
  file, or at a reverse proxy / gateway, is not seen. Check the
  deployment before claiming there is no rate limiting.
- `cors()` with no arguments is flagged because the default in the
  common `cors` package allows any origin; if your framework's
  default is restrictive, this is a false positive.

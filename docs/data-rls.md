# Data and Row Level Security checks

## What it looks for

- Supabase queries with no RLS policy file: the project uses
  `supabase.from('…')` but no file contains `CREATE POLICY` or
  `ENABLE ROW LEVEL SECURITY`.
- BOLA-prone endpoints: a route with an `:id` parameter (Express) or
  a `/api/<resource>/<id>` handler (raw Node `http`) where the file
  shows no ownership check (no `req.user` compared against the
  resource's owner).
- Stripe webhook without signature verification: a file mentioning
  both `stripe` and `webhook` with no `constructEvent` call.
- SQL built by string concatenation: a `SELECT` / `INSERT` / `UPDATE`
  / `DELETE` string joined with `+` or `${…}` user input, in
  JavaScript/TypeScript or Java.

## Limits and false positives

- BOLA is a heuristic. Ownership can be checked in a helper, in
  middleware, or in the database layer (for example a query filtered
  by `user_id`) — none of which this check can see. A flag means
  "no ownership check was visible in this file", not "the endpoint
  is definitely exploitable". The `--live` BOLA probe (fetch user A's
  order as user B) is the way to confirm it.
- The Supabase check looks for policy *files*. Policies created only
  in the Supabase dashboard are not in the repo and will be missed —
  that is why the finding says "no policy file", not "no policy".
- The Stripe check only looks for `constructEvent`. A handler that
  verifies the signature another way (for example a raw-body HMAC
  check) will be flagged incorrectly.
- SQL concatenation is flagged on the text of the query. A query
  that concatenates only a constant (for example a table name from a
  fixed list) is not exploitable, but will still be flagged — prefer
  parameterised queries so the flag goes away.

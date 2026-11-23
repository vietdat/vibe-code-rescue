# Spring Boot checks

## What it looks for

- Secrets in `application.properties` / `application.yml` /
  `application.yaml`: any `*password*`, `*secret*`, `*key*` or
  `*token*` property whose value is a literal — not a `${…}`
  placeholder and not an obvious placeholder like `changeme`.
- `permitAll()` on a sensitive path: a Spring Security rule that
  calls `permitAll()` for `/admin…`, `/api…`, `/actuator…`, `/users…`,
  `anyRequest`, or a `/**` wildcard. Public paths (`/health`, `/login`,
  `/public`) are not flagged.
- CSRF disabled: `.csrf().disable()` or
  `csrf(AbstractHttpConfigurer::disable)`.
- SQL built by string concatenation: a `SELECT` string joined with
  `+` in a Java file (JPA `createQuery` or `JdbcTemplate.query`).
- Connection-pool defaults: a `spring.datasource.url` is configured
  but no HikariCP setting (`hikari`) appears in the properties file.

## Limits and false positives

- The secret check flags any literal value. A development-only
  default that is overridden by an environment variable in
  production is still flagged — that is intentional: a literal in
  the file is one accidental commit away from production.
- `permitAll()` on a genuinely public path (for example a health
  check or a login page) is fine; the check only flags paths that
  look sensitive (`/admin`, `/api`, `anyRequest`). Review the path
  before concluding.
- Disabling CSRF can be legitimate for a stateless API that uses
  bearer tokens and no cookies. The finding is a prompt to confirm
  that, not proof of a vulnerability.
- The pool check is a nudge, not a security issue: HikariCP defaults
  are usually fine for a small app, but production apps should set
  pool size and timeout explicitly.

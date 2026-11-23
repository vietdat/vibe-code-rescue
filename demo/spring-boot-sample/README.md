# Spring Boot sample — DEMO ONLY

A minimal Maven project with Spring Boot flaws for `vibe-rescue` to
detect **statically, from source only**. No build is required to audit it.

```bash
node ../../bin/vibe-rescue.js audit .
```

## Flaws it exhibits

- Hardcoded secrets in `application.properties` (`spring.datasource.password`, `jwt.secret`, `app.api-key`) — all fake placeholders
- Spring Security `permitAll()` on `/admin/**` and `/api/**` (`SecurityConfig.java`)
- CSRF protection disabled (`SecurityConfig.java`)
- SQL query built by string concatenation (`UserController.java`)
- No HikariCP connection-pool settings despite a configured datasource

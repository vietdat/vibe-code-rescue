'use strict';
// DEMO ONLY — intentionally vulnerable. Every value here is a fake
// placeholder that the audit should flag. Never put real secrets in code.
module.exports = {
  JWT_SECRET: 'demo-jwt-secret-do-not-use-in-production',
  API_KEY: 'sk-demo-fake-api-key-12345678',
  SESSION_SECRET: 'demo-session-secret-do-not-use',
  DB_PASSWORD: 'demo-password-1234',
};

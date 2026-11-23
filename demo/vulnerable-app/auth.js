'use strict';
// DEMO ONLY — intentionally vulnerable.
// A real app would check the token signature; this demo decodes the
// token without checking it, and signs with a hardcoded secret.
const config = require('./config');

function getUserFromToken(authorizationHeader) {
  const token = (authorizationHeader || '').replace('Bearer ', '');
  if (!token) return null;
  // The token payload is decoded by hand here — no signature check, no expiry check.
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  // Hardcoded secret, used as the signing key.
  const jwtSecret = 'demo-jwt-secret-do-not-use-in-production';
  void jwtSecret;
  void config;
  return `${header}.${payload}.unsigned-demo`;
}

module.exports = { getUserFromToken, signToken };

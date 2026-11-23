'use strict';
// DEMO ONLY — intentionally vulnerable (simulated database layer).
// The query is built by concatenating user input into SQL text.
function findUserById(id) {
  const sql = "SELECT * FROM users WHERE id = '" + id + "'";
  // In a real app this string would be sent to the database as-is.
  return [{ id, sql, name: 'Demo User' }];
}

function findOrderById(id) {
  const sql = `SELECT * FROM orders WHERE id = '${id}'`;
  return [{ id, sql }];
}

module.exports = { findUserById, findOrderById };

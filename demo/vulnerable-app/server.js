'use strict';
// DEMO ONLY — intentionally vulnerable. Never deploy this app.
// Run: node server.js  (no install needed; Node built-ins only)
// Then: node ../../bin/vibe-rescue.js audit . --live http://localhost:3000
const http = require('http');
const config = require('./config');
const auth = require('./auth');
const db = require('./db');
const supabase = require('./supabase');

const orders = [
  { id: 1, owner: 'user-a', item: 'Wedding video 60s', total: 195 },
  { id: 2, owner: 'user-a', item: 'Wedding video 2min', total: 395 },
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, app: 'vulnerable demo shop' }));
    return;
  }

  if (pathname === '/admin') {
    // No login check at all — anyone can open the admin page.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ admin: true, users: ['user-a', 'user-b'], apiKey: config.API_KEY }));
    return;
  }

  if (pathname === '/debug') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ debug: true, jwtSecret: config.JWT_SECRET, env: process.env }));
    return;
  }

  if (pathname.startsWith('/api/orders/')) {
    // BOLA: no login, no ownership check — any caller gets any order.
    const id = Number(pathname.split('/').pop());
    const order = orders.find(o => o.id === id);
    if (!order) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(order));
    return;
  }

  if (pathname.startsWith('/api/users/')) {
    const id = pathname.split('/').pop();
    // SQL built by string concatenation (simulated — see db.js).
    const rows = db.findUserById(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rows));
    return;
  }

  if (pathname === '/api/profile') {
    // Token is decoded, never verified.
    const user = auth.getUserFromToken(req.headers.authorization || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user }));
    return;
  }

  if (pathname === '/api/my-orders') {
    // Supabase query with no Row Level Security policy anywhere in the project.
    supabase.from('orders').select('*').then(rows => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    });
    return;
  }

  if (pathname === '/webhook/stripe' && req.method === 'POST') {
    // Stripe webhook accepted with no signature verification.
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, event: JSON.parse(body || '{}').type || null }));
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Vulnerable demo app listening on http://localhost:${PORT} (DEMO ONLY — do not deploy)`));

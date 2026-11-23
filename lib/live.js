'use strict';

// Live probes against a running app. Uses only the global fetch (Node 18+).
// Every probe is read-only except the Stripe-style webhook probe, which
// sends a fake unsigned payload to see whether the server accepts it.
async function probeLive(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const probes = [];

  async function get(pathname, headers = {}) {
    try {
      const res = await fetch(base + pathname, { headers, signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 2000) };
    } catch (e) {
      return { status: 0, body: '', error: e.message };
    }
  }

  // 1. Unauthenticated admin access.
  const admin = await get('/admin');
  probes.push({
    name: 'Unauthenticated /admin access',
    result: admin.status === 200 ? 'FAIL' : admin.status === 0 ? 'ERROR' : 'PASS',
    detail: admin.status === 0 ? `could not reach ${base}/admin (${admin.error})`
      : admin.status === 200 ? 'GET /admin returned 200 without any login — admin page is open to anyone.'
      : `GET /admin returned ${admin.status} (blocked without login, as expected).`,
  });

  // 2. Unauthenticated debug endpoint.
  const debug = await get('/debug');
  probes.push({
    name: 'Unauthenticated /debug access',
    result: debug.status === 200 ? 'FAIL' : debug.status === 0 ? 'ERROR' : 'PASS',
    detail: debug.status === 0 ? `could not reach ${base}/debug (${debug.error})`
      : debug.status === 200 ? 'GET /debug returned 200 without any login.'
      : `GET /debug returned ${debug.status}.`,
  });

  // 3. BOLA: fetch user A's order as user B.
  const asB = await get('/api/orders/1', { 'x-user-id': 'user-b' });
  let bolaDetail = `GET /api/orders/1 as user-b returned ${asB.status}.`;
  let bolaResult = asB.status === 0 ? 'ERROR' : 'PASS';
  if (asB.status === 200) {
    try {
      const data = JSON.parse(asB.body);
      const owner = data.owner || (data.order && data.order.owner);
      if (owner && owner !== 'user-b') {
        bolaResult = 'FAIL';
        bolaDetail = `GET /api/orders/1 as user-b returned an order owned by "${owner}" — user B can read user A's data (BOLA).`;
      } else if (owner === 'user-b') {
        bolaDetail = 'GET /api/orders/1 as user-b returned only user-b data.';
      } else {
        bolaResult = 'FAIL';
        bolaDetail = 'GET /api/orders/1 returned 200 as user-b with no ownership information in the response.';
      }
    } catch {
      bolaResult = 'FAIL';
      bolaDetail = 'GET /api/orders/1 returned 200 as user-b (no ownership check visible in the response).';
    }
  }
  probes.push({ name: 'BOLA: read user A order as user B', result: bolaResult, detail: bolaDetail });

  // 4. Rate limiting: 30 rapid requests, look for a 429.
  let statuses = [];
  for (let i = 0; i < 30; i++) {
    const r = await get('/api/orders/1', { 'x-user-id': 'user-b' });
    statuses.push(r.status);
    if (r.status === 0) break;
  }
  const limited = statuses.includes(429);
  probes.push({
    name: 'Rate limiting (30 rapid requests)',
    result: statuses.includes(0) ? 'ERROR' : limited ? 'PASS' : 'FAIL',
    detail: statuses.includes(0) ? 'could not reach the app for the rate-limit probe.'
      : limited ? 'The app returned 429 after rapid requests — rate limiting is present.'
      : `All ${statuses.filter(s => s === 200).length} rapid requests returned 200 — no rate limiting was observed.`,
  });

  // 5. Stripe-style webhook without a signature.
  let webhookResult = 'PASS';
  let webhookDetail = 'No webhook endpoint responded to an unsigned payload.';
  try {
    const res = await fetch(base + '/webhook/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.succeeded', id: 'pi_probe' }),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    if (res.status === 200) {
      webhookResult = 'FAIL';
      webhookDetail = 'POST /webhook/stripe with no Stripe signature returned 200 — the webhook accepts unsigned payloads.';
    } else {
      webhookDetail = `POST /webhook/stripe with no signature returned ${res.status}.`;
    }
    void text;
  } catch (e) {
    webhookResult = 'ERROR';
    webhookDetail = `could not reach ${base}/webhook/stripe (${e.message})`;
  }
  probes.push({ name: 'Stripe webhook accepts unsigned payload', result: webhookResult, detail: webhookDetail });

  const fails = probes.filter(p => p.result === 'FAIL').length;
  return { baseUrl: base, probes, fails };
}

module.exports = { probeLive };

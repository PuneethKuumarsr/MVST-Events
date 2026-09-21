import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPortalWorker } from '../cloudflare/worker.js';

const portal = 'https://mvst-seva.pages.dev';

test('pages and QR routes use static assets without contacting Render', async () => {
  const worker = createPortalWorker({ fetchUpstream: () => assert.fail('unexpected backend call') });
  for (const pathname of ['/', '/qr/receipt?token=test', '/assets/app.js']) {
    const response = await worker.fetch(new Request(portal + pathname), {
      ASSETS: { fetch: async (request) => new Response(new URL(request.url).pathname) },
    });
    assert.equal(await response.text(), new URL(portal + pathname).pathname);
  }
});

test('a visitor without a session gets the login response immediately', async () => {
  const worker = createPortalWorker({ fetchUpstream: () => assert.fail('unexpected backend call') });
  const response = await worker.fetch(new Request(portal + '/api/auth/me'), {});
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal((await response.json()).ok, false);
});

test('existing sessions are verified upstream and cannot be treated as authenticated locally', async () => {
  let calls = 0;
  const worker = createPortalWorker({ fetchUpstream: async (url, options) => {
    calls++;
    assert.equal(url, 'https://mvst-events.onrender.com/api/auth/me');
    assert.equal(options.headers.get('Cookie'), 'mvst_session=expired-example');
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  } });
  const response = await worker.fetch(new Request(portal + '/api/auth/me', {
    headers: { Cookie: 'mvst_session=expired-example' },
  }), {});
  assert.equal(calls, 1);
  assert.equal(response.status, 401);
});

test('login preserves request body, session cookies, and the public hostname', async () => {
  const payload = { mobile: '9000000000', pin: 'example-only' };
  const worker = createPortalWorker({ fetchUpstream: async (url, options) => {
    assert.equal(url, 'https://mvst-events.onrender.com/api/auth/login');
    assert.equal(options.method, 'POST');
    assert.deepEqual(await new Response(options.body).json(), payload);
    assert.equal(options.headers.get('X-Forwarded-Host'), 'mvst-seva.pages.dev');
    assert.equal(options.headers.get('X-Forwarded-Proto'), 'https');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cf.cacheTtl, 0);
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    headers.append('Set-Cookie', 'mvst_session=example; Domain=mvst-events.onrender.com; HttpOnly; Secure; SameSite=Lax; Path=/');
    headers.append('Set-Cookie', 'other=example; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/');
    return new Response(JSON.stringify({ ok: true }), { headers });
  } });
  const response = await worker.fetch(new Request(portal + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: portal },
    body: JSON.stringify(payload),
  }), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /HttpOnly; Secure; SameSite=Lax/);
  assert.doesNotMatch(cookies[0], /Domain=/i);
  assert.match(cookies[1], /Wed, 21 Oct/);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('cross-site write requests are rejected before contacting the backend', async () => {
  const worker = createPortalWorker({ fetchUpstream: () => assert.fail('unexpected backend call') });
  const response = await worker.fetch(new Request(portal + '/api/expenses', {
    method: 'POST', headers: { Origin: 'https://unrelated.example' }, body: '{}',
  }), {});
  assert.equal(response.status, 403);
});

test('record requests preserve paths, parameters and backend errors without caching', async () => {
  const worker = createPortalWorker({ fetchUpstream: async (url) => {
    assert.equal(new URL(url).origin, 'https://mvst-events.onrender.com');
    assert.equal(new URL(url).pathname, '/api/expenses');
    assert.equal(new URL(url).search, '?year=2026');
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  } });
  const response = await worker.fetch(new Request(portal + '/api/expenses?year=2026'), {});
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'Forbidden');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('upstream outage and HTML startup responses become useful JSON errors', async () => {
  for (const fetchUpstream of [
    async () => { throw new Error('network unavailable'); },
    async () => new Response('<html>Starting...</html>', { headers: { 'Content-Type': 'text/html' } }),
  ]) {
    const worker = createPortalWorker({ fetchUpstream });
    const response = await worker.fetch(new Request(portal + '/api/health'), {});
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.match(payload.error, /try again shortly/);
  }
});

test('local health identifies the separate MVST project', async () => {
  const worker = createPortalWorker({ fetchUpstream: () => assert.fail('unexpected backend call') });
  const response = await worker.fetch(new Request(portal + '/api/portal-health'), {});
  assert.deepEqual(await response.json(), { status: 'ok', app: 'MVST Seva', hosting: 'Cloudflare Pages' });
});

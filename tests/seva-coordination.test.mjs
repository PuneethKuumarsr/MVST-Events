import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import { once } from 'node:events';
import { SEVA_CONTACT_GROUPS, validateSevaCoordination, coordinationResponse } from '../server/seva-coordination.js';
import { createSevaCoordinationRouter } from '../server/routes/seva-coordination.js';

function input() {
  return {
    driverReplyTimeoutMinutes: 60,
    groups: Object.fromEntries(SEVA_CONTACT_GROUPS.map((key, index) => [key, [{ name: `Test ${key}`, mobile: `900000000${index}` }]])),
  };
}

test('normalizes mobile numbers, preserves driver priority and stores the one-hour rule', () => {
  const data = input();
  data.groups.drivers = [
    { name: ' First Driver ', mobile: '+91 90000 00001' },
    { name: 'Second Driver', mobile: '9000000006' },
    { name: 'Third Driver', mobile: '919000000007' },
  ];
  const result = validateSevaCoordination(data);
  assert.equal(result.driverReplyTimeoutMinutes, 60);
  assert.deepEqual(result.groups.drivers.map(c => c.name), ['First Driver', 'Second Driver', 'Third Driver']);
  assert.deepEqual(result.groups.drivers.map(c => c.mobile), ['919000000001', '919000000006', '919000000007']);
  assert.equal(data.groups.drivers[0].name, ' First Driver ');
});

test('rejects incomplete groups, bad numbers, duplicate drivers and invalid reply times', () => {
  for (const timeout of [0, -1, 1.5, '60', 1441, null]) {
    assert.throws(() => validateSevaCoordination({ ...input(), driverReplyTimeoutMinutes: timeout }));
  }
  for (const mobile of ['1234', '919000000000x', '9000000000123', '5000000000']) {
    const data = input(); data.groups.drivers[0].mobile = mobile;
    assert.throws(() => validateSevaCoordination(data));
  }
  const duplicate = input(); duplicate.groups.drivers.push({ ...duplicate.groups.drivers[0] });
  assert.throws(() => validateSevaCoordination(duplicate));
  const empty = input(); empty.groups.temple = [];
  assert.throws(() => validateSevaCoordination(empty));
});

test('saved contacts cannot activate delivery or expose other stored fields', () => {
  const response = coordinationResponse({ ...input(), deliveryActive: true, secret: 'never-return', updatedBy: 'private' });
  assert.equal(response.delivery.active, false);
  assert.equal(response.delivery.status, 'SETUP_REQUIRED');
  assert.equal(response.settings.secret, undefined);
  assert.equal(response.settings.updatedBy, undefined);
  assert.equal(coordinationResponse(null).configured, false);
});

test('private settings require Office admin; failure is retryable without leaking details', async () => {
  let reads = 0; let fail = false; let missing = false;
  const app = express();
  app.use('/api/seva/coordination', createSevaCoordinationRouter({
    requirePst(req, res, next) {
      if (!req.headers['x-test-role']) return res.status(401).json({ ok: false });
      if (req.headers['x-test-role'] !== 'admin') return res.status(403).json({ ok: false });
      next();
    },
    connectStore: async () => { if (fail) throw new Error('private connection string'); },
    Settings: { findById(id) { reads++; assert.equal(id, 'gruha-seva'); return { lean: async () => missing ? null : input() }; } },
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/seva/coordination`;
  const admin = { headers: { 'x-test-role': 'admin' } };
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { 'x-test-role': 'volunteer' } })).status, 403);
    assert.equal(reads, 0);
    const result = await fetch(url, admin);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    assert.equal((await result.json()).settings.driverReplyTimeoutMinutes, 60);
    fail = true;
    const failure = await fetch(url, admin);
    assert.equal(failure.status, 503);
    assert.ok(!(await failure.text()).includes('private connection string'));
    fail = false; missing = true;
    assert.equal((await (await fetch(url, admin)).json()).configured, false);
    assert.equal((await fetch(url, { ...admin, method: 'POST' })).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const source = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
  assert.match(source, /app.use\('\/api\/seva\/coordination', createSevaCoordinationRouter\(\{\s+requirePst,/);
});

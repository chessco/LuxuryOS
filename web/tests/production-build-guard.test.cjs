const assert = require('node:assert/strict');
const test = require('node:test');
test('production URL guard accepts only the official API origin', async () => {
  const { assertProductionApiUrl } = await import('../scripts/verify-production-build.mjs');
  for (const invalidUrl of ['', 'http://localhost:3002', 'http://127.0.0.1:3002', 'http://[::1]:3002', 'https://example.com']) assert.throws(() => assertProductionApiUrl(invalidUrl));
  assert.equal(assertProductionApiUrl('https://luxury-api.pitayacode.io/'), 'https://luxury-api.pitayacode.io');
});
test('production build guard rejects loopback and requires the production API', async () => {
  const { validateProductionBundle } = await import('../scripts/verify-production-build.mjs');
  assert.throws(() => validateProductionBundle(['const api = "http://localhost:3002";']), /loopback/);
  assert.throws(() => validateProductionBundle(['const api = "https://example.com";']), /luxury-api/);
  assert.doesNotThrow(() => validateProductionBundle(['const api = "https://luxury-api.pitayacode.io";']));
});

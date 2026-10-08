import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'unsnooze-jev-secret-test-'));
process.env.UNSNOOZE_STATE_DIR = DIR;

const {
  jevApiKeyStatus, loadStoredJevApiKey, removeStoredJevApiKey, storeJevApiKey,
} = await import('../src/jev-secret.js');

after(() => rmSync(DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));

test('Windows secure store never writes the plaintext API key', () => {
  const target = join(DIR, 'secrets', 'test.dpapi');
  const calls = [];
  const run = (script, input) => {
    calls.push({ script, input });
    return script.includes('::Protect(') ? 'encrypted-base64' : 'jev-live-secret';
  };
  storeJevApiKey('jev-live-secret', { platform: 'win32', run, target });
  assert.deepEqual(jevApiKeyStatus({ platform: 'win32', target }), {
    configured: true, source: 'windows-dpapi',
  });
  assert.equal(loadStoredJevApiKey({ platform: 'win32', run, target }), 'jev-live-secret');
  assert.equal(calls[0].input, 'jev-live-secret');
  assert.equal(calls[1].input, 'encrypted-base64');
  assert.equal(removeStoredJevApiKey({ target }), true);
  assert.equal(removeStoredJevApiKey({ target }), false);
});

test('non-Windows users get an explicit environment-variable fallback', () => {
  assert.throws(() => storeJevApiKey('secret', { platform: 'linux' }), /TYPESAFE_API_KEY/);
});

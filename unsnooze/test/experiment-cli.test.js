import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'unsnooze-experiment-cli-test-'));
process.env.UNSNOOZE_STATE_DIR = DIR;

const { cmdExperiment } = await import('../src/cli.js');
const { getConfig } = await import('../src/settings.js');

after(() => rmSync(DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));

test('experiment command enables shadow/enforce and changes allocation', async () => {
  const lines = [];
  const original = console.log;
  console.log = line => lines.push(String(line));
  try {
    assert.equal(await cmdExperiment(['jev', 'shadow']), 0);
    assert.equal(getConfig('experiments.jev.enabled'), true);
    assert.equal(getConfig('experiments.jev.mode'), 'shadow');
    assert.equal(await cmdExperiment(['jev', 'percent', '30']), 0);
    assert.equal(getConfig('experiments.jev.allocationPercent'), 30);
    assert.equal(await cmdExperiment(['jev', 'enforce']), 0);
    assert.equal(getConfig('experiments.jev.mode'), 'enforce');
    assert.equal(await cmdExperiment(['jev', 'off']), 0);
    assert.equal(getConfig('experiments.jev.enabled'), false);
  } finally {
    console.log = original;
  }
  assert.match(lines.join('\n'), /Existing tasks keep their assignment/);
});

test('experiment command rejects an out-of-range allocation', async () => {
  const errors = [];
  const original = console.error;
  console.error = line => errors.push(String(line));
  try {
    assert.equal(await cmdExperiment(['jev', 'percent', '101']), 1);
  } finally {
    console.error = original;
  }
  assert.match(errors.join('\n'), /between 1 and 100/);
});

test('experiment command stores a Jev key without printing it', async () => {
  const lines = [];
  const original = console.log;
  console.log = line => lines.push(String(line));
  let stored;
  try {
    assert.equal(await cmdExperiment(['jev', 'key', 'set'], {
      readSecret: async () => 'jev-secret-value',
      storeJevApiKey: value => { stored = value; },
    }), 0);
  } finally {
    console.log = original;
  }
  assert.equal(stored, 'jev-secret-value');
  assert.equal(lines.join('\n').includes('jev-secret-value'), false);
  assert.match(lines.join('\n'), /stored securely/);
});

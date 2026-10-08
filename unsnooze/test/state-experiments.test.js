import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'unsnooze-state-experiment-test-'));
process.env.UNSNOOZE_STATE_DIR = DIR;
process.env.UNSNOOZE_EXPERIMENT_JEV = 'on';
process.env.UNSNOOZE_EXPERIMENT_JEV_PERCENT = '50';
process.env.UNSNOOZE_EXPERIMENT_JEV_MODE = 'enforce';

const { upsertSession, readState } = await import('../src/state.js');
const { dispatchCodexContextBatch } = await import('../src/watcher.js');

after(() => {
  delete process.env.UNSNOOZE_EXPERIMENT_JEV;
  delete process.env.UNSNOOZE_EXPERIMENT_JEV_PERCENT;
  delete process.env.UNSNOOZE_EXPERIMENT_JEV_MODE;
  rmSync(DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

test('upsert assigns once and a duplicate detection cannot switch arms', () => {
  upsertSession({
    sessionId: 'stable-task',
    agent: 'codex',
    cwd: DIR,
    status: 'queued',
    detectedAt: 1000,
  });
  const before = structuredClone(readState().sessions['stable-task'].experiment.jev);

  process.env.UNSNOOZE_EXPERIMENT_JEV_PERCENT = before.arm === 'control' ? '100' : '1';
  process.env.UNSNOOZE_EXPERIMENT_JEV_MODE = 'shadow';
  upsertSession({
    sessionId: 'stable-task',
    agent: 'codex',
    cwd: DIR,
    status: 'queued',
    detectedAt: 2000,
  });

  const afterAssignment = readState().sessions['stable-task'].experiment.jev;
  assert.deepEqual(afterAssignment, before);
  assert.equal(readState().sessions['stable-task'].lineageRootId, 'stable-task');
});

test('Codex stop records a hybrid-shadow recovery decision', () => {
  upsertSession({
    sessionId: 'codex-stop-without-checkpoint',
    agent: 'codex',
    cwd: DIR,
    status: 'stopped',
    detectedAt: 5000,
    bannerAt: 5000,
    workspace: null,
  });
  const state = readState();
  const record = state.sessions['codex-stop-without-checkpoint'];
  const bundle = state.recoveryBundles[record.recoveryBundleId];
  assert.equal(bundle.policy, 'hybrid-shadow');
  assert.equal(bundle.actualDecision, 'resume_existing');
  assert.deepEqual(bundle.assessment.reasons, ['checkpoint_missing']);
});

test('checkpoint-time A/B assignment is reused by the later stop record', () => {
  dispatchCodexContextBatch([{
    kind: 'checkpoint',
    semantic: {
      goal: 'Keep one A/B arm', confirmed: [], changes_artifacts: [], open_issues: [],
      next_responsibility: 'Stop later', verification: [], schema_version: 1,
    },
    turnId: 'turn-ab', at: 10_000,
    meta: { sessionId: 'checkpoint-first-task', cwd: DIR },
  }]);
  const before = Object.values(readState().taskExperiments)
    .find(a => a.lineageRootId === 'checkpoint-first-task');
  assert.ok(before);

  process.env.UNSNOOZE_EXPERIMENT_JEV_PERCENT = before.arm === 'control' ? '100' : '1';
  process.env.UNSNOOZE_EXPERIMENT_JEV_MODE = 'shadow';
  upsertSession({
    sessionId: 'checkpoint-first-task', agent: 'codex', cwd: DIR,
    status: 'stopped', detectedAt: 11_000, bannerAt: 11_000, workspace: null,
  });
  assert.deepEqual(readState().sessions['checkpoint-first-task'].experiment.jev, before);
});

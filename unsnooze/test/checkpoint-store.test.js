import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'unsnooze-checkpoint-store-test-'));
process.env.UNSNOOZE_STATE_DIR = DIR;

const {
  durableContextStatus,
  getCheckpoint,
  markCheckpointStale,
  saveCheckpoint,
} = await import('../src/checkpoint-store.js');
const { dispatchCodexContextBatch } = await import('../src/watcher.js');
const { cmdCheckpoint } = await import('../src/cli.js');

after(() => rmSync(DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));

test('checkpoint store persists through the shared locked state file', () => {
  const saved = saveCheckpoint({
    rootTaskId: 'persisted-task',
    semantic: {
      goal: 'Persist a checkpoint',
      confirmed: [],
      changes_artifacts: [],
      open_issues: [],
      next_responsibility: 'Read it back',
      verification: ['checkpoint-store test'],
      schema_version: 1,
    },
    technical: { sessionId: 'session-persisted', sourceTurnId: 'turn-1' },
  }, 1000);
  assert.equal(getCheckpoint('persisted-task').checkpointId, saved.checkpointId);
  assert.deepEqual(durableContextStatus().checkpoints, { total: 1, current: 1, stale: 0 });
  assert.equal(markCheckpointStale('persisted-task', {
    expectedCheckpointId: saved.checkpointId,
    reason: 'new_turn',
    now: 2000,
  }).changed, true);
  assert.equal(getCheckpoint('persisted-task').freshness.status, 'stale');
});

test('Codex event batch makes a checkpoint current, then stales it on the next turn', () => {
  const semantic = {
    goal: 'Track rollout freshness', confirmed: [], changes_artifacts: [], open_issues: [],
    next_responsibility: 'Observe the next turn', verification: [], schema_version: 1,
  };
  assert.equal(dispatchCodexContextBatch([{
    kind: 'checkpoint', semantic, turnId: 'turn-10', at: 10_000,
    meta: { sessionId: 'rollout-task', cwd: DIR },
  }]), 1);
  assert.equal(getCheckpoint('rollout-task').freshness.status, 'current');
  assert.equal(dispatchCodexContextBatch([{
    kind: 'turn_started', turnId: 'turn-11', at: 11_000,
    meta: { sessionId: 'rollout-task', cwd: DIR },
  }]), 1);
  assert.equal(getCheckpoint('rollout-task').freshness.status, 'stale');
});

test('compaction is counted but does not stale a current checkpoint', () => {
  const semantic = {
    goal: 'Survive compaction', confirmed: [], changes_artifacts: [], open_issues: [],
    next_responsibility: 'Continue after compaction', verification: [], schema_version: 1,
  };
  dispatchCodexContextBatch([{
    kind: 'checkpoint', semantic, turnId: 'turn-20', at: 20_000,
    meta: { sessionId: 'compact-task', cwd: DIR },
  }]);
  assert.equal(dispatchCodexContextBatch([{
    kind: 'compaction_observed', turnId: 'turn-20', at: 20_500,
    meta: { sessionId: 'compact-task', cwd: DIR },
  }]), 1);
  assert.equal(getCheckpoint('compact-task').freshness.status, 'current');
  assert.equal(durableContextStatus().operations.compactionsObserved, 1);
});

test('checkpoint status exposes aggregate health without semantic bodies', () => {
  const lines = [];
  const original = console.log;
  console.log = value => lines.push(String(value));
  try {
    assert.equal(cmdCheckpoint(['status', '--json']), 0);
  } finally {
    console.log = original;
  }
  const output = JSON.parse(lines.join('\n'));
  assert.equal(output.mode, 'hybrid-shadow');
  assert.equal(output.actualRecovery, 'resume_existing');
  assert.ok(output.checkpoints.total >= 1);
  assert.equal(lines.join('\n').includes('Survive compaction'), false);
});

test('checkpoint save command is silent and infers the Codex task id', () => {
  const semantic = {
    goal: 'Save without visible machine text',
    confirmed: ['Task id comes from the Codex environment'],
    changes_artifacts: ['state.json'],
    open_issues: [],
    next_responsibility: 'Continue with a clean user response',
    verification: ['checkpoint-store test'],
    schema_version: 1,
  };
  const logs = [];
  const original = console.log;
  console.log = value => logs.push(String(value));
  try {
    assert.equal(cmdCheckpoint(['save', '--payload-json', JSON.stringify(semantic)], {
      env: { CODEX_THREAD_ID: 'silent-checkpoint-task', CODEX_SESSION_ID: 'silent-checkpoint-task' },
      cwd: DIR,
      fingerprint: () => ({ head: 'test', dirtyHash: 'clean' }),
      now: () => 30_000,
    }), 0);
  } finally {
    console.log = original;
  }
  assert.deepEqual(logs, []);
  assert.equal(getCheckpoint('silent-checkpoint-task').semantic.goal, semantic.goal);
  assert.equal(getCheckpoint('silent-checkpoint-task').freshness.status, 'current');
});

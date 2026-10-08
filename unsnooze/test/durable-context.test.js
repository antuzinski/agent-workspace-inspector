import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assessCheckpoint,
  buildRecoveryBundleInState,
  markCheckpointStaleInState,
  saveCheckpointInState,
  summarizeDurableContext,
  validateCheckpointSemantic,
} from '../src/durable-context.js';

const semantic = (overrides = {}) => ({
  goal: 'Finish the recovery controller',
  confirmed: ['Codex stop was caused by a usage limit'],
  changes_artifacts: ['src/state.js'],
  open_issues: ['Compaction integration is pending'],
  next_responsibility: 'Implement the checkpoint extractor',
  verification: ['node --test test/durable-context.test.js'],
  schema_version: 1,
  ...overrides,
});

const input = (overrides = {}) => ({
  rootTaskId: 'task-root-1',
  semantic: semantic(),
  technical: {
    sessionId: 'session-1',
    sourceTurnId: 'turn-7',
    cwd: '/repo',
    workspaceFingerprint: { head: 'abc', dirtyHash: 'def' },
    createdAt: 1000,
  },
  ...overrides,
});

test('semantic validation is strict and strips unknown fields', () => {
  const checked = validateCheckpointSemantic({ ...semantic(), secret: 'must not persist' });
  assert.equal(checked.ok, true);
  assert.equal(checked.semantic.secret, undefined);
  assert.equal(validateCheckpointSemantic(semantic({ goal: '' })).ok, false);
  assert.equal(validateCheckpointSemantic(semantic({ confirmed: 'not-an-array' })).ok, false);
});

test('saving a checkpoint creates a current revision; a newer save supersedes it', () => {
  const state = {};
  const first = saveCheckpointInState(state, input(), 1000);
  const second = saveCheckpointInState(state, input({
    semantic: semantic({ next_responsibility: 'Run the complete suite' }),
    technical: { ...input().technical, sourceTurnId: 'turn-8', createdAt: 2000 },
  }), 2000);
  assert.equal(first.revision, 1);
  assert.equal(second.revision, 2);
  assert.notEqual(first.checkpointId, second.checkpointId);
  assert.equal(second.freshness.status, 'current');
  assert.equal(Object.keys(state.checkpoints).length, 1);
});

test('stale marking is compare-and-set so an old event cannot spoil a newer checkpoint', () => {
  const state = {};
  const first = saveCheckpointInState(state, input(), 1000);
  const second = saveCheckpointInState(state, input({
    technical: { ...input().technical, sourceTurnId: 'turn-8', createdAt: 2000 },
  }), 2000);
  const oldEvent = markCheckpointStaleInState(state, 'task-root-1', {
    expectedCheckpointId: first.checkpointId,
    now: 3000,
  });
  assert.equal(oldEvent.changed, false);
  assert.equal(oldEvent.reason, 'superseded');
  const currentEvent = markCheckpointStaleInState(state, 'task-root-1', {
    expectedCheckpointId: second.checkpointId,
    reason: 'tool_call_after_checkpoint',
    event: { type: 'tool_call', turnId: 'turn-9', at: 3100 },
    now: 3100,
  });
  assert.equal(currentEvent.changed, true);
  assert.equal(currentEvent.checkpoint.freshness.status, 'stale');
});

test('an event from before a directly saved checkpoint cannot stale it', () => {
  const state = {};
  const checkpoint = saveCheckpointInState(state, input({
    technical: { ...input().technical, createdAt: 5000 },
  }), 5000);
  const oldEvent = markCheckpointStaleInState(state, 'task-root-1', {
    expectedCheckpointId: checkpoint.checkpointId,
    event: { type: 'tool_call', turnId: 'turn-7', at: 4900 },
    now: 6000,
  });
  assert.equal(oldEvent.changed, false);
  assert.equal(oldEvent.reason, 'event_before_checkpoint');
  assert.equal(checkpoint.freshness.status, 'current');
});

test('fresh recovery requires valid content, current checkpoint, matching turn and workspace', () => {
  const state = {};
  saveCheckpointInState(state, input(), 1000);
  assert.equal(assessCheckpoint(state, {
    rootTaskId: 'task-root-1',
    latestTurnId: 'turn-7',
    workspaceFingerprint: { dirtyHash: 'def', head: 'abc' },
  }).readyForFreshRecovery, true);
  const changed = assessCheckpoint(state, {
    rootTaskId: 'task-root-1',
    latestTurnId: 'turn-8',
    workspaceFingerprint: { head: 'xyz', dirtyHash: 'def' },
  });
  assert.equal(changed.readyForFreshRecovery, false);
  assert.deepEqual(changed.reasons.sort(), ['newer_turn_observed', 'workspace_changed']);
});

test('hybrid-shadow records a candidate but always chooses resume_existing in v1', () => {
  const state = {};
  saveCheckpointInState(state, input(), 1000);
  const record = {
    key: 'session-1',
    sessionId: 'session-1',
    lineageRootId: 'task-root-1',
    sourceTurnId: 'turn-7',
    workspace: { head: 'abc', dirtyHash: 'def' },
    cwd: '/repo',
    bannerAt: 5000,
  };
  const bundle = buildRecoveryBundleInState(state, record, 6000);
  assert.equal(bundle.shadowDecision, 'fresh_candidate');
  assert.equal(bundle.actualDecision, 'resume_existing');
  assert.equal(bundle.checkpointId, Object.values(state.checkpoints)[0].checkpointId);
  assert.equal(record.freshRecoveryCandidate, true);
});

test('missing checkpoint produces a resume-only recovery bundle', () => {
  const state = {};
  const bundle = buildRecoveryBundleInState(state, {
    key: 'session-missing', sessionId: 'session-missing', bannerAt: 5000,
  }, 6000);
  assert.equal(bundle.shadowDecision, 'resume_required');
  assert.equal(bundle.actualDecision, 'resume_existing');
  assert.deepEqual(bundle.assessment.reasons, ['checkpoint_missing']);
  assert.deepEqual(summarizeDurableContext(state), {
    checkpoints: { total: 0, current: 0, stale: 0 },
    recoveries: { total: 1, freshCandidates: 0, resumeRequired: 1 },
    operations: {
      checkpointsSaved: 0,
      checkpointsStaled: 0,
      compactionsObserved: 0,
      rejectedEvents: 0,
      jevEligible: 0,
      jevQueued: 0,
      jevUnavailable: 0,
      jevCompleted: 0,
      jevErrors: 0,
    },
  });
});

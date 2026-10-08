import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  experimentBucket,
  ensureJevAssignment,
  jevDecision,
  summarizeJevAssignments,
} from '../src/experiments.js';

const CONFIG = {
  enabled: true,
  experimentId: 'jev-v1',
  allocationPercent: 50,
  scope: 'all',
  mode: 'enforce',
};

test('bucket is deterministic per experiment and task lineage', () => {
  const a = experimentBucket('jev-v1', 'task-123');
  assert.equal(experimentBucket('jev-v1', 'task-123'), a);
  assert.ok(a >= 0 && a < 100);
});

test('assignment is stable and snapshots experiment settings', () => {
  const record = { sessionId: 'task-123' };
  ensureJevAssignment(record, '', CONFIG, 1000);
  const first = structuredClone(record.experiment.jev);
  ensureJevAssignment(record, '', {
    ...CONFIG,
    experimentId: 'jev-v2',
    allocationPercent: 100,
    mode: 'shadow',
  }, 2000);
  assert.deepEqual(record.experiment.jev, first);
  assert.equal(record.lineageRootId, 'task-123');
});

test('disabled experiment does not assign a task', () => {
  const record = { sessionId: 'task-off' };
  ensureJevAssignment(record, '', { ...CONFIG, enabled: false });
  assert.equal(record.experiment, undefined);
});

test('control never calls Jev; shadow calls without changing behavior', () => {
  const control = {
    experiment: { jev: { arm: 'control', scope: 'all', mode: 'enforce' } },
  };
  assert.deepEqual(jevDecision(control, 'checkpoint_gate'), {
    assigned: true,
    arm: 'control',
    mode: 'enforce',
    callModel: false,
    affectBehavior: false,
  });

  const shadow = {
    experiment: { jev: { arm: 'treatment', scope: 'checkpoint_gate', mode: 'shadow' } },
  };
  assert.equal(jevDecision(shadow, 'checkpoint_gate').callModel, true);
  assert.equal(jevDecision(shadow, 'checkpoint_gate').affectBehavior, false);
  assert.equal(jevDecision(shadow, 'compaction_guard').callModel, false);
});

test('summary reports both arms by experiment id', () => {
  const state = { sessions: {
    a: { experiment: { jev: { experimentId: 'jev-v1', arm: 'control' } } },
    b: { experiment: { jev: { experimentId: 'jev-v1', arm: 'treatment' } } },
    c: {},
  } };
  assert.deepEqual(summarizeJevAssignments(state), {
    assigned: 2,
    control: 1,
    treatment: 1,
    byExperiment: { 'jev-v1': { assigned: 2, control: 1, treatment: 1 } },
  });
});

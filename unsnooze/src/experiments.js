// Stable experiment assignment for optional model-based control layers.
//
// The unit of randomisation is a task lineage, not a checkpoint or a resume
// attempt.  A task must never see both arms: that would mix the treatment into
// the control and make both the user experience and the comparison ambiguous.

import { createHash } from 'node:crypto';
import { getConfig } from './settings.js';

export const JEV_CONTROL = 'control';
export const JEV_TREATMENT = 'treatment';

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(n)));
}

// A stable bucket in [0, 99].  The explicit separator prevents accidental
// collisions between pairs such as ("ab", "c") and ("a", "bc").
export function experimentBucket(experimentId, lineageRootId) {
  const digest = createHash('sha256')
    .update(String(experimentId))
    .update('\0')
    .update(String(lineageRootId))
    .digest();
  return digest.readUInt32BE(0) % 100;
}

export function taskExperimentKey(lineageRootId) {
  return `task-${createHash('sha256').update(String(lineageRootId)).digest('hex').slice(0, 24)}`;
}

export function lineageRootFor(record, fallbackKey = '') {
  return String(
    record?.lineageRootId
      || record?.experiment?.jev?.lineageRootId
      || record?.sessionId
      || record?.key
      || fallbackKey
      || `anonymous:${record?.agent || 'unknown'}:${record?.cwd || ''}:${record?.detectedAt || 0}`,
  );
}

export function currentJevConfig() {
  const rawId = String(getConfig('experiments.jev.id') || '').trim();
  const rawScope = getConfig('experiments.jev.scope');
  const rawMode = getConfig('experiments.jev.mode');
  return {
    enabled: getConfig('experiments.jev.enabled'),
    experimentId: rawId || 'jev-v1',
    allocationPercent: clampPercent(getConfig('experiments.jev.allocationPercent')),
    scope: ['all', 'checkpoint_gate', 'compaction_guard'].includes(rawScope)
      ? rawScope : 'checkpoint_gate',
    mode: ['shadow', 'enforce'].includes(rawMode) ? rawMode : 'shadow',
    model: String(getConfig('experiments.jev.model') || 'jev-1.13.0'),
    timeoutMs: getConfig('experiments.jev.timeoutMs'),
    passPercent: getConfig('experiments.jev.passPercent'),
    failPercent: getConfig('experiments.jev.failPercent'),
  };
}

// Existing assignment always wins, including after a config change.  Changing
// the experiment id starts a new experiment only for newly-seen lineages.
export function ensureJevAssignment(record, fallbackKey = '', config = currentJevConfig(), now = Date.now()) {
  const existing = record?.experiment?.jev;
  if (existing?.arm && existing?.lineageRootId) return record;
  if (!config.enabled) return record;

  const lineageRootId = lineageRootFor(record, fallbackKey);
  const bucket = experimentBucket(config.experimentId, lineageRootId);
  const assignment = {
    experimentId: config.experimentId,
    lineageRootId,
    arm: bucket < config.allocationPercent ? JEV_TREATMENT : JEV_CONTROL,
    bucket,
    allocationPercent: config.allocationPercent,
    scope: config.scope,
    mode: config.mode,
    assignedAt: now,
  };
  record.lineageRootId ||= lineageRootId;
  record.experiment = { ...(record.experiment || {}), jev: assignment };
  return record;
}

// Persist the assignment as soon as a task first produces a checkpoint.  A
// stop record may not exist yet, so session records alone are too late to be
// the source of truth for checkpoint-time A/B decisions.
export function ensureJevLineageAssignmentInState(
  state,
  record,
  fallbackKey = '',
  config = currentJevConfig(),
  now = Date.now(),
) {
  state.taskExperiments ||= {};
  const rootTaskId = lineageRootFor(record, fallbackKey);
  const key = taskExperimentKey(rootTaskId);
  const onTask = state.taskExperiments[key];
  const onRecord = record?.experiment?.jev;

  if (onRecord?.arm && onRecord?.lineageRootId) {
    state.taskExperiments[key] ||= structuredClone(onRecord);
    record.lineageRootId ||= onRecord.lineageRootId;
    return onRecord;
  }
  if (onTask?.arm && onTask?.lineageRootId) {
    record.lineageRootId ||= onTask.lineageRootId;
    record.experiment = { ...(record.experiment || {}), jev: structuredClone(onTask) };
    return record.experiment.jev;
  }

  ensureJevAssignment(record, fallbackKey, config, now);
  const assigned = record?.experiment?.jev || null;
  if (assigned) state.taskExperiments[key] = structuredClone(assigned);
  return assigned;
}

export function jevDecision(record, capability) {
  const assignment = record?.experiment?.jev;
  const inScope = assignment?.scope === 'all' || assignment?.scope === capability;
  const selected = assignment?.arm === JEV_TREATMENT && inScope;
  return {
    assigned: Boolean(assignment),
    arm: assignment?.arm || null,
    mode: assignment?.mode || null,
    callModel: Boolean(selected),
    affectBehavior: Boolean(selected && assignment.mode === 'enforce'),
  };
}

export function summarizeJevAssignments(state) {
  const summary = {
    assigned: 0,
    control: 0,
    treatment: 0,
    byExperiment: {},
  };
  const unique = new Map();
  for (const [key, assignment] of Object.entries(state?.taskExperiments || {})) {
    if (!assignment?.arm) continue;
    unique.set(`${assignment.experimentId}\0${assignment.lineageRootId || key}`, assignment);
  }
  for (const [key, record] of Object.entries(state?.sessions || {})) {
    const assignment = record?.experiment?.jev;
    if (!assignment?.arm) continue;
    unique.set(`${assignment.experimentId}\0${assignment.lineageRootId || record.lineageRootId || key}`, assignment);
  }
  for (const assignment of unique.values()) {
    summary.assigned += 1;
    if (assignment.arm === JEV_CONTROL) summary.control += 1;
    if (assignment.arm === JEV_TREATMENT) summary.treatment += 1;
    const id = assignment.experimentId || 'unknown';
    const row = summary.byExperiment[id] ||= { assigned: 0, control: 0, treatment: 0 };
    row.assigned += 1;
    if (assignment.arm === JEV_CONTROL) row.control += 1;
    if (assignment.arm === JEV_TREATMENT) row.treatment += 1;
  }
  return summary;
}

// Durable task context primitives.
//
// There is exactly one model-authored artifact: the checkpoint semantic body.
// A recovery bundle is a deterministic system envelope around a checkpoint;
// it never asks a model to write a second, potentially contradictory summary.

import { createHash } from 'node:crypto';

export const CHECKPOINT_SCHEMA_VERSION = 1;
export const RECOVERY_BUNDLE_SCHEMA_VERSION = 1;
export const MAX_RECOVERY_BUNDLES = 200;

const ARRAY_FIELDS = [
  'confirmed',
  'changes_artifacts',
  'open_issues',
  'verification',
];

function digest(...parts) {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(String(part)).update('\0');
  return hash.digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function text(value, max = 4000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function stringArray(value, { maxItems = 50, maxLength = 2000 } = {}) {
  if (!Array.isArray(value)) return null;
  if (value.length > maxItems) return null;
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const normalized = item.trim().slice(0, maxLength);
    if (normalized) out.push(normalized);
  }
  return out;
}

export function checkpointKey(rootTaskId) {
  return `cp-${digest('checkpoint', rootTaskId).slice(0, 24)}`;
}

export function validateCheckpointSemantic(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['checkpoint must be an object'], semantic: null };
  }
  const goal = text(input.goal);
  const next = text(input.next_responsibility);
  if (!goal) errors.push('goal is required');
  if (!next) errors.push('next_responsibility is required');

  const semantic = {
    goal,
    confirmed: [],
    changes_artifacts: [],
    open_issues: [],
    next_responsibility: next,
    verification: [],
    schema_version: CHECKPOINT_SCHEMA_VERSION,
  };
  for (const field of ARRAY_FIELDS) {
    const normalized = stringArray(input[field]);
    if (normalized === null) errors.push(`${field} must be an array of strings (max 50)`);
    else semantic[field] = normalized;
  }
  if (input.schema_version != null && input.schema_version !== CHECKPOINT_SCHEMA_VERSION) {
    errors.push(`unsupported schema_version ${input.schema_version}`);
  }
  return { ok: errors.length === 0, errors, semantic: errors.length ? null : semantic };
}

function technicalEnvelope(input, now) {
  const createdAt = Number.isFinite(input.createdAt) ? input.createdAt : now;
  return {
    sessionId: text(input.sessionId, 500) || null,
    sourceTurnId: text(input.sourceTurnId, 500) || null,
    cwd: text(input.cwd, 4000) || null,
    worktree: text(input.worktree, 4000) || null,
    model: text(input.model, 500) || null,
    reasoningEffort: text(input.reasoningEffort, 100) || null,
    sandbox: text(input.sandbox, 500) || null,
    permissionsFingerprint: text(input.permissionsFingerprint, 500) || null,
    gitHead: text(input.gitHead, 500) || null,
    workspaceFingerprint: input.workspaceFingerprint ?? null,
    contextTokens: finiteOrNull(input.contextTokens),
    createdAt,
  };
}

export function saveCheckpointInState(state, input, now = Date.now()) {
  const rootTaskId = text(input?.rootTaskId, 1000);
  if (!rootTaskId) throw new Error('unsnooze: checkpoint rootTaskId is required');
  const checked = validateCheckpointSemantic(input.semantic);
  if (!checked.ok) {
    throw new Error(`unsnooze: invalid checkpoint: ${checked.errors.join('; ')}`);
  }
  state.checkpoints ||= {};
  const key = checkpointKey(rootTaskId);
  const previous = state.checkpoints[key];
  const technical = technicalEnvelope(input.technical || {}, now);
  const revision = (previous?.revision || 0) + 1;
  const checkpointId = `checkpoint-${digest(
    rootTaskId,
    revision,
    technical.createdAt,
    canonical(checked.semantic),
  ).slice(0, 24)}`;
  const checkpoint = {
    key,
    checkpointId,
    rootTaskId,
    revision,
    semantic: checked.semantic,
    technical,
    experiment: input.experiment?.jev ? { jev: structuredClone(input.experiment.jev) } : null,
    quality: {
      contentValid: true,
      source: 'schema',
      checkedAt: now,
    },
    freshness: {
      status: 'current',
      currentAt: now,
      staleAt: null,
      staleReason: null,
      staleEvent: null,
    },
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
  };
  state.checkpoints[key] = checkpoint;
  return checkpoint;
}

export function checkpointFor(state, rootTaskId) {
  return state?.checkpoints?.[checkpointKey(rootTaskId)] || null;
}

export function markCheckpointStaleInState(state, rootTaskId, {
  reason = 'material_activity_after_checkpoint',
  event = null,
  expectedCheckpointId = null,
  now = Date.now(),
} = {}) {
  const checkpoint = checkpointFor(state, rootTaskId);
  if (!checkpoint) return { changed: false, checkpoint: null, reason: 'missing' };
  if (expectedCheckpointId && checkpoint.checkpointId !== expectedCheckpointId) {
    return { changed: false, checkpoint, reason: 'superseded' };
  }
  if (checkpoint.freshness?.status === 'stale') {
    return { changed: false, checkpoint, reason: 'already_stale' };
  }
  // The watcher may be a few lines behind while a checkpoint command writes
  // the latest state directly. Never let an older rollout event stale a
  // checkpoint that did not exist when that event happened.
  const checkpointAt = checkpoint.technical?.createdAt ?? checkpoint.freshness?.currentAt;
  if (Number.isFinite(event?.at) && Number.isFinite(checkpointAt) && event.at <= checkpointAt) {
    return { changed: false, checkpoint, reason: 'event_before_checkpoint' };
  }
  checkpoint.freshness = {
    status: 'stale',
    currentAt: checkpoint.freshness?.currentAt ?? null,
    staleAt: now,
    staleReason: text(reason, 500) || 'material_activity_after_checkpoint',
    staleEvent: event && typeof event === 'object' ? {
      type: text(event.type, 200) || null,
      turnId: text(event.turnId, 500) || null,
      at: Number.isFinite(event.at) ? event.at : now,
    } : null,
  };
  return { changed: true, checkpoint, reason: 'marked_stale' };
}

export function assessCheckpoint(state, {
  rootTaskId,
  workspaceFingerprint = undefined,
  latestTurnId = undefined,
  inFlight = false,
} = {}) {
  const checkpoint = checkpointFor(state, rootTaskId);
  const reasons = [];
  if (!checkpoint) {
    return {
      readyForFreshRecovery: false,
      checkpoint: null,
      contentValid: false,
      freshness: 'missing',
      reasons: ['checkpoint_missing'],
    };
  }
  if (!checkpoint.quality?.contentValid) reasons.push('content_invalid');
  if (checkpoint.freshness?.status !== 'current') reasons.push('checkpoint_stale');
  if (inFlight) reasons.push('operation_in_flight');
  const baseline = checkpoint.technical?.workspaceFingerprint;
  if (workspaceFingerprint !== undefined && baseline != null
      && canonical(workspaceFingerprint) !== canonical(baseline)) {
    reasons.push('workspace_changed');
  }
  const sourceTurnId = checkpoint.technical?.sourceTurnId;
  if (latestTurnId !== undefined && sourceTurnId && latestTurnId !== sourceTurnId) {
    reasons.push('newer_turn_observed');
  }
  return {
    readyForFreshRecovery: reasons.length === 0,
    checkpoint,
    contentValid: Boolean(checkpoint.quality?.contentValid),
    freshness: reasons.some(r => r !== 'content_invalid') ? 'stale' : 'current',
    reasons,
  };
}

function rootTaskFor(record) {
  return String(record?.lineageRootId || record?.sessionId || record?.key || 'unknown');
}

function pruneRecoveryBundles(state) {
  const entries = Object.entries(state.recoveryBundles || {});
  if (entries.length <= MAX_RECOVERY_BUNDLES) return;
  entries.sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));
  state.recoveryBundles = Object.fromEntries(entries.slice(0, MAX_RECOVERY_BUNDLES));
}

export function buildRecoveryBundleInState(state, record, now = Date.now()) {
  state.recoveryBundles ||= {};
  const rootTaskId = rootTaskFor(record);
  const episodeAt = record.bannerAt ?? record.detectedAt ?? now;
  const recoveryEpisodeId = `episode-${digest(rootTaskId, episodeAt).slice(0, 24)}`;
  const assessment = assessCheckpoint(state, {
    rootTaskId,
    workspaceFingerprint: record.workspace,
    latestTurnId: record.sourceTurnId,
    inFlight: Boolean(record.operationInFlight),
  });
  const bundleId = `recovery-${digest(rootTaskId, recoveryEpisodeId).slice(0, 24)}`;
  const bundle = {
    bundleId,
    recoveryEpisodeId,
    rootTaskId,
    sourceSessionId: record.sessionId || null,
    checkpointId: assessment.checkpoint?.checkpointId || null,
    experiment: assessment.checkpoint?.experiment || record.experiment || null,
    reason: record.stopReason || 'usage_limit',
    environment: {
      cwd: record.cwd || null,
      worktree: record.worktree || null,
      model: record.model || null,
      reasoningEffort: record.reasoningEffort || null,
      sandbox: record.sandbox || null,
      permissionsFingerprint: record.permissionsFingerprint || null,
      workspaceFingerprint: record.workspace ?? null,
    },
    assessment: {
      contentValid: assessment.contentValid,
      freshness: assessment.freshness,
      reasons: assessment.reasons,
      freshRecoveryCandidate: assessment.readyForFreshRecovery,
    },
    policy: 'hybrid-shadow',
    shadowDecision: assessment.readyForFreshRecovery ? 'fresh_candidate' : 'resume_required',
    actualDecision: 'resume_existing',
    createdAt: now,
    schemaVersion: RECOVERY_BUNDLE_SCHEMA_VERSION,
  };
  state.recoveryBundles[bundleId] = bundle;
  pruneRecoveryBundles(state);
  record.recoveryEpisodeId = recoveryEpisodeId;
  record.recoveryBundleId = bundleId;
  record.freshRecoveryCandidate = assessment.readyForFreshRecovery;
  record.checkpointAssessment = bundle.assessment;
  return bundle;
}

export function summarizeDurableContext(state) {
  const summary = {
    checkpoints: { total: 0, current: 0, stale: 0 },
    recoveries: { total: 0, freshCandidates: 0, resumeRequired: 0 },
    operations: {
      checkpointsSaved: state?.contextTelemetry?.checkpointsSaved || 0,
      checkpointsStaled: state?.contextTelemetry?.checkpointsStaled || 0,
      compactionsObserved: state?.contextTelemetry?.compactionsObserved || 0,
      rejectedEvents: state?.contextTelemetry?.rejectedEvents || 0,
      jevEligible: state?.contextTelemetry?.jevEligible || 0,
      jevQueued: state?.contextTelemetry?.jevQueued || 0,
      jevUnavailable: state?.contextTelemetry?.jevUnavailable || 0,
      jevCompleted: state?.contextTelemetry?.jevCompleted || 0,
      jevErrors: state?.contextTelemetry?.jevErrors || 0,
    },
  };
  for (const checkpoint of Object.values(state?.checkpoints || {})) {
    summary.checkpoints.total += 1;
    if (checkpoint.freshness?.status === 'current') summary.checkpoints.current += 1;
    else summary.checkpoints.stale += 1;
  }
  for (const bundle of Object.values(state?.recoveryBundles || {})) {
    summary.recoveries.total += 1;
    if (bundle.assessment?.freshRecoveryCandidate) summary.recoveries.freshCandidates += 1;
    else summary.recoveries.resumeRequired += 1;
  }
  return summary;
}

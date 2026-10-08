// Locked persistence wrappers around durable-context's pure state mutators.

import { readState, updateState } from './state.js';
import {
  checkpointFor,
  markCheckpointStaleInState,
  saveCheckpointInState,
  summarizeDurableContext,
} from './durable-context.js';
import {
  ensureJevLineageAssignmentInState, jevDecision,
} from './experiments.js';
import { jevApiKeyStatus } from './jev-secret.js';

export function saveCheckpoint(input, now = Date.now()) {
  let saved;
  updateState(state => {
    saved = saveCheckpointInState(state, input, now);
    return state;
  });
  return saved;
}

// The model-facing checkpoint command writes through this path. It mirrors
// the rollout watcher bookkeeping, but does not print the semantic body. The
// caller may queue the returned Jev job after the state lock is released.
export function recordModelCheckpoint(input, now = Date.now()) {
  let result;
  updateState(state => {
    state.contextTelemetry ||= {};
    const rootTaskId = String(input?.rootTaskId || '');
    const lineage = { sessionId: rootTaskId, lineageRootId: rootTaskId, agent: 'codex' };
    const experiment = ensureJevLineageAssignmentInState(
      state, lineage, rootTaskId, undefined, now,
    );
    const checkpoint = saveCheckpointInState(state, {
      ...input,
      experiment: experiment ? { jev: experiment } : null,
    }, now);
    state.contextTelemetry.checkpointsSaved = (state.contextTelemetry.checkpointsSaved || 0) + 1;
    const decision = jevDecision(checkpoint, 'checkpoint_gate');
    let queueJev = false;
    if (decision.callModel) {
      state.contextTelemetry.jevEligible = (state.contextTelemetry.jevEligible || 0) + 1;
      if (jevApiKeyStatus().configured) {
        state.contextTelemetry.jevQueued = (state.contextTelemetry.jevQueued || 0) + 1;
        queueJev = true;
      } else {
        state.contextTelemetry.jevUnavailable = (state.contextTelemetry.jevUnavailable || 0) + 1;
      }
    }
    result = { checkpoint, queueJev };
    return state;
  });
  return result;
}

export function getCheckpoint(rootTaskId) {
  return checkpointFor(readState(), rootTaskId);
}

export function markCheckpointStale(rootTaskId, options = {}) {
  let result;
  updateState(state => {
    result = markCheckpointStaleInState(state, rootTaskId, options);
    return state;
  });
  return result;
}

export function durableContextStatus() {
  return summarizeDurableContext(readState());
}

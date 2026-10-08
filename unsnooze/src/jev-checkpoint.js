// Optional Jev checkpoint judge. Jev is a decision model, not a generator:
// it returns bounded probabilities and never rewrites checkpoint text.

import { readState, updateState } from './state.js';
import { checkpointFor } from './durable-context.js';
import { currentJevConfig, jevDecision } from './experiments.js';
import { resolveJevApiKey } from './jev-secret.js';

const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MAX_EVALUATIONS = 500;

export function checkpointQuestions() {
  return {
    goal_clear: {
      type: 'noul',
      instructions: 'Is `goal` concrete and clear enough to orient continuation of the task?',
    },
    next_step_executable: {
      type: 'noul',
      instructions: 'Is `next_responsibility` a directly executable next step?',
    },
    internally_consistent: {
      type: 'noul',
      instructions: 'Are the checkpoint fields internally consistent, without conflicting claims?',
    },
    sufficient_for_continuation: {
      type: 'noul',
      instructions: 'Does this checkpoint contain enough task state to continue without guessing material facts?',
    },
  };
}

function classify(probabilities, config) {
  const values = Object.values(probabilities);
  const minimum = values.length ? Math.min(...values) : 0;
  const pass = config.passPercent / 100;
  const fail = config.failPercent / 100;
  return {
    verdict: minimum >= pass ? 'pass' : (minimum < fail ? 'fail' : 'review'),
    minimumProbability: minimum,
  };
}

export async function evaluateCheckpointWithJev({
  semantic,
  apiKey = process.env.TYPESAFE_API_KEY,
  endpoint = process.env.TYPESAFE_BASE_URL
    ? (process.env.TYPESAFE_BASE_URL.replace(/\/$/, '').endsWith('/v1/systemone')
      ? process.env.TYPESAFE_BASE_URL.replace(/\/$/, '')
      : `${process.env.TYPESAFE_BASE_URL.replace(/\/$/, '')}/v1/systemone`)
    : DEFAULT_ENDPOINT,
  config = currentJevConfig(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!apiKey) throw new Error('Jev API key is not configured');
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: semantic, model: config.model, questions: checkpointQuestions() }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Jev request failed (${response.status})`);
    const payload = await response.json();
    const probabilities = {};
    for (const id of Object.keys(checkpointQuestions())) {
      const value = Number(payload?.answers?.[id]?.noul);
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(`Jev returned an invalid answer for ${id}`);
      }
      probabilities[id] = value;
    }
    return {
      ...classify(probabilities, config),
      probabilities,
      model: payload.model || config.model,
      usage: payload.usage || null,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

function pruneEvaluations(state) {
  const rows = Object.entries(state.jevEvaluations || {});
  if (rows.length <= MAX_EVALUATIONS) return;
  rows.sort((a, b) => (b[1]?.evaluatedAt || 0) - (a[1]?.evaluatedAt || 0));
  state.jevEvaluations = Object.fromEntries(rows.slice(0, MAX_EVALUATIONS));
}

function persistEvaluation(rootTaskId, checkpointId, evaluation, now = Date.now()) {
  let outcome = 'missing';
  updateState(state => {
    state.jevEvaluations ||= {};
    state.contextTelemetry ||= {};
    const checkpoint = checkpointFor(state, rootTaskId);
    if (!checkpoint || checkpoint.checkpointId !== checkpointId) {
      outcome = 'superseded';
      return state;
    }
    const row = { rootTaskId, checkpointId, ...evaluation, evaluatedAt: now };
    state.jevEvaluations[checkpointId] = row;
    checkpoint.quality.jev = row;
    const assignment = checkpoint.experiment?.jev;
    if (assignment?.mode === 'enforce' && evaluation.status === 'ok'
        && evaluation.verdict === 'fail') {
      checkpoint.quality.contentValid = false;
      checkpoint.quality.source = 'schema+jev';
    }
    state.contextTelemetry.jevCompleted = (state.contextTelemetry.jevCompleted || 0) + 1;
    if (evaluation.status !== 'ok') {
      state.contextTelemetry.jevErrors = (state.contextTelemetry.jevErrors || 0) + 1;
    }
    pruneEvaluations(state);
    outcome = 'stored';
    return state;
  });
  return outcome;
}

export async function runJevCheckpointEvaluation(rootTaskId, checkpointId, deps = {}) {
  const state = readState();
  const checkpoint = checkpointFor(state, rootTaskId);
  if (!checkpoint || checkpoint.checkpointId !== checkpointId) return 'superseded';
  if (!jevDecision(checkpoint, 'checkpoint_gate').callModel) return 'not_selected';
  try {
    const apiKey = Object.hasOwn(deps, 'apiKey') ? deps.apiKey : resolveJevApiKey();
    const result = await evaluateCheckpointWithJev({
      semantic: checkpoint.semantic,
      apiKey,
      endpoint: deps.endpoint,
      config: deps.config,
      fetchImpl: deps.fetchImpl,
    });
    return persistEvaluation(rootTaskId, checkpointId, { status: 'ok', ...result }, deps.now?.() ?? Date.now());
  } catch (error) {
    return persistEvaluation(rootTaskId, checkpointId, {
      status: 'unavailable',
      error: error?.name === 'AbortError' ? 'timeout' : 'request_failed',
    }, deps.now?.() ?? Date.now());
  }
}

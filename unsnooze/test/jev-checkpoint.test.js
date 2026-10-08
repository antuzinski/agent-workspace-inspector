import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = mkdtempSync(join(tmpdir(), 'unsnooze-jev-checkpoint-test-'));
process.env.UNSNOOZE_STATE_DIR = DIR;
process.env.UNSNOOZE_EXPERIMENT_JEV = 'on';
process.env.UNSNOOZE_EXPERIMENT_JEV_PERCENT = '100';
process.env.UNSNOOZE_EXPERIMENT_JEV_SCOPE = 'checkpoint_gate';
process.env.UNSNOOZE_EXPERIMENT_JEV_MODE = 'shadow';
process.env.TYPESAFE_API_KEY = 'test-key';

const { dispatchCodexContextBatch } = await import('../src/watcher.js');
const { readState } = await import('../src/state.js');
const {
  checkpointQuestions,
  evaluateCheckpointWithJev,
  runJevCheckpointEvaluation,
} = await import('../src/jev-checkpoint.js');

after(() => {
  delete process.env.TYPESAFE_API_KEY;
  rmSync(DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

const semantic = {
  goal: 'Validate checkpoint quality',
  confirmed: ['Schema passed'],
  changes_artifacts: ['src/jev-checkpoint.js'],
  open_issues: [],
  next_responsibility: 'Persist the bounded decision',
  verification: ['unit test'],
  schema_version: 1,
};

function response(probability = 0.9) {
  return {
    ok: true,
    async json() {
      return {
        model: 'jev-1.13.0',
        answers: Object.fromEntries(Object.keys(checkpointQuestions()).map(id => [
          id, { type: 'noul', noul: probability },
        ])),
        usage: { input_tokens: 100, output_tokens: 0 },
      };
    },
  };
}

test('Jev request is bounded, typed, and never asks the model to rewrite text', async () => {
  let request;
  const result = await evaluateCheckpointWithJev({
    semantic,
    apiKey: 'secret-test-key',
    config: {
      model: 'jev-1.13.0', timeoutMs: 1000, passPercent: 80, failPercent: 35,
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(0.9);
    },
  });
  const body = JSON.parse(request.options.body);
  assert.equal(body.state.goal, semantic.goal);
  assert.equal(body.model, 'jev-1.13.0');
  assert.deepEqual(Object.keys(body.questions), Object.keys(checkpointQuestions()));
  assert.equal(JSON.stringify(body).includes('repair'), false);
  assert.equal(request.options.headers.Authorization, 'Bearer secret-test-key');
  assert.equal(result.verdict, 'pass');
  assert.equal(result.minimumProbability, 0.9);
});

test('checkpoint treatment queues once and stores a shadow decision', async () => {
  const queued = [];
  assert.equal(dispatchCodexContextBatch([{
    kind: 'checkpoint', semantic, turnId: 'turn-jev', at: 50_000,
    meta: { sessionId: 'jev-task', cwd: DIR },
  }], { queueJev: (...args) => queued.push(args) }), 1);
  assert.equal(queued.length, 1);
  const [rootTaskId, checkpointId] = queued[0];
  const outcome = await runJevCheckpointEvaluation(rootTaskId, checkpointId, {
    apiKey: 'test-key',
    config: {
      model: 'jev-1.13.0', timeoutMs: 1000, passPercent: 80, failPercent: 35,
    },
    fetchImpl: async () => response(0.92),
    now: () => 51_000,
  });
  assert.equal(outcome, 'stored');
  const state = readState();
  assert.equal(state.jevEvaluations[checkpointId].verdict, 'pass');
  assert.equal(state.checkpoints[Object.keys(state.checkpoints)[0]].quality.contentValid, true);
  assert.equal(state.contextTelemetry.jevCompleted, 1);
});

test('network failure is fail-open and recorded without response content', async () => {
  assert.rejects(evaluateCheckpointWithJev({
    semantic,
    apiKey: 'test-key',
    config: {
      model: 'jev-1.13.0', timeoutMs: 1000, passPercent: 80, failPercent: 35,
    },
    fetchImpl: async () => ({ ok: false, status: 503 }),
  }), /Jev request failed \(503\)/);
});

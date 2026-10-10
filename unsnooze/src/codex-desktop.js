// Use the desktop's own tool relay: a second CLI writer cannot resume its chat.
import { connect } from 'node:net';
import { readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { readState, updateState, upsertSession } from './state.js';
import { latestSessionId } from './agents/codex.js';

function pipes() {
  const candidates = [process.env.CODEX_APP_TOOLS_PIPE_PATH];
  if (process.platform === 'win32') {
    try {
      candidates.push(...readdirSync('\\\\.\\pipe\\')
        .filter(name => name.startsWith('codex-browser-use-'))
        .map(name => `\\\\.\\pipe\\${name}`));
    } catch { /* desktop unavailable */ }
  }
  return [...new Set(candidates.filter(Boolean))];
}

function request(pipe, method, params, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let bytes = Buffer.alloc(0), written = false;
    const socket = connect(pipe);
    const finish = (error, result) => {
      clearTimeout(timer); socket.removeAllListeners(); socket.destroy();
      if (error) { error.deliveryUnknown = written && method === 'tools/call'
        && params.tool === 'send_message_to_thread'; reject(error); }
      else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('Codex desktop response timed out')), timeoutMs);
    socket.on('error', error => finish(error));
    socket.on('end', () => finish(new Error('Codex desktop disconnected')));
    socket.on('connect', () => {
      const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
      const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
      written = true; socket.write(Buffer.concat([header, body]));
    });
    socket.on('data', chunk => {
      bytes = Buffer.concat([bytes, chunk]);
      if (bytes.length < 4) return;
      const size = bytes.readUInt32LE(0);
      if (size > 32 * 1024 * 1024) return finish(new Error('Oversized desktop response'));
      if (bytes.length < size + 4) return;
      try {
        const response = JSON.parse(bytes.subarray(4, size + 4));
        if (response.error) return finish(new Error(response.error.message));
        finish(null, response.result);
      } catch (error) { finish(error); }
    });
  });
}

let selectedPipe;
export async function desktopCall(tool, args, caller = args.threadId) {
  if (!/^[0-9a-f-]{36}$/i.test(caller || '')) {
    caller = process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID
      || readState().desktopCallerThreadId || latestSessionId(null);
  }
  if (!caller) throw new Error('No local Codex chat is available for desktop tool context');
  if (!selectedPipe) {
    for (const pipe of pipes()) {
      try {
        const catalog = await request(pipe, 'tools/list', { threadStartKind: 'all' }, 2000);
        if (catalog.tools?.some(t => t.namespace === 'codex_app' && t.name === tool)) {
          selectedPipe = pipe; break;
        }
      } catch { /* stale pipe: discover the running app */ }
    }
    if (!selectedPipe) throw new Error('Codex desktop unavailable; waiting for the app');
  }
  let result;
  try {
    result = await request(selectedPipe, 'tools/call', {
      namespace: 'codex_app', tool, arguments: args, callerSource: 'codex',
      hostId: 'local', threadId: caller, turnId: `mcp-turn-unsnooze-${randomUUID()}`,
      callId: `unsnooze-${randomUUID()}`,
    });
  } catch (error) { selectedPipe = null; throw error; }
  const text = result.contentItems?.filter(item => item.type === 'inputText')
    .map(item => item.text).join('\n') || '';
  if (!result.success) throw new Error(text || 'Codex desktop rejected the request');
  try { return JSON.parse(text); } catch { return { text }; }
}

export function isDesktopRecord(rec) {
  return rec.agent === 'codex' && rec.sessionId && /desktop|codex_app|chatgpt/i.test(rec.origin || '');
}

export function isConnectionError(error) {
  return /network|connection|disconnect|stream.*(?:error|fail)|retry limit|timed? ?out|fetch failed|socket|dns|vpn/i
    .test(typeof error === 'string' ? error : JSON.stringify(error || ''));
}

export function readDesktopThread(threadId) {
  return desktopCall('read_thread', { threadId, turnLimit: 1, includeOutputs: false,
    maxOutputCharsPerItem: 0 });
}

// Remember active turns across sleep/restarts. Only explicit network failures
// become stops; idle, approvals and user cancellations are never restarted.
export async function watchDesktopConnections() {
  const catalog = await desktopCall('list_threads', { limit: 10 },
    process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID || 'unsnooze');
  const threads = [...(catalog.pinnedThreads || []), ...(catalog.threads || [])]
    .filter(t => t.kind === 'codex' && t.hostId === 'local');
  const seenIds = new Set();
  const prior = readState().desktopTurns || {};
  // A chat observed running before sleep may leave the recent-chat list.
  for (const [id, turn] of Object.entries(prior)) {
    if (turn.status === 'inProgress' && !threads.some(thread => thread.id === id)) {
      threads.push({ id, kind: 'codex', hostId: 'local' });
    }
  }
  const results = await Promise.allSettled(threads.filter(t => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id); return true;
  }).map(async thread => ({ thread, snapshot: await readDesktopThread(thread.id) })));
  const observed = {};
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { thread, snapshot } = result.value;
    const turn = snapshot.turns?.[0];
    if (!turn) continue;
    observed[thread.id] = { turnId: turn.id, status: turn.status };
    if (turn.status !== 'failed' || !isConnectionError(turn.error)) continue;
    if (prior[thread.id]?.turnId === turn.id && prior[thread.id].status === 'failed') continue;
    const tracked = Object.values(readState().sessions).find(s => s.sessionId === thread.id);
    if (tracked && ['stopped', 'resuming'].includes(tracked.status)) continue;
    const timestamp = (turn.completedAt || turn.startedAt || 0) * 1000;
    const wasActive = prior[thread.id]?.turnId === turn.id && prior[thread.id].status === 'inProgress';
    if (!wasActive && Date.now() - timestamp > 5 * 60000) continue;
    upsertSession({ agent: 'codex', sessionId: thread.id, cwd: thread.cwd || snapshot.thread?.cwd,
      origin: 'codex_work_desktop', mux: 'headless', pane: null, paneOwner: null,
      status: 'stopped', detectedVia: 'desktop-network', detectedAt: Date.now(),
      bannerAt: timestamp || Date.now(), resetAt: Date.now() + 30000,
      resetSource: 'connection', limitType: 'connection', attempts: 0,
      desktopResume: null, lastError: JSON.stringify(turn.error), lastAttemptAt: null,
    });
  }
  updateState(state => {
    state.desktopTurns = { ...prior, ...observed };
    const caller = process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID || threads[0]?.id;
    if (caller) state.desktopCallerThreadId = caller;
  });
}

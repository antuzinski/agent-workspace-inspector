import { routeHook } from './runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_POLICY = JSON.parse(fs.readFileSync(path.join(HERE, 'context-policy.json'), 'utf8'));
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
const emptyUsage = () => ({ input: 0, uncached: 0, output: 0 });

export function transcriptUsage(file) {
  if (!file || !fs.existsSync(file)) return emptyUsage();
  // Only the tail is needed: counters are cumulative and survive compaction.
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size, length = Math.min(size, 2 * 1024 * 1024);
  const data = Buffer.alloc(length);
  fs.readSync(fd, data, 0, length, size - length); fs.closeSync(fd);
  const lines = data.toString('utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('token_count')) continue;
    try {
      const item = JSON.parse(lines[i]);
      const t = item.type === 'event_msg' && item.payload?.type === 'token_count'
        ? item.payload.info?.total_token_usage : null;
      if (t) return { input: t.input_tokens || 0,
        uncached: Math.max(0, (t.input_tokens || 0) - (t.cached_input_tokens || 0)),
        output: t.output_tokens || 0 };
    } catch { /* A tail can start in the middle of a JSONL record. */ }
  }
  return emptyUsage();
}

function filesBeside(file, ids) {
  if (!file || !fs.existsSync(path.dirname(file))) return [];
  return fs.readdirSync(path.dirname(file)).filter(n => n.endsWith('.jsonl') &&
    ids.some(id => n.includes(id))).map(n => path.join(path.dirname(file), n));
}

export function measure(state) {
  const files = new Set([state.transcript, ...(state.agentPaths || []), ...filesBeside(state.transcript, state.agents || [])].filter(Boolean));
  const sum = emptyUsage();
  for (const file of files) {
    const now = transcriptUsage(file), before = state.baseline?.[file] || emptyUsage();
    for (const k of Object.keys(sum)) sum[k] += Math.max(0, now[k] - before[k]);
  }
  return sum;
}

const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse',
  permissionDecision: 'deny', permissionDecisionReason: `Context guard: ${reason}` } });
const steer = (event, text) => ({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
const normalizedTool = name => String(name || '').split(/__|\./).at(-1);

export function decidePre(payload, state, usage, policy = DEFAULT_POLICY, fileSize = file => fs.statSync(file).size) {
  const tool = normalizedTool(payload.tool_name), input = payload.tool_input || {};
  const command = input.command || input.cmd || '';
  const housekeeping = /(?:unsnooze\.js['"]?\s+checkpoint\s+save|context-guard\.mjs['"]?\s+status)/i.test(command);
  if (!housekeeping && (usage.uncached >= policy.max_uncached_input_per_turn ||
      usage.input >= policy.max_input_per_turn || usage.output >= policy.max_output_per_turn ||
      state.calls >= policy.max_tool_calls_per_turn)) {
    if (!['apply_patch', 'interrupt_agent', 'close_agent'].includes(tool)) return deny(
      `Turn budget reached (new input ${usage.uncached}, total input ${usage.input}, output ${usage.output}, calls ${state.calls}). Save checkpoint and deliver the result already obtained. A new user request can extend the work; do not retry tools to evade this boundary.`);
  }
  if (['spawn_agent', 'Agent'].includes(tool)) {
    if ((state.spawns || 0) >= policy.max_spawns_per_turn) return deny(`Maximum ${policy.max_spawns_per_turn} subagent starts per turn reached.`);
    if (typeof input.message === 'string' && input.message.length > policy.max_brief_chars)
      return deny('Delegation brief exceeds 12000 characters. Send the question, evidence paths and a bounded output, not full transcripts.');
    if (input.fork_turns && input.fork_turns !== 'none' && !state.allowHistory)
      return deny('History inheritance needs explicit human authorization. Use fork_turns=none with a short brief and evidence paths, or ask the human.');
    const next = { ...input, fork_turns: input.fork_turns ?? 'none' };
    // Never replace an explicitly supplied model or a role-bound model.
    if (!input.model && (!input.agent_type || input.agent_type === 'default')) {
      next.model = policy.default_worker_model;
      next.reasoning_effort = input.reasoning_effort || policy.default_worker_effort;
    }
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput: next } };
  }
  if (['Bash', 'exec_command', 'shell'].includes(tool) && command) {
    const reads = /\b(?:Get-Content|gc|type|cat)\b/i.test(command);
    const bounded = /Select-Object\s+-(?:First|Skip)|-TotalCount\s+\d+|-Tail\s+\d+|\bbounded-read\.mjs\b/i.test(command);
    if (reads && !bounded) {
      const matches = [...command.matchAll(/['"]([^'"\r\n]+\.(?:html?|jsonl|log|md|txt|json))['"]/gi)];
      for (const match of matches) {
        const file = path.isAbsolute(match[1]) ? match[1] : path.resolve(payload.cwd || '.', match[1]);
        if (/\b(?:SKILL|AGENTS)\.md$/i.test(file)) continue;
        try { if (fileSize(file) > policy.max_unbounded_file_bytes) return deny(
          `Unbounded read of a file over ${policy.max_unbounded_file_bytes} bytes. Start with bounded-read.mjs overview, then read a section/page. For HTML, inspect script literals separately and raw source only in a selected line range.`); } catch { /* Let the actual tool report a missing file. */ }
      }
    }
  }
  if (usage.uncached >= policy.warn_uncached_input_per_turn && !state.warned)
    return steer('PreToolUse', 'Context guard: 120k new input reached. Stop widening research; finish the current check and integrate existing findings.');
  return {};
}

function locked(dir, key, action) {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, `${key}.lock`), until = Date.now() + 1500;
  let fd;
  while (fd === undefined) {
    try { fd = fs.openSync(lock, 'wx'); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // A hook killed during the write must not disable future calls forever.
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > 10000) { fs.unlinkSync(lock); continue; }
      } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      if (Date.now() >= until) throw new Error('context guard state busy');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15);
    }
  }
  try { return action(); }
  finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

function runContextHook(payload, { policy = DEFAULT_POLICY, stateDir = path.join(HERE, 'state') } = {}) {
  const session = payload.session_id;
  if (!session) return { systemMessage: 'Context guard: hook input lacks session_id; cost accounting unavailable.' };
  return locked(stateDir, hash(session), () => {
    const file = path.join(stateDir, `${hash(session)}.json`);
    let state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    const event = payload.hook_event_name;
    // Only a human prompt resets the budget. Subagent prompts and compaction do not.
    if (!state || (event === 'UserPromptSubmit' && !payload.agent_id)) {
      const transcript = payload.transcript_path || state?.transcript;
      const baseline = {};
      for (const p of new Set([transcript, ...(state?.agentPaths || []), ...filesBeside(transcript, state?.agents || [])].filter(Boolean))) baseline[p] = transcriptUsage(p);
      state = { session, turn: payload.turn_id || 'unknown', transcript, baseline,
        agents: state?.agents || [], agentPaths: state?.agentPaths || [], spawns: 0, calls: 0, warned: false, seen: [],
        allowHistory: /(?:fork_turns\s*=\s*all|inherit (?:the )?(?:full|complete) history|наследуй(?:те)? (?:всю|полную) историю)/i.test(payload.prompt || '') };
    }
    let result = {};
    if (event === 'SubagentStart' && payload.agent_id) {
      if (!state.agents.includes(payload.agent_id)) state.agents.push(payload.agent_id);
      result = steer(event, `Keep this assignment bounded. Return at most ${policy.worker_report_tokens} tokens unless the human explicitly requested a larger artifact. Read only relevant source sections. Do not spawn or repeat common source research. Escalate a missing premise to the root.`);
    } else if (event === 'SubagentStop' && payload.agent_transcript_path) {
      if (!state.agentPaths.includes(payload.agent_transcript_path)) state.agentPaths.push(payload.agent_transcript_path);
    } else if (event === 'UserPromptSubmit' && !payload.agent_id) {
      result = steer(event, 'Cost policy: prepare one evidence packet for parallel review, use fresh worker contexts and short findings. Use bounded-read.mjs for large HTML/logs. Wait for completion events instead of sleep/file polling. Preserve the selected root model.');
    } else if (event === 'PreToolUse') {
      const usage = measure(state);
      result = decidePre(payload, state, usage, policy);
      if (result.hookSpecificOutput?.additionalContext) state.warned = true;
      if (result.hookSpecificOutput?.permissionDecision !== 'deny') {
        const id = payload.tool_use_id || hash(JSON.stringify(payload.tool_input) + Date.now());
        if (!state.seen.includes(id)) {
          state.seen.push(id); state.calls++;
          if (['spawn_agent', 'Agent'].includes(normalizedTool(payload.tool_name))) state.spawns++;
        }
      }
    } else if (event === 'PostToolUse') {
      const text = typeof payload.tool_response === 'string' ? payload.tool_response : JSON.stringify(payload.tool_response || '');
      // Raster/audio data need their native presentation, not a text-file replacement.
      const media = /"type"\s*:\s*"(?:image|audio)"|"(?:image_url|audio_url)"\s*:/.test(text) ||
        /^(?:view_image|imagegen|image_gen|screenshot)$/.test(normalizedTool(payload.tool_name));
      if (!media && text.length > policy.max_tool_result_chars) {
        const output = path.join(stateDir, `output-${hash(`${session}:${payload.tool_use_id || Date.now()}`)}.txt`);
        fs.writeFileSync(output, text, 'utf8');
        result = { decision: 'block', reason: `Context guard saved oversized tool output (${text.length} characters) to ${output}. Read relevant portions with bounded-read.mjs; do not repeat the whole tool call.`,
          hookSpecificOutput: { hookEventName: event, additionalContext: 'The tool completed. Its output was preserved on disk; a small source selection is needed.' } };
      }
    }
    const temporary = file + `.tmp-${process.pid}`;
    fs.writeFileSync(temporary, JSON.stringify(state)); fs.renameSync(temporary, file);
    return result;
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'status') {
    const dir = path.join(HERE, 'state');
    for (const file of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')) : []) {
      const state = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      console.log(JSON.stringify({ session: state.session, turn: state.turn, calls: state.calls, spawns: state.spawns, usage: measure(state) }));
    }
  } else {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { raw += chunk; });
    process.stdin.on('end', () => {
      try { console.log(JSON.stringify(runHook(JSON.parse(raw)))); }
      catch (e) { console.error(`Context guard error: ${e.message}`); process.exitCode = 2; }
    });
  }
}

// BEGIN route integration
export function runHook(payload, options = {}) {
  const guard = runContextHook(payload, options);
  if (guard?.decision === 'block' || guard?.hookSpecificOutput?.permissionDecision === 'deny') return guard;
  const route = routeHook(payload);
  if (route?.hookSpecificOutput?.permissionDecision === 'deny') return route;
  const g = guard?.hookSpecificOutput || {}, r = route?.hookSpecificOutput || {};
  const result = {...guard, ...route};
  if (Object.keys(g).length || Object.keys(r).length) result.hookSpecificOutput = {...g, ...r,
    ...((g.additionalContext || r.additionalContext) ? {additionalContext:[g.additionalContext,r.additionalContext].filter(Boolean).join('\n')} : {})};
  return result;
}
// END route integration

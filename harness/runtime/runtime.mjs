import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const STATE = path.join(HOME, 'harness', 'routes');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const version = '2026-10-10.1';
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const normalize = name => String(name || '').split(/[.:/]+/).at(-1);
const denial = reason => ({hookSpecificOutput:{hookEventName:'PreToolUse', permissionDecision:'deny', permissionDecisionReason:reason}});
const context = (event, text) => ({hookSpecificOutput:{hookEventName:event, additionalContext:text}});
const command = payload => String(payload.tool_input?.command || payload.tool_input?.cmd || '');

function locked(session, fn) {
  if (!session || session.length > 200) throw new Error('A bounded session ID is required');
  fs.mkdirSync(STATE, {recursive:true});
  const file = path.join(STATE, sha(session) + '.json'), lock = file + '.lock';
  const until = Date.now() + 1200;
  let fd;
  while (fd === undefined) {
    try { fd = fs.openSync(lock, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 30000) { fs.unlinkSync(lock); continue; } }
      catch (e) { if (e.code === 'ENOENT') continue; throw e; }
      if (Date.now() >= until) throw new Error('Route state busy; no action authorized by this failure');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    const state = fs.existsSync(file) ? JSON.parse(read(file)) : {session, version, events:[]};
    const result = fn(state);
    state.events = state.events.slice(-1000);
    const tmp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state)); fs.renameSync(tmp, file);
    return result;
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

function record(state, type, fields = {}) {
  state.events.push({at:new Date().toISOString(), type, turn:state.turn || null, version, ...fields});
}

function selections(options) {
  const workflow = options.workflow || 'direct', domain = options.domain || 'none', editorial = options.editorial || 'none';
  if (!['direct','engineering','research'].includes(workflow)) throw new Error('workflow: direct|engineering|research');
  if (!['none','market','strategy','metrics'].includes(domain)) throw new Error('domain: none|market|strategy|metrics');
  if (!['none','ru','en'].includes(editorial)) throw new Error('editorial: none|ru|en');
  const files = [];
  const skill = name => files.push(path.join(HOME, 'skills', name, 'SKILL.md'));
  if (workflow !== 'direct') skill(workflow === 'engineering' ? 'code-workflow' : 'research-workflow');
  if (domain !== 'none') { skill('product-work'); files.push(path.join(HOME,'skills/product-work/references', domain + '.md')); }
  if (editorial !== 'none') { skill('clear-writing'); files.push(path.join(HOME,'skills/clear-writing/references', editorial + '.md')); }
  const extras = (options.extra || '').split(',').filter(Boolean);
  for (const name of new Set(extras)) {
    if (!['decision-review','openai-docs'].includes(name)) throw new Error('Supported extras: decision-review,openai-docs; read other applicable skills normally');
    files.push(path.join(HOME, name === 'openai-docs' ? 'skills/.system' : 'skills', name, 'SKILL.md'));
  }
  return {workflow, domain, editorial, files};
}

function prepare(options) {
  const selected = selections(options);
  if (!options.reason || options.reason.length > 600) throw new Error('Give a concrete routing reason, at most 600 characters');
  if (!options.turn) throw new Error('Use the turn ID supplied by the hook');
  return locked(options.session, state => {
    if (state.turn && state.turn !== options.turn) throw new Error('Stale turn ID; use the latest hook instruction');
    state.turn = options.turn;
    const entries = selected.files.map(file => ({file, text:read(file)}));
    const packet = entries.map(e => `\n### ${e.file}\n${e.text}`).join('');
    if (packet.length > 18000) throw new Error('Packet exceeds 18000 characters; split the work into relevant phases, do not truncate skills');
    const id = crypto.randomUUID();
    state.route = {id, workflow:selected.workflow, domain:selected.domain, editorial:selected.editorial,
      reason:options.reason, files:entries.map(e => ({file:e.file, hash:sha(e.text)})), chars:packet.length,
      delivery:'pending', preparedAt:new Date().toISOString()};
    record(state,'route_prepared',{route:id, workflow:selected.workflow,domain:selected.domain,editorial:selected.editorial,chars:packet.length});
    return `HARNESS_PACKET ${id}\nSelected process: ${selected.workflow}; domain: ${selected.domain}; editorial: ${selected.editorial}.\nFollow these instructions within the active instruction hierarchy. Additional artifact skills remain conditional.\n${packet || 'Direct work: use the standing instructions; no extra skill needed.'}\nHARNESS_PACKET_END ${id}`;
  });
}

function help(state) {
  return `Before tool-backed work, select the lightest process yourself and load its instructions once. Run: & '${process.execPath}' '${path.join(HERE,'runtime.mjs')}' prepare --session '${state.session.replaceAll("'", "''")}' --turn '${state.turn.replaceAll("'", "''")}' --workflow direct|engineering|research --domain none|market|strategy|metrics --editorial none|ru|en --reason 'concrete task and required output'. Optional --extra decision-review,openai-docs. Use editorial only for prose artifacts/editing, not ordinary answers. Change the package only when the task phase changes. This is internal; do not ask the user to choose a mode. A simple answer without tools needs no command.`;
}

function responseText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  // Only model-facing result fields, not echoed input or metadata.
  return [value.output, value.text, ...(Array.isArray(value.content) ? value.content.map(x => x.text) : [])].filter(x => typeof x === 'string').join('\n');
}

export function routeHook(payload) {
  const event = payload.hook_event_name;
  if (!payload.session_id) return {}; // Cannot safely attach observations to an unknown session.
  return locked(payload.session_id, state => {
    const tool = normalize(payload.tool_name), cmd = command(payload);
    if (event === 'UserPromptSubmit' && !payload.agent_id) {
      state.turn = payload.turn_id || crypto.randomUUID(); state.route = null;
      record(state,'human_turn');
      return context(event, help(state));
    }
    if (!state.turn) state.turn = payload.turn_id || crypto.randomUUID();
    // Children inherit a bounded assignment, not the root's package or mutable route state.
    if (payload.agent_id) {
      if (event === 'SubagentStart' || event === 'SubagentStop') record(state,event,{agent:payload.agent_id, role:payload.agent_type || null, model:null});
      return {};
    }
    const bootstrap = /runtime\.mjs['"]?\s+(?:prepare|report|outcome)\b/.test(cmd);
    const checkpoint = /checkpoint\s+save\s+--stdin/.test(cmd);
    const housekeeping = ['interrupt_agent','wait_agent','list_agents','send_message','sleep','curr_time'].includes(tool);
    if (event === 'PreToolUse') {
      if (bootstrap || checkpoint || housekeeping) return {};
      if (!state.route || state.route.delivery !== 'observed') {
        record(state,'gate_denied',{tool,reason:'package_not_delivered'});
        return denial(help(state));
      }
      // Exact selected file versions must still match; never silently use changed instructions.
      if (state.route.files.some(f => !fs.existsSync(f.file) || sha(read(f.file)) !== f.hash)) {
        record(state,'gate_denied',{tool,reason:'package_changed'});
        return denial('Selected instructions changed. Reload the appropriate package with prepare before proceeding.');
      }
      record(state,'tool_requested',{tool,call:payload.tool_use_id || null,route:state.route.id,
        input_hash:sha(JSON.stringify(payload.tool_input || {}))});
    }
    if (event === 'PostToolUse') {
      const result = responseText(payload.tool_response);
      if (bootstrap && state.route && result.includes(`HARNESS_PACKET ${state.route.id}`) && result.includes(`HARNESS_PACKET_END ${state.route.id}`)) {
        state.route.delivery = 'observed';
        record(state,'packet_output_observed',{route:state.route.id,chars:state.route.chars});
      } else if (!bootstrap && !checkpoint) record(state,'tool_returned',{tool,call:payload.tool_use_id || null,chars:result.length,
        measurement:result ? 'selected_text_fields' : 'text_unavailable',success:payload.tool_response?.exit_code === undefined ? null : payload.tool_response.exit_code === 0});
    }
    return {};
  });
}

function report() {
  const files = fs.existsSync(STATE) ? fs.readdirSync(STATE).filter(f => f.endsWith('.json')) : [];
  let turns=0, prepared=0, delivered=0, denied=0, returned=0, chars=0, duplicateInputs=0;
  const outcomes = {}, workflows = {}, models = {};
  for (const name of files) {
    const state=JSON.parse(read(path.join(STATE,name))), seen=new Set();
    for (const e of state.events) {
      if (e.type==='human_turn') turns++;
      if (e.type==='route_prepared') { prepared++; workflows[e.workflow]=(workflows[e.workflow]||0)+1; }
      if (e.type==='packet_output_observed') delivered++;
      if (e.type==='gate_denied') denied++;
      if (e.type==='tool_returned') { returned++; chars+=e.chars; }
      if (e.type==='tool_requested') {const key=e.turn+':'+e.input_hash; if(seen.has(key)) duplicateInputs++; seen.add(key);}
      if (e.type==='outcome') outcomes[e.status]=(outcomes[e.status]||0)+1;
      if (e.model) models[e.model]=(models[e.model]||0)+1;
    }
  }
  return {version, sessions:files.length, human_turns_observed:turns, packages_prepared:prepared, packet_outputs_observed:delivered,
    gates_denied:denied, tool_results_observed:returned, selected_result_chars:chars, repeated_identical_inputs:duplicateInputs,
    workflows,outcomes,actual_models:models, token_usage:null, checkpoint_cost:null,
    limits:['Last 1000 events per session; counts are retained events, not lifetime totals.',
      'Delivery means a packet appeared in tool output; not proof of understanding or compliance.',
      'Repeated inputs are candidates, not proven wasted reads. Outcomes are attributed reports.',
      'Model usage, token billing and recovery outcomes require separate rollout/JEV evidence; missing is not zero.']};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action,...args] = process.argv.slice(2), options={};
    for(let i=0;i<args.length;i+=2) {
      if(!args[i].startsWith('--') || args[i+1]===undefined) throw new Error('Use --key value pairs');
      options[args[i].slice(2)]=args[i+1];
    }
    if(action==='prepare') console.log(prepare(options));
    else if(action==='report') console.log(JSON.stringify(report(),null,2));
    else if(action==='outcome') {
      if(!['completed','needs_correction','blocked'].includes(options.status)) throw new Error('status: completed|needs_correction|blocked');
      if(!options.evidence || options.evidence.length>600) throw new Error('Provide a short evidence reference, at most 600 characters');
      locked(options.session,state=>record(state,'outcome',{status:options.status,evidence:options.evidence,provenance:'agent_report_not_independent_rating'}));
      console.log('Outcome recorded as an attributed report.');
    } else throw new Error('Commands: prepare, report, outcome');
  } catch(error) {console.error(error.message);process.exitCode=1;}
}

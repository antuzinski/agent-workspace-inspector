// Codex rollout watcher: parses lines appended to session rollout files
// (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) into limit-stop candidates.
//
// Codex never persists Error/StreamError events to rollouts (confirmed in
// codex-rs/rollout policy), so the limit banner text is NOT in the file. What
// IS persisted is a token_count event per turn carrying a rate_limits
// snapshot — used_percent per window plus an exact resets_at epoch:
//   {"type":"event_msg","payload":{"type":"token_count","rate_limits":{
//     "primary":{"used_percent":100,"window_minutes":300,"resets_at":1778672230},
//     "secondary":{"used_percent":1,"window_minutes":10080,"resets_at":...},
//     "rate_limit_reached_type":null}}}
// That epoch is more precise than any scraped banner, and rollouts are shared
// by every Codex surface (CLI, IDE extension, desktop app).

import { openSync, readSync, closeSync } from 'node:fs';
import { basename } from 'node:path';
import { ROLLOUT_RE } from '../agents/codex.js';
// Usage extractor lives in usage.js (shared cold path + daemon); re-exported
// here so the plan's watcher surface is the documented import site.
export { extractCodexUsage } from '../usage.js';
// Label from window_minutes (300/10080/43200 → 5h/weekly/30d) — never assume
// 5h/weekly: the go plan's 43200-min window is monthly, and calibration keys
// must not conflate it with the weekly bucket.
import { labelWindow } from '../usage.js';

export const CHECKPOINT_PREFIX = 'UNSNOOZE_CHECKPOINT_V1 ';

function eventTimestamp(entry) {
  const parsed = Date.parse(entry?.timestamp || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function assistantText(payload) {
  if (payload?.type !== 'message' || payload.role !== 'assistant') return '';
  return (Array.isArray(payload.content) ? payload.content : [])
    .filter(part => part?.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n');
}

function checkpointFromText(value) {
  for (const line of String(value || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(CHECKPOINT_PREFIX)) continue;
    try {
      const semantic = JSON.parse(trimmed.slice(CHECKPOINT_PREFIX.length));
      if (semantic && typeof semantic === 'object' && !Array.isArray(semantic)) return semantic;
    } catch { /* malformed checkpoint is ignored and logged by the caller */ }
  }
  return null;
}

function commandStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(part => commandStrings(part, out));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach(part => commandStrings(part, out));
  }
  return out;
}

function isCheckpointSaveCommand(item) {
  if (item?.type !== 'CommandExecution') return false;
  const command = commandStrings([item.command, item.parsed_cmd]).join(' ');
  return /unsnooze(?:\.cmd|\.ps1|\.js)?[\s"']+checkpoint[\s"']+save\b/i.test(command);
}

// Context-lifecycle events are deliberately separate from limit detection.
// They drive checkpoint current/stale state even when no limit occurs.
export function parseCodexContextLine(line) {
  let entry;
  try { entry = JSON.parse(line); } catch { return null; }
  const at = eventTimestamp(entry);
  if (entry?.type === 'event_msg' && entry.payload?.type === 'task_started') {
    return {
      kind: 'turn_started',
      turnId: entry.payload.turn_id || entry.payload.root_turn_id || null,
      at,
    };
  }
  if (entry?.type === 'event_msg' && entry.payload?.type === 'item_completed') {
    const item = entry.payload.item;
    const itemType = item?.type || null;
    // AgentMessage is the completion wrapper for the same assistant message,
    // and Reasoning is private deliberation rather than a task/workspace
    // mutation. Treating either as new activity would instantly stale a
    // checkpoint while the model merely prepares its clean final response.
    if (!itemType || itemType === 'AgentMessage' || itemType === 'Reasoning') return null;
    // `unsnooze checkpoint save` is bookkeeping, not task progress after the
    // checkpoint. The command itself has already stored the new revision.
    if (isCheckpointSaveCommand(item)) return null;
    // Compaction rewrites conversation representation; it does not change the
    // task or workspace state represented by the checkpoint.  Count it for
    // telemetry, but never stale the checkpoint because of compaction alone.
    if (itemType === 'ContextCompaction') {
      return {
        kind: 'compaction_observed',
        turnId: entry.payload.turn_id || null,
        at,
      };
    }
    return {
      kind: 'material_activity',
      activity: itemType,
      turnId: entry.payload.turn_id || null,
      at,
    };
  }
  if (entry?.type === 'response_item') {
    const semantic = checkpointFromText(assistantText(entry.payload));
    if (!semantic) return null;
    return {
      kind: 'checkpoint',
      semantic,
      turnId: entry.payload.internal_chat_message_metadata_passthrough?.turn_id || null,
      at,
    };
  }
  return null;
}

export function parseCodexContextLines(lines) {
  return lines.map(parseCodexContextLine).filter(Boolean);
}

function rolloutSnapshot(line) {
  if (!line || !line.trim()) return null;
  let entry;
  try { entry = JSON.parse(line); } catch { return null; }
  if (entry?.type !== 'event_msg' || entry.payload?.type !== 'token_count') return null;
  const rl = entry.payload.rate_limits;
  if (!rl || typeof rl !== 'object') return null;
  return entry;
}

function emptyPremium(rl) {
  return rl.limit_id === 'premium' && rl.primary === null && rl.secondary === null
    && rl.credits?.has_credits === false && rl.credits?.unlimited === false
    && rl.credits?.balance != null && rl.credits.balance !== ''
    && Number(rl.credits.balance) === 0;
}

// With several exhausted windows, the latest reset governs: resuming at an
// earlier one would immediately hit the other limit again.
function parseSnapshot(entry, previous = null) {
  if (!entry) return null;
  const rl = entry.payload.rate_limits;
  const ts = entry.timestamp ? Date.parse(entry.timestamp) : NaN;

  const windows = ['primary', 'secondary']
    .map(k => rl[k])
    .filter(w => w && typeof w === 'object');
  let binding = null;
  const exhausted = windows.filter(w => (w.used_percent ?? 0) >= 100);
  if (exhausted.length > 0) {
    binding = exhausted.reduce((a, b) => ((b.resets_at || 0) > (a.resets_at || 0) ? b : a));
  } else if (rl.rate_limit_reached_type) {
    const named = rl[rl.rate_limit_reached_type];
    binding = (named && typeof named === 'object')
      ? named
      : windows.reduce((a, b) => ((b.resets_at || 0) > (a?.resets_at || 0) ? b : a), null);
  }
  // #20: Codex can stop at a reported 99%, then emit an empty premium bucket
  // instead of a 100% snapshot. Infer a stop only for that transition,
  // in the same rollout, within a minute, with no credits and a future reset.
  // A lone 99% snapshot or an unrelated premium bucket is not a stop.
  if (!binding && emptyPremium(rl) && previous) {
    const prior = previous.payload.rate_limits;
    const elapsed = ts - Date.parse(previous.timestamp);
    const primary = prior.primary;
    if (prior.limit_id === 'codex' && elapsed >= 0 && elapsed <= 60_000
        && primary?.window_minutes === 300
        && Number.isFinite(primary.used_percent) && primary.used_percent >= 99
        && Number.isFinite(primary.resets_at) && primary.resets_at * 1000 > ts) {
      binding = primary;
      const secondary = prior.secondary;
      if (Number.isFinite(secondary?.used_percent) && secondary.used_percent >= 100
          && Number.isFinite(secondary.resets_at) && secondary.resets_at > binding.resets_at) {
        binding = secondary;
      }
    }
  }
  if (!binding) return null;

  return {
    limitType: labelWindow(binding.window_minutes),
    resetAt: binding.resets_at ? binding.resets_at * 1000 : null,
    reachedType: rl.rate_limit_reached_type || null,
    timestampMs: Number.isFinite(ts) ? ts : null,
  };
}

export function parseRolloutLine(line) {
  return parseSnapshot(rolloutSnapshot(line));
}

// Look immediately before the appended batch, not at the file's current EOF:
// it may have grown since the watcher read it. This also works after restart
// without persisting another cache alongside the watcher's byte offsets.
function previousSnapshot(path, offset) {
  if (!path || !Number.isSafeInteger(offset) || offset <= 0) return null;
  let fd;
  try {
    fd = openSync(path, 'r');
    const length = Math.min(offset, 4 * 1024 * 1024);
    const buf = Buffer.alloc(length);
    const count = readSync(fd, buf, 0, length, offset - length);
    const lines = buf.subarray(0, count).toString('utf-8').split('\n');
    if (offset > length) lines.shift(); // the first line may be truncated
    for (let i = lines.length - 1; i >= 0; i--) {
      const snapshot = rolloutSnapshot(lines[i]);
      if (snapshot) return snapshot;
    }
  } catch { /* missing context means no inferred stop */ }
  finally { if (fd !== undefined) closeSync(fd); }
  return null;
}

export function parseRolloutLines(lines, { path, offset } = {}) {
  let previous;
  const hits = [];
  for (const line of lines) {
    const snapshot = rolloutSnapshot(line);
    if (!snapshot) continue;
    if (previous === undefined && emptyPremium(snapshot.payload.rate_limits)) {
      previous = previousSnapshot(path, offset);
    }
    const hit = parseSnapshot(snapshot, previous);
    if (hit) hits.push(hit);
    previous = snapshot;
  }
  return hits;
}

// The session_meta head line can be very long (it embeds the full base
// instructions) — read in chunks until the first newline.
function readFirstLine(path, maxBytes = 256 * 1024) {
  let fd;
  try {
    fd = openSync(path, 'r');
    const chunk = Buffer.alloc(16 * 1024);
    let head = '';
    let pos = 0;
    while (pos < maxBytes) {
      const n = readSync(fd, chunk, 0, chunk.length, pos);
      if (n <= 0) break;
      head += chunk.toString('utf-8', 0, n);
      pos += n;
      const nl = head.indexOf('\n');
      if (nl !== -1) return head.slice(0, nl);
    }
    return head;
  } catch {
    return '';
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

// Session identity for a rollout file: the session_meta head line when
// parseable, else the uuid embedded in the filename.
export function rolloutMeta(path) {
  let sessionId = null;
  let cwd = null;
  let originator = null;
  try {
    const meta = JSON.parse(readFirstLine(path));
    if (meta?.type === 'session_meta') {
      sessionId = meta.payload?.id || null;
      cwd = meta.payload?.cwd || null;
      originator = meta.payload?.originator || null;
    }
  } catch { /* unreadable head — fall back to the filename */ }
  if (!sessionId) {
    const m = basename(path).match(ROLLOUT_RE);
    if (m) sessionId = m[1];
  }
  return { sessionId, cwd, originator };
}

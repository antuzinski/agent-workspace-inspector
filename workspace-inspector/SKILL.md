---
name: workspace-inspector
description: Audit and improve an OpenAI Codex or Claude Code workspace, including persistent instructions, skills, agents, MCP, hooks, configuration scope, routing, handoffs, checkpoints, verification, and optional telemetry. Use when a user asks to inspect, simplify, validate, or reproduce an agent workspace setup. Inspect first and do not modify configuration unless requested.
metadata:
  short-description: Audit Codex or Claude Code workspaces
---

# Workspace Inspector

Audit the active workspace before recommending or applying changes. Prefer the smallest configuration that produces a reliable, observable workflow.

## Select the platform

Identify the active product from the environment and files. If both Codex and Claude Code are present, audit them separately and label every finding by platform.

- For Codex, read [references/codex.md](references/codex.md).
- For Claude Code, read [references/claude-code.md](references/claude-code.md).
- For the shared inspection and decision method, read [references/audit-method.md](references/audit-method.md).
- Read [references/telemetry.md](references/telemetry.md) only when the user asks about measurement, task completion, routing events, tokens, or ongoing optimization.

Do not infer that a file is active merely because it exists. Establish its scope, discovery path, precedence, and whether the current project is trusted when the platform requires trust.

## Audit outcome

Return a compact evidence table with these states:

- `active`: loaded from the current working directory;
- `shadowed`: valid but overridden by a more specific source;
- `unreachable`: stored where the platform will not discover it;
- `stale`: references a missing plugin, skill, agent, model, hook, or server;
- `duplicate`: repeats another layer without changing behavior;
- `risky`: broad permissions, automatic side effects, secrets, or destructive behavior;
- `unknown`: cannot be verified from available evidence.

Separate:

1. verified facts;
2. likely effects and tradeoffs;
3. recommended changes;
4. optional experiments.

Rank changes as:

- **Required:** fixes broken activation, direct conflicts, unsafe behavior, or invalid configuration.
- **Useful:** removes measurable noise or adds a missing control with a clear benefit.
- **Optional:** preference or experiment without a guaranteed gain.

## Routing baseline

Recommend this only when the workspace benefits from subagents:

- The root agent owns user communication, decisions, integration, and the final result.
- Work directly by default.
- Use a bounded worker only when the unit is independently describable, inputs and expected output are known, architecture is settled, risk is low, verification is objective, and the saved work justifies the handoff.
- Use a critical reviewer only for an important unresolved architecture choice, high-risk or subtle correctness/security issue, unresolved diagnosis, verification failure that changes the diagnosis, or independent review with material consequences.
- Parallelize only independent units.
- Do not create subagent-to-subagent baton chains. Every subagent returns to the root agent, which accepts, reworks, or rejects the result.

Use the platform template only after comparing it with existing rules:

- Codex: [assets/codex/AGENTS.md](assets/codex/AGENTS.md) and [assets/codex/config.toml.example](assets/codex/config.toml.example)
- Claude Code: [assets/claude/CLAUDE.md](assets/claude/CLAUDE.md) and the agents under [assets/claude/agents](assets/claude/agents)

## Work stages

Use stages as decision gates, not mandatory ceremony:

- **C0 — Direct:** outcome, target, risk, and verification are already clear.
- **C1 — Diagnose:** cause or scope is unknown; inspect before mutation.
- **C2 — Implement:** reuse existing mechanisms and make the smallest coherent change.
- **C3 — Verify:** run the narrowest objective check that exercises the change.

Checkpoint only after resolving material uncertainty, before or after delegation, before escalation, on pause/compaction/resume, or around a high-risk decision.

A handoff should contain only:

```text
Goal:
Confirmed:
Changes/artifacts:
Open issues:
Next responsibility:
Verification:
```

## Applying changes

Inspection is read-only. Before mutation:

1. show the exact files and settings that would change;
2. preserve unrelated user configuration;
3. merge rather than replace when an existing file has useful content;
4. avoid installing dependencies, plugins, hooks, or MCP servers unless the user requested them;
5. request authorization before changing user-global configuration or causing external side effects;
6. use platform-native validation and then start a fresh session from the target directory to verify activation.

Do not promise that prompt instructions are enforcement. Use permissions or hooks only when behavior must be deterministic, and explain their additional risk and maintenance cost.

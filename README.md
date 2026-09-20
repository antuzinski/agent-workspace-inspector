# Agent Workspace Inspector

A portable skill for auditing and improving an AI coding workspace in **OpenAI Codex** or **Claude Code**.

It checks persistent instructions, skills, agent definitions, MCP servers, hooks, configuration scope, routing rules, handoffs, checkpoints, verification, and optional telemetry. It then proposes the smallest useful cleanup before changing anything.

The repository contains one cross-platform skill and separate, clearly labeled templates for Codex and Claude Code.

## What it does

- inventories the configuration that can actually load from the current working directory;
- finds stale, duplicate, conflicting, unreachable, or overly broad instructions;
- separates always-on rules from on-demand skills and deterministic hooks;
- recommends direct work, bounded delegation, and critical review gates;
- defines compact handoffs and event-based checkpoints;
- optionally adds lightweight telemetry markers without inventing token counts;
- verifies activation after changes.

It does **not** install MCP servers, enable hooks, overwrite user configuration, or publish data without explicit authorization.

## Install for Codex

Ask Codex to install the skill from:

```text
https://github.com/antuzinski/agent-workspace-inspector/tree/main/workspace-inspector
```

Or copy `workspace-inspector/` to one of these locations:

```text
~/.codex/skills/workspace-inspector/
<repo>/.agents/skills/workspace-inspector/
```

Invoke it with:

```text
$workspace-inspector Audit this Codex workspace and propose the minimum useful changes.
```

## Install for Claude Code

Copy `workspace-inspector/` to one of these locations:

```text
~/.claude/skills/workspace-inspector/
<repo>/.claude/skills/workspace-inspector/
```

Invoke it with:

```text
/workspace-inspector audit this Claude Code workspace and propose the minimum useful changes
```

The shared frontmatter uses only fields supported by both products. Claude-specific agent templates live under `workspace-inspector/assets/claude/`; Codex-specific templates live under `workspace-inspector/assets/codex/`.

## Applying the routing templates

Run the audit first. Then ask the skill to apply either the Codex or Claude template. The templates implement:

1. direct work by default;
2. a bounded worker only for independent, settled, objectively verifiable work;
3. a critical reviewer only for material unresolved risk;
4. no subagent-to-subagent baton chains;
5. handoffs back to the root agent;
6. checkpoints only at real dependency, risk, pause, or delegation boundaries;
7. proportionate verification before completion.

Model names are intentionally not hard-coded. Optional comments show where to select a cheaper worker or stronger reviewer when those models are available in your account.

## Repository layout

```text
workspace-inspector/
├── SKILL.md
├── agents/openai.yaml
├── references/
│   ├── audit-method.md
│   ├── codex.md
│   ├── claude-code.md
│   └── telemetry.md
└── assets/
    ├── codex/
    └── claude/
```

## Safety model

The skill treats inspection as read-only. It distinguishes recommendations from verified facts and asks for authorization before modifying global settings, enabling hooks, connecting MCP servers, or replacing existing policy files. Existing user and project rules are merged carefully rather than overwritten blindly.

## Official references

- [Codex skills](https://developers.openai.com/codex/skills)
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Codex subagents](https://developers.openai.com/codex/subagents)
- [Codex configuration](https://developers.openai.com/codex/config-reference)
- [Claude Code extension overview](https://code.claude.com/docs/en/features-overview)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code directory layout](https://code.claude.com/docs/en/claude-directory)

Documentation links and feature names were checked on 2026-09-20. Both products evolve quickly; the skill requires re-checking official documentation before relying on version-sensitive fields.

## License

MIT

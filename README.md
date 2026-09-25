# Agent Workspace Inspector

A portable skill for auditing and improving an AI coding workspace in **OpenAI Codex** or **Claude Code**.

It checks persistent instructions, skills, agent definitions, MCP servers, hooks, configuration scope, routing rules, handoffs, checkpoints, verification, and optional telemetry. It compares the active setup with the repository's harness and recommends whether to keep, selectively change, merge, or replace it. The harness is a candidate baseline, not an automatic replacement.

The repository contains one cross-platform skill and separate, clearly labeled templates for Codex and Claude Code.

## What it does

- inventories the configuration that can actually load from the current working directory;
- finds stale, duplicate, conflicting, unreachable, or overly broad instructions;
- separates always-on rules from on-demand skills and deterministic hooks;
- recommends direct work, bounded delegation, and critical review gates;
- explains material recommendations using platform documentation, research, local evidence, and clearly labeled inference;
- preserves useful existing requirements when adapting or replacing rules;
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
$workspace-inspector Audit this workspace against the harness in this GitHub repository. Compare keeping, targeted changes, merging, and replacing; explain the choice with evidence and its limits. Apply the best-fit reversible changes, including full replacement if it is genuinely the better fit, while preserving my requirements.
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

## How the audit chooses a path

1. Inspect what is active in the current workspace, not just which files exist.
2. Record the user's goal, constraints, and existing behavior worth preserving.
3. Compare keeping the setup, targeted edits, merging selected harness parts, and replacing the relevant setup.
4. Explain the recommendation, strongest viable alternative, deciding criterion, evidence and its limits, risks, preservation plan, and verification. Link sources for material research and platform claims; label unsupported causal explanations as inference.
5. Apply when the user's request authorizes implementation. A conditional request such as “apply the best fit” or “replace my setup if this harness fits” authorizes choosing the route and making reversible, in-scope changes, including full replacement when justified; do not ask for the same permission again. Ask only for a materially unresolved choice or an irreversible/external action outside the authorization.

The research basis and its limitations are summarized in [`workspace-inspector/references/evidence-basis.md`](workspace-inspector/references/evidence-basis.md). The skill distinguishes platform documentation from studies of effectiveness: supported features do not by themselves prove improved quality, cost, or speed.

## Applying the routing templates

Run the audit and choose the fitting path first. Apply either platform template only after comparing it with the active setup; merge useful existing requirements rather than replacing them blindly. The templates implement:

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

An audit-only request remains read-only. For implementation requests, the skill works within the user's authorized scope and preserves established requirements. It asks for further approval only when a material choice remains unresolved or a destructive or external action is not clearly authorized. Existing user and project rules are merged carefully rather than overwritten blindly.

## Official references

- [Codex skills](https://developers.openai.com/codex/skills)
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Codex subagents](https://developers.openai.com/codex/subagents)
- [Codex configuration](https://developers.openai.com/codex/config-reference)
- [Claude Code extension overview](https://code.claude.com/docs/en/features-overview)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code directory layout](https://code.claude.com/docs/en/claude-directory)

The Codex documentation and research links in the evidence basis were re-checked on 2026-09-25. The Claude Code links and feature names were checked on 2026-09-20. Both products evolve quickly; re-check official documentation before relying on version-sensitive fields.

## License

MIT

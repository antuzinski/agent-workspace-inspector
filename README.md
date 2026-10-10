# Agent Workspace Inspector

A portable skill for auditing and improving an AI coding workspace in **OpenAI Codex** or **Claude Code**.

It checks persistent instructions, skills, agent definitions, MCP servers, hooks, configuration scope, routing rules, handoffs, checkpoints, verification, and optional telemetry. It compares the active setup with the repository's harness and recommends whether to keep, selectively change, merge, or replace it. The harness is a candidate baseline, not an automatic replacement.

The repository contains one cross-platform skill and separate, clearly labeled templates for Codex and Claude Code.

It also includes a [bundled Unsnooze fork](unsnooze/README.md) with durable Codex checkpoints, recovery support, and an optional Jev checkpoint experiment. This is a separate executable component: installing the inspector skill does not install or activate Unsnooze, Jev, or its hooks. The bundled fork retains the [upstream Unsnooze MIT license](unsnooze/LICENSE) and its author's attribution.

## Current harness and component selection

The [current Codex harness snapshot](harness/README.md) includes selective workflow/product/editorial skills, agent definitions and experimental context/route handlers. Read its known conflicts and verification limits before use. The [component catalog](workspace-inspector/references/component-selection.md) explains when to adopt each part or leave it out. Installing the inspector alone does not install these components.

To authorize implementation after reviewing an audit, explicitly ask: “Apply the recommended reversible changes within the listed scope, preserving my existing requirements.”

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

Installing this skill alone does not install MCP servers, enable hooks, apply the optional templates, or configure Unsnooze/Jev. An audit can propose in-scope changes when requested; executable integrations need explicit selection and verification.

To inspect the bundled executable without enabling Jev, install its dependencies from `unsnooze/` with `npm ci`, then run `node bin/unsnooze.js experiment jev status`. The public `npm install -g unsnooze` package is the upstream release and does not contain this fork's checkpoint/Jev changes. See the [fork instructions](unsnooze/README.md) before installing it into an agent environment.

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
$workspace-inspector Audit this workspace against the harness in this GitHub repository. Compare keeping, targeted changes, merging, and replacing; explain the choice with evidence and its limits. Report the recommended components and what to skip, with evidence, dependencies, overhead, activation checks and rollback. Do not change files.
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

The [Claude harness review](CLAUDE_HARNESS_REVIEW_2026-09.md) records compatibility fixes and remaining runtime checks. The optional [Opus 5.5 overlay](workspace-inspector/references/claude-opus-5-5.md) separates model guidance from API integration changes. Shared `AGENTS.md` rules need verified native discovery or an explicit `@AGENTS.md` import; see the [Claude setup guide](workspace-inspector/references/claude-code.md). The templates do not install your local workflow skills.

## Why the inspector does not install hooks

This skill inspects a workspace and recommends changes; it has no action that must run on every session or tool event. Both Codex and Claude Code support hooks, but they execute code and need an event, a failure policy, and activation checks. Native instruction and skill discovery does not need a startup hook. The separate Unsnooze fork implements a Claude `StopFailure` hook for limit recovery; that hook is not installed by this skill. See the [current review](HARNESS_REVIEW_2026-10.md) before adding a hook.

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
unsnooze/
├── bin/ and src/         # executable fork
├── test/                 # regression tests
├── docs/SPEC.ru.md       # design and acceptance criteria
└── LICENSE               # upstream MIT license and attribution
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

The Codex and Claude Code setup and hooks guidance was re-checked on 2026-10-08; see the [current harness review](HARNESS_REVIEW_2026-10.md). Model-specific Opus 5.5 guidance was checked on 2026-09-27. Local CLI versions at review were Codex 0.160.1 and Claude Code 2.1.30; newer documented behavior was not verified in those runtimes. Re-check official documentation before relying on version-sensitive fields.

## License

MIT

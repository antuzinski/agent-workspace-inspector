# Agent Workspace Inspector

Find out which rules and skills your **Codex or Claude Code** needs, what already works, and what is worth changing.

Ask your agent to inspect its setup. It reads the relevant settings, finds conflicts, and explains specific changes. If nothing needs changing, it should say so. Our harness — the rules, skills, and tools that guide an agent — is one option to compare with your current setup.

For example, one rule may require a helper for every task while another says to handle simple tasks directly. The inspector identifies the conflict and suggests a consistent rule. With task history available, it also checks whether the conflict caused problems. Without that evidence, the impact remains a hypothesis.

[Русская версия](README.ru.md)

## Codex and Claude support

| Component | Codex | Claude Code |
|---|---|---|
| Shared inspection skill | Updated | Updated: uses the same skill |
| Platform rules and helper templates | Included | Included; see the [review history](CLAUDE_HARNESS_REVIEW_2026-09.md) |
| Current setup snapshot, October 10, 2026 | Published in [harness](harness/README.md) | A complete port of this snapshot has not been made |
| Automatic instruction selection and context limits | Experimental source; operation on real tasks is not yet confirmed | Port and operation have not been verified |

**The inspector is updated for both platforms. The full current setup is published only for Codex.**

It also includes a [bundled Unsnooze fork](unsnooze/README.md) with durable Codex checkpoints, recovery support, and an optional Jev checkpoint experiment. This is a separate executable component: installing the inspector skill does not install or activate Unsnooze, Jev, or its hooks. The bundled fork retains the [upstream Unsnooze MIT license](unsnooze/LICENSE) and its author's attribution.

## Current harness and component selection

The [current Codex harness snapshot](harness/README.md) includes selective workflow/product/editorial skills, agent definitions and experimental context/route handlers. Read its known conflicts and verification limits before use. The [component catalog](workspace-inspector/references/component-selection.md) explains when to adopt each part or leave it out. Installing the inspector alone does not install these components.

To authorize implementation after reviewing an audit, explicitly ask: “Apply the recommended reversible changes within the listed scope, preserving my existing requirements.”

## What you get

- What already works well and should stay.
- Which problems were found and what supports each finding.
- What to change or install, and what to skip.
- The dependencies and extra work each change adds.
- How to check the result and restore the previous setup.

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
4. Explain the choice, evidence, alternatives, and limits. For example, a helper may speed up independent work but adds context transfer and result integration. State when evidence is missing.
5. Apply changes and agreed checks within your request. If you already authorized those reversible changes, the agent does not need to ask for the same permission again. It asks when a blocking choice or missing authorization remains.

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

The generic templates leave model choice to your environment. The separate current snapshot in `harness/agents/` records our configured model names; check their availability before adopting them.

## Repository layout

```text
harness/                 # current Codex snapshot; not a full Claude port
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

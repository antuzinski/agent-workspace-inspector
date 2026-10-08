# Codex inspection and setup

Use current official OpenAI documentation for version-sensitive fields. Re-checked on 2026-10-08; verify the installed Codex version before relying on hooks or newer configuration keys.

## Discovery map

- Personal persistent instructions: `~/.codex/AGENTS.md` or `AGENTS.override.md`.
- Project instructions: `AGENTS.md` or `AGENTS.override.md` from repository root to the current working directory; nearer files take precedence.
- Personal configuration: `~/.codex/config.toml`.
- Project configuration: `.codex/config.toml`; loaded only for trusted projects.
- Personal skills: `~/.codex/skills/<name>/SKILL.md` and the documented `$HOME/.agents/skills/<name>/SKILL.md` location; inspect what this installation actually discovers.
- Project skills: `.agents/skills/<name>/SKILL.md` along the path from repository root to the current working directory.
- Custom agent definitions: `~/.codex/agents/` or `.codex/agents/`, referenced from `config.toml`.

Keep global instructions personal and reusable. Keep repository rules close to the files they govern. Put repeatable, task-specific procedures in skills rather than expanding `AGENTS.md`.

## Inspection sequence

1. Resolve `CODEX_HOME`, repository root, and current working directory.
2. List the instruction files Codex can discover along that exact path.
3. Inspect user and project `config.toml` separately; flag project keys that Codex ignores at project scope.
4. Inventory discoverable skills and validate every referenced file.
5. Inventory configured agent roles, their config files, model overrides, tools, and instructions.
6. Inspect MCP and hooks, distinguishing configured, trusted, enabled, reachable, and actually used. Codex discovers `hooks.json` or inline `[hooks]` next to active config layers. Project hooks require a trusted project, and non-managed hooks require review of the exact definition before they run. Multiple matching sources are additive. [Codex hooks](https://developers.openai.com/codex/hooks)
7. Search for references to missing plugins, skills, agents, marketplaces, hooks, or model names.
8. Compare the active setup with the shared audit method.

## Applying the templates

Treat the templates as a candidate baseline, not a default replacement. Compare the active setup with the user's goals and constraints; retain useful behavior and merge only the selected changes. For a full replacement, account for every project-specific requirement and verify it afterward.

- Use `assets/codex/AGENTS.md` at user or repository scope for routing and work-stage policy.
- Copy `assets/codex/agents/*.toml` beside the target config under `agents/`.
- Merge the tables from `assets/codex/config.toml.example` into the applicable `config.toml`.
- Leave model lines commented unless the user chooses models that are available to their account.
- Leave hooks absent unless a specific action must happen on a lifecycle event. Do not use `SessionStart` merely to re-inject skills or `AGENTS.md`; native discovery already handles them. If a hook is justified, review its command, input/output contract, timeout, failure mode, platform support, and trust state before enabling it. A hook is executable code, not a stronger wording of an instruction.

If the user asked only for an audit or recommendation, do not mutate configuration. If they asked to apply the appropriate changes, make reversible, in-scope edits without asking for the same authorization again. Ask only when an unresolved choice materially changes the outcome or a destructive/external action is not clearly authorized.

## Verification

- Check TOML syntax with the platform or a TOML parser.
- Validate the skill folder with the current skill validator when available.
- Start a fresh Codex session in the target directory.
- Ask Codex to summarize active instruction sources and routing rules.
- Confirm the skill appears through `/skills` or by mentioning `$workspace-inspector`.
- If custom agents are configured, perform one small bounded delegation and confirm the result returns to the root task.
- If hooks are configured, inspect `/hooks` for source and trust state and exercise the exact event once. A valid config file or hook script alone does not establish activation.

Official references:

- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/guides/best-practices
- https://developers.openai.com/codex/hooks

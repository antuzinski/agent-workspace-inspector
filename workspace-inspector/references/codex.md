# Codex inspection and setup

Use current official OpenAI documentation for version-sensitive fields. The paths and behavior below were checked on 2026-09-20.

## Discovery map

- Personal persistent instructions: `~/.codex/AGENTS.md` or `AGENTS.override.md`.
- Project instructions: `AGENTS.md` or `AGENTS.override.md` from repository root to the current working directory; nearer files take precedence.
- Personal configuration: `~/.codex/config.toml`.
- Project configuration: `.codex/config.toml`; loaded only for trusted projects.
- Personal skills: `~/.codex/skills/<name>/SKILL.md`.
- Project skills: `.agents/skills/<name>/SKILL.md` along the path from repository root to the current working directory.
- Custom agent definitions: `~/.codex/agents/` or `.codex/agents/`, referenced from `config.toml`.

Keep global instructions personal and reusable. Keep repository rules close to the files they govern. Put repeatable, task-specific procedures in skills rather than expanding `AGENTS.md`.

## Inspection sequence

1. Resolve `CODEX_HOME`, repository root, and current working directory.
2. List the instruction files Codex can discover along that exact path.
3. Inspect user and project `config.toml` separately; flag project keys that Codex ignores at project scope.
4. Inventory discoverable skills and validate every referenced file.
5. Inventory configured agent roles, their config files, model overrides, tools, and instructions.
6. Inspect MCP and hooks, distinguishing configured, enabled, reachable, and actually used.
7. Search for references to missing plugins, skills, agents, marketplaces, hooks, or model names.
8. Compare the active setup with the shared audit method.

## Applying the templates

Treat the templates as a candidate baseline, not a default replacement. Compare the active setup with the user's goals and constraints; retain useful behavior and merge only the selected changes. For a full replacement, account for every project-specific requirement and verify it afterward.

- Use `assets/codex/AGENTS.md` at user or repository scope for routing and work-stage policy.
- Copy `assets/codex/agents/*.toml` beside the target config under `agents/`.
- Merge the tables from `assets/codex/config.toml.example` into the applicable `config.toml`.
- Leave model lines commented unless the user chooses models that are available to their account.

If the user asked only for an audit or recommendation, do not mutate configuration. If they asked to apply the appropriate changes, make reversible, in-scope edits without asking for the same authorization again. Ask only when an unresolved choice materially changes the outcome or a destructive/external action is not clearly authorized.

## Verification

- Check TOML syntax with the platform or a TOML parser.
- Validate the skill folder with the current skill validator when available.
- Start a fresh Codex session in the target directory.
- Ask Codex to summarize active instruction sources and routing rules.
- Confirm the skill appears through `/skills` or by mentioning `$workspace-inspector`.
- If custom agents are configured, perform one small bounded delegation and confirm the result returns to the root task.

Official references:

- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/guides/best-practices

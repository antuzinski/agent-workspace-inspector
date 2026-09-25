# Claude Code inspection and setup

Use current official Anthropic documentation for version-sensitive fields. The paths and behavior below were checked on 2026-09-20.

## Discovery map

- Persistent instructions: `CLAUDE.md` at user or project scope; nested files add more specific context.
- Scoped rules: `.claude/rules/*.md` for focused or path-specific guidance.
- Personal settings: `~/.claude/settings.json`.
- Project settings: `.claude/settings.json`; private project overrides belong in `.claude/settings.local.json`.
- Personal skills: `~/.claude/skills/<name>/SKILL.md`.
- Project skills: `.claude/skills/<name>/SKILL.md`.
- Personal subagents: `~/.claude/agents/*.md`.
- Project subagents: `.claude/agents/*.md`.
- Shared project MCP: `.mcp.json`.

Claude Code can also read `AGENTS.md`, but prefer `CLAUDE.md` for a native Claude-only setup. If the repository supports multiple coding agents, keep shared rules in `AGENTS.md` and use a short `CLAUDE.md` only for Claude-specific differences.

## Inspection sequence

1. Resolve `CLAUDE_CONFIG_DIR`, repository root, and current working directory.
2. Inventory `CLAUDE.md`, `.claude/rules`, settings, skills, agents, hooks, plugins, and `.mcp.json` at relevant scopes.
3. Identify additive instructions, duplicate rules, and personal definitions shadowing project definitions of the same skill or agent name.
4. Check skill descriptions, invocation policy, allowed tools, supporting files, and whether a manual-only skill can be preloaded by agents.
5. Check each subagent's tools, model setting, preloaded skills, permissions, memory, and whether its role is distinct.
6. Treat hooks as deterministic code: inspect commands and permissions, not only descriptions.
7. Use `/mcp` and `/context` when available to inspect connection and context costs.

## Applying the templates

Treat the templates as a candidate baseline, not a default replacement. Compare the active setup with the user's goals and constraints; retain useful behavior and merge only the selected changes. For a full replacement, account for every project-specific requirement and verify it afterward.

- Merge `assets/claude/CLAUDE.md` into the appropriate persistent instruction scope.
- Copy `assets/claude/agents/*.md` to `.claude/agents/` or `~/.claude/agents/`.
- The templates use `model: inherit` for portability. Choose a model alias only after confirming availability and cost/quality requirements.
- Do not add hooks or MCP merely to imitate another product. Add them only for a real deterministic action or external data source.

If the user asked only for an audit or recommendation, do not mutate configuration. If they asked to apply the appropriate changes, make reversible, in-scope edits without asking for the same authorization again. Ask only when an unresolved choice materially changes the outcome or a destructive/external action is not clearly authorized.

## Verification

- Run `claude plugin validate` against the skill directory when supported by the installed version.
- Use `/doctor` to inspect configuration and context issues.
- Start a fresh session if a newly created agents directory is not discovered.
- Confirm `/workspace-inspector` appears and loads.
- Use `/agents` and one bounded test delegation to verify the root agent receives the result.
- Use `/tasks` to inspect the actual subagent model when a delegation is running.

Official references:

- https://code.claude.com/docs/en/features-overview
- https://code.claude.com/docs/en/claude-directory
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/memory

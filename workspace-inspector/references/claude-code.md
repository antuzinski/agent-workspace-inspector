# Claude Code inspection and setup

Use current official Anthropic documentation for version-sensitive fields. Re-checked on 2026-10-08; the locally observed CLI was 2.1.30, so recent features need a version check before use. For model-specific guidance, read [claude-opus-5-5.md](claude-opus-5-5.md) only when Opus 5.5 or an API migration is in scope.

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

Native `AGENTS.md` discovery requires v2.1.277+ and the built-in support enabled. By default, a project `CLAUDE.md` or `CLAUDE.local.md` in the working directory or above suppresses that fallback. For shared rules, use an explicit `@AGENTS.md` import in an adjacent `CLAUDE.md`, then add Claude-specific differences. A prose instruction to read the file is not equivalent to an import. Check `/context` and the effective Project instructions setting; do not assume both files load. [Memory documentation](https://code.claude.com/docs/en/memory#when-claude-code-reads-agentsmd)

## Inspection sequence

1. Resolve `CLAUDE_CONFIG_DIR`, repository root, and current working directory.
2. Inventory `CLAUDE.md`, `.claude/rules`, settings, skills, agents, hooks, plugins, and `.mcp.json` at relevant scopes.
3. Resolve precedence separately for instructions, skills, agents, and settings. Project agents override user agents; managed definitions and CLI overrides can outrank them. Do not apply agent precedence to skills or treat additive instruction files as replacements. Check duplicate names and the active definition. [Subagents](https://code.claude.com/docs/en/sub-agents#choose-the-subagent-scope)
4. Check skill descriptions, invocation policy, allowed tools, supporting files, and whether a manual-only skill can be preloaded by agents.
5. Check each subagent's tools, model setting, preloaded skills, permissions, memory, and whether its role is distinct.
6. Treat hooks as executable code: inspect commands, permissions, matchers, timeouts, and failure behavior, not only descriptions. A `Stop` hook fires when a response ends, not necessarily when the task is complete; API errors use `StopFailure`. [Claude hooks](https://code.claude.com/docs/en/hooks-guide)
7. Use `/mcp` and `/context` when available to inspect connection and context costs.
8. Check prompt cache TTL: `promptCacheTtl` (main conversation) and `subagentPromptCacheTtl` (subagents, forks, workflows, compaction), or their env overrides `CLAUDE_CODE_PROMPT_CACHE_TTL` / `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`. Defaults are 5 minutes for subagents on every plan and for the main conversation on API keys, cloud providers and usage credits. Recommend `1h` where agents idle past 5 minutes (waiting on the user, tests, builds); 1h writes cost 2x base input versus 1.25x. Requires v2.1.242+. Verify with `ephemeral_1h_input_tokens` in `usage.cache_creation`. [Prompt caching](https://code.claude.com/docs/en/prompt-caching#cache-lifetime)

## Skills and role boundaries

- Keep our code-workflow, research-workflow, and decision-review guidance on demand, with narrow descriptions. Do not preload all three into every agent or copy their full procedures into `CLAUDE.md`.
- These are conceptual role mappings, not bundled dependencies: use actual installed skill names and verify their supporting files and platform-specific tools. Codex-only tools, paths, and agent names require translation.
- A subagent with an explicit tool list needs `Skill` to invoke skills dynamically. The worker template includes it. The reviewer has file-reading tools plus `Bash` so it can run read-only checks and mark findings `ran/traced`; it has no `Edit`, `Write`, `Skill` or `Agent`. The main conversation supplies relevant skill instructions and acceptance criteria in its assignment.
- The `skills` frontmatter field preloads full instructions. Resolve every name before adding it; manual-only skills (`disable-model-invocation: true`) cannot be preloaded. [Skills](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill), [Subagent skills](https://code.claude.com/docs/en/sub-agents#preload-skills-into-subagents)
- “Never edits” in the reviewer prompt is an instruction, not an enforced property: with `Bash` it could still change files. Where that guarantee matters, remove `Bash` from its tool list and have the main conversation run checks and supply results. The reviewer only reports findings that state location, evidence, violated requirement, trigger conditions and impact; it returns JSON for the main conversation to validate.
- Routing rules apply to built-in agents and forked skills too. Describe our direct-work default as a project policy, not an Anthropic requirement. Do not enable agent teams or mandatory reviews just to match another harness.

## Applying the templates

Treat the templates as a candidate baseline, not a default replacement. Compare the active setup with the user's goals and constraints; retain useful behavior and merge only the selected changes. For a full replacement, account for every project-specific requirement and verify it afterward.

- Merge `assets/claude/CLAUDE.md` into the appropriate persistent instruction scope.
- Copy `assets/claude/agents/*.md` to `.claude/agents/` or `~/.claude/agents/`.
- The templates use `model: inherit` for portability. Choose a model alias only after confirming availability and cost/quality requirements.
- Do not add hooks or MCP merely to imitate another product. Add a hook only for a specific event-bound action that needs deterministic execution and has a tested failure path. Do not add a `SessionStart` hook to duplicate native skill or instruction discovery. Claude's `/hooks` shows the configured hooks; an unrelated Unsnooze `StopFailure` hook is not part of this inspector template.

If the user asked only for an audit or recommendation, do not mutate configuration. If they asked to apply the appropriate changes, make reversible, in-scope edits without asking for the same authorization again. Ask only when an unresolved choice materially changes the outcome or a destructive/external action is not clearly authorized.

## Verification

- Record `claude --version` first. Manifest-free directory validation requires v2.1.233+. After installing the skill at `.claude/skills/workspace-inspector/`, run `claude plugin validate .claude/skills`; from this source repository, run `claude plugin validate workspace-inspector/assets/claude/agents` to check the agent templates. A validator pointed at the standalone source `workspace-inspector/` does not check its root `SKILL.md`; inspect that file's frontmatter separately if it has not been installed. Confirm which files the validator reports. On older versions, inspect frontmatter and links locally and report native validation as unavailable, not passed. [Skill validation](https://code.claude.com/docs/en/skills), [directory validation](https://code.claude.com/docs/en/plugin-marketplaces)
- Use `/doctor` to inspect configuration and context issues.
- Start a fresh session if a newly created agents directory is not discovered.
- Confirm `/workspace-inspector` appears and loads.
- Use `/agents` and one bounded test delegation to verify the root agent receives the result.
- Use `/tasks` to inspect the actual subagent model when a delegation is running.
- A smoke delegation checks discovery and handoff, not effectiveness. If not authorized or not run, mark activation `unknown`. Compare representative tasks before claiming a gain in quality, time, or cost.

Official references:

- https://code.claude.com/docs/en/features-overview
- https://code.claude.com/docs/en/claude-directory
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/memory

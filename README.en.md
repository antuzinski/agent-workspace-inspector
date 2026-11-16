# Agent workspace configuration

Current shared Codex and Claude Code rules and skills, without mandatory audits, telemetry or experimental guards. [Русский](README.md)

- `workspace-inspector/`: application and maintenance skill; the original name remains compatible.
- `harness/AGENTS.md` and `harness/claude/CLAUDE.md`: portable shared rules.
- `harness/skills/`: clear-writing, code-workflow, decision-review, product-work, research-workflow, visual-review-page.
- `harness/agents/`: optional roles; model availability depends on the client.

Clone the full repository and ask the agent to apply selected components using `workspace-inspector/SKILL.md`. Merge rules into the client's instruction file and copy selected skills into its skill directory, preserving existing requirements and saving originals. Installing the inspector alone does not install the payload.

Private client config is not distributed. The local setup has removed custom compaction and tool-output limits, disabled old context-guard/checkpoint-feedback registrations and JEV. Built-in limits still apply. Remove only the old baseline's settings and hooks during migration. Unsnooze recovery remains a separate local tool and is no longer bundled. Built-in skills and plugins remain client-managed.

After authorized local changes run `python scripts/sync-local.py`, then `python scripts/sync-local.py --check`. Use `--codex-home PATH` for another source. Review the diff, validate metadata and references, commit intended changes and push. Six shared skills and portable policies are exported; roles are maintained separately. Explicitly select new skills for publication. Never publish private profiles, credentials, history, backups or analytics.

Synchronization happens during settings work, not through a background watcher. Restore originals or Git history to roll back. Matching files does not prove activation in a fresh client session.

---
name: workspace-inspector
description: Apply or update the maintained shared rules and skills for Codex or Claude Code from agent-workspace-inspector. Use for installing this baseline or synchronizing its GitHub copy with authorized local changes.
metadata:
  short-description: Apply and maintain shared agent rules
---

# Workspace configuration

Source: https://github.com/antuzinski/agent-workspace-inspector
The existing skill name is retained for compatibility. Apply and maintain the current baseline without mandatory audits, analytics or experiments.

Use a full repository checkout: the payload is in `harness/`, alongside this skill. If only the skill directory is installed, obtain the repository when installation is requested. Do not claim missing payloads are installed.

## Apply

Read the selected rules and skills. Merge `harness/AGENTS.md` into Codex instructions or `harness/claude/CLAUDE.md` into Claude instructions. Copy selected folders from `harness/skills/` into the target skill directory. Preserve unrelated settings, project requirements, selected models and user edits; save originals before replacing files.

Do not install runtime guards, telemetry, routing gates, custom output caps, manual compaction thresholds or JEV. When replacing an older version, remove only its configured limits and hook registrations. Existing Unsnooze recovery is separate; do not uninstall it. Optional roles in `harness/agents/` require supported models and explicit delegation, not mandatory routing.

Validate changed files and references. Report applied changes and activation that still needs a fresh session. File presence does not prove activation.

## Maintain

When the owner changes maintained local rules or skills and has authorized publication, run `python scripts/sync-local.py` from the checkout, then `python scripts/sync-local.py --check`. Review the diff and any extra files flagged for explicit removal. The script exports six shared skills and portable policies, never the full client config. Add new shared skills to its allowlist only when their publication is intended. Roles are maintained separately.

Do not publish personal profiles, credentials, trusted paths, session history, backups, diagnostics or plugin caches. Keep machine-specific commands local. Preserve unrelated uncommitted work, commit only intended changes and push the agreed branch without force. Reconcile remote changes before publishing. Report the published commit or a concrete blocker; a local save is not publication.

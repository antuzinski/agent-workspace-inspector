# Repository maintenance

Publish current shared local rules and skills, not an audit framework. Keep analytics, telemetry, runtime guards, manual context/output budgets, private profiles and session data out of releases.

After authorized changes to the maintained local baseline, run `python scripts/sync-local.py` and its `--check` mode, review the diff and references, then commit and push intended changes. Preserve unrelated work; never force-push. Keep portable Codex and Claude rules aligned without personal command paths. The script explicitly lists shared skills. Maintain optional roles separately without mandatory routing or report caps.

Keep project history and recovery records in the parent private workspace, not this public repository. Publish concise usage documentation, not accumulated analysis. Report the actual published commit or exact blocker.

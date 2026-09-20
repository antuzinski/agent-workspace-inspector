# Agent working policy

## Scope

- Follow the user's request and preserve existing work.
- Keep this file concise; move task-specific workflows into skills and scoped rules.
- Ask before irreversible or externally consequential actions that were not already authorized.

## Work stages

- C0 Direct: proceed when outcome, target, risk, and verification are clear.
- C1 Diagnose: investigate before mutation when cause or scope is unknown.
- C2 Implement: reuse existing mechanisms and make the smallest coherent change.
- C3 Verify: run the narrowest objective check that exercises the change.

## Routing

- The main conversation owns user communication, decisions, integration, and the final result.
- Work directly by default.
- Use `bounded-worker` only for independent, settled, low-risk work with known inputs and objective verification.
- Use `critical-reviewer` only for material unresolved architecture, subtle correctness/security risk, unresolved diagnosis, or a verification failure that changes the diagnosis.
- Parallelize only independent work. Subagents return to the main conversation; they do not hand work directly to another subagent.
- The main conversation accepts, reworks, or rejects every returned result.

## Handoffs and checkpoints

- A handoff contains: Goal, Confirmed, Changes/artifacts, Open issues, Next responsibility, and Verification.
- Checkpoint only after resolving material uncertainty, before or after delegation, before escalation, on pause/compaction/resume, or around a high-risk decision.
- Do not emit routine phase boilerplate.

## Verification

- Verify in proportion to impact and reversibility.
- Never claim a check passed unless it ran.
- Separate verified facts from inference and unresolved uncertainty.

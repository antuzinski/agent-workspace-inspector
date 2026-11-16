---
name: code-workflow
description: Engineering workflow for repository exploration, debugging unclear causes, non-trivial implementation, refactoring, multi-file changes, and behavior verification. Tiny explicit reversible edits can be handled directly.
---

# Code workflow

Apply the active project and user instructions. This skill adds engineering guidance; it does not require a routing packet, telemetry or a custom budget.

## C0 - Choose the lightest workflow

- Make a tiny, explicit, reversible edit directly when the target and check are obvious.
- For clear non-trivial work, state a concise plan before editing, then proceed without waiting for approval.
- If the cause, scope, or consequential design choice is unclear, investigate first. Ask only when the answer could materially change the outcome.

## C1 - Diagnose

When cause or scope is unknown, trace the relevant control/data flow and reproduce the issue when practical. Identify the strongest supported cause, affected components and constraints; separate confirmed facts from hypotheses. Checkpoint only when later work materially depends on the conclusion.

## C2 - Implement

Before coding, check whether the requested outcome already exists. Preserve the purpose and invariants of established rules or workflows. Reuse existing code, prefer standard-library or installed dependencies, and make the smallest coherent change that solves the request without weakening required validation, error handling, security, accessibility, or maintainability.

## C3 - Verify

Choose a check that exercises the changed behavior and preserves its relevant invariants. Reuse an existing test when it covers the change; otherwise run or add a focused scenario. For UI changes, exercise the affected user flow; for server/library changes, call the changed path. Run a build when required for the deliverable. Follow the shared reporting rules for results and blockers; do not require duplicate checks merely to satisfy a checklist.

## Conditional guidance

- If a bug's cause remains unclear or an earlier fix failed, read [references/diagnosing-bugs.md](references/diagnosing-bugs.md).
- When splitting substantial implementation across people, agents, or sessions, read [references/task-slicing.md](references/task-slicing.md). A small change needs no task board.
- If recurring ambiguity in domain terms changes behavior, record the agreed meaning and one boundary example in the project's existing documentation. Record a design decision only when it is costly to reverse, its reason would be unclear later, and real alternatives were considered. Include choice, reason, tradeoff and condition for revisiting it; create no glossary or decision log by default.

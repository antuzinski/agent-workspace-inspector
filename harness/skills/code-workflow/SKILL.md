---
name: code-workflow
description: Engineering workflow for repository exploration, debugging unclear causes, non-trivial implementation, refactoring, multi-file changes, and behavior verification. Tiny explicit reversible edits can be handled directly.
---

# Code workflow

Keep the current task, model, and thread. Follow the global scope, authority, delegation, handoff, checkpoint, and telemetry rules in AGENTS.md.

## C0 - Choose the lightest workflow

- Make a tiny, explicit, reversible edit directly when the target and check are obvious.
- For clear non-trivial work, state a concise plan before editing, then proceed without waiting for approval.
- If the cause, scope, or consequential design choice is unclear, investigate first. Ask only when the answer could materially change the outcome.

## C1 - Diagnose

When cause or scope is unknown, trace the relevant control/data flow and reproduce the issue when practical. Identify the strongest supported cause, affected components and constraints; separate confirmed facts from hypotheses. Checkpoint only when later work materially depends on the conclusion.

## C2 - Implement

Before coding, check whether the requested outcome already exists. Preserve the purpose and invariants of established rules or workflows. Reuse existing code, prefer standard-library or installed dependencies, and make the smallest coherent change that solves the request without weakening required validation, error handling, security, accessibility, or maintainability.

### Delegation

Work in the root task by default. Use luna-worker only for a bounded, independent, low-risk unit with clear inputs, ownership, output, and objective verification when expected savings justify the handoff and review. Use sol-reviewer only for the global escalation conditions. Do not pass work agent-to-agent.

### Handoffs and checkpoints

Follow the global AGENTS.md format. Checkpoint only at material uncertainty/dependency boundaries, around delegation/escalation, or before pause, compaction, or transfer. Do not repeat the global telemetry templates here.

## C3 - Verify

Use the narrowest objective check that exercises the change, where applicable. Confirm the requested behavior, scope, preserved invariants, and absence of newly discovered unresolved risks. Existing checks are insufficient when they cannot exercise the changed behavior. After relevant checks pass, stop unless a failure or new risk justifies further work.

## Context budget

Follow the global context/cost policy: bounded document reads, one shared evidence packet, fresh scoped workers and short reports. Do not repeat common source collection or poll for agent progress. At a guard stop, save the result already obtained and finish; do not evade the budget.

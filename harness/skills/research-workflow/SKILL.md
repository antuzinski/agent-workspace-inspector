---
name: research-workflow
description: Evidence-backed workflow for substantive research using multiple or current sources, comparing claims, quantitative or semantic analysis, resolving discrepancies, and synthesis. Skip single simple lookups.
---

# Research workflow

Keep the current task and model. The root/current task owner coordinates and owns final synthesis.

## R0 - Scope

Establish only the question, necessary definitions and scope, evidence standard, exclusions, and completion criteria. Skip this phase when the request is already precise. Record a checkpoint only when a material finding or uncertainty must guide dependent work.

## R1 - Collect

Collect evidence without prematurely writing the conclusion. For important sources, preserve title/author/date/URL, relevant claim and evidence location, source type, and uncertainty where useful.

Delegate a collection batch only when its parts are genuinely independent, inputs and schema are clear, and expected time, quality, or token savings justify the extra setup, context transfer, and review. Item count alone is not a reason to delegate. Keep short or dependent collection in the root task.

## R2 - Analyze

Check definitions, population and denominator, period, units, transformations, source quality, methodology, contradictions, missing evidence, and alternative interpretations. Recompute important numbers with deterministic tools when practical. Checkpoint only when later work materially depends on a settled result.

## R3 - Synthesize

The root synthesizes by default. Use sol-reviewer only when the global escalation criteria apply, such as unresolved contradictory evidence, consequential interpretation, difficult methodology, or a valuable independent review. Supply the checkpoint and critical evidence; do not repeat the whole search without reason.

## R4 - Verify

Verify material claims and calculations; match units, periods, populations, and denominators; prefer primary sources where practical; confirm citations support the claims; address material counterevidence; state unresolved uncertainty; keep conclusions within the evidence.

Outcomes: PASS -> finish; MISSING_EVIDENCE -> collect; ANALYSIS_PROBLEM -> reanalyze; CRITICAL_UNCERTAINTY -> consider sol-reviewer only if the global gate is met.

## Output

The root owns final presentation. Choose a format for the user's use case; use a table or spreadsheet for comparable records only when it materially improves filtering or comparison.

## Context budget

Follow the global context/cost policy: bounded document reads, one shared evidence packet, fresh scoped workers and short reports. Do not repeat common source collection or poll for agent progress. At a guard stop, save the result already obtained and finish; do not evade the budget.

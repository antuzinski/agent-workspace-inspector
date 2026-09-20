# Lightweight telemetry

Telemetry should answer whether the workflow finishes tasks reliably and whether delegation helps. Do not add markers that have no consumer.

## Outcome markers

When a user wants manual outcome tracking, accept an exact standalone completion or stop message. Treat the next substantive user message as a new task segment. Preserve the original timestamp and conversation/thread identity.

Do not interpret ordinary prose containing the word “complete” as an outcome marker.

## Routing events

Prefer native structured events for agent creation and completion. Use assistant markers only for decisions that the runtime does not expose:

```text
TELEMETRY DELEGATION phase=<slug> to=<role>
TELEMETRY HANDOFF phase=<slug> from=<role> result=accepted|rework|rejected
TELEMETRY CHECKPOINT phase=<slug> next=<slug>
TELEMETRY VERIFY phase=<slug> result=pass|fail
```

Emit a line only when the event occurs. Do not emit routine phase boilerplate.

## Minimum useful metrics

- completed, stopped, open, and stale task segments;
- user iterations per completed segment;
- delegations and returned handoffs;
- handoff acceptance, rework, and rejection;
- checkpoint count;
- verification pass and failure count;
- token totals by root, worker, reviewer, and guardian when exact usage exists.

## Counting rules

- Deduplicate repeated rollout or transcript files by logical root session and agent thread.
- For cumulative token records, keep the highest cumulative value for each logical thread rather than summing snapshots.
- Keep historical and live cohorts separate.
- Do not estimate missing token usage.
- Do not compare different tasks as if they were a controlled benchmark.
- A user completion marker confirms acceptance, not objective quality.

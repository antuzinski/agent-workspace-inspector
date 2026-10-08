# Claude Opus 5.5: optional model overlay

Checked 2026-09-27. This is reference material, not an always-on prompt or an installed configuration. Apply only after identifying the model, product, provider, and runtime version. The portable agent templates retain `model: inherit`; the API ID is `claude-opus-5-5`, not a universal Claude Code alias. [Model changes](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5)

## Prompt and orchestration checks

Anthropic recommends starting at `medium` and evaluating effort levels afresh; old effort labels are not equivalent across models. Reserve `xhigh`/`max` for measured gains. In unattended runs, text-only `end_turn` can be a progress report: inspect outstanding work and wait for running tools/agents, with at most two or three automatic continuations before review. Time signals can help multiagent pacing, but an advisory budget is not a timeout. Do not request private reasoning; retain explanations based on evidence. [Opus 5.5 prompting: effort, unattended runs, time signals, safeguards](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)

Our policy: preserve direct work, conditional delegation, proportionate verification, and permission boundaries. Treat time signals as an optional experiment, never a reason to relax correctness. A completion checklist should record accepted output, checks actually run, unresolved blockers, and running jobs. Do not transplant an unattended-loop prompt into an interactive session. Keep deterministic continuation limits in an orchestrator; a `CLAUDE.md` sentence cannot enforce them.

## API-only migration checks

These are integration checks, not settings to paste into `CLAUDE.md`:

| Check | Required handling |
|---|---|
| Thinking | Always adaptive; disabled thinking and manual budgets are rejected. Inspect blocks by type. |
| Forced tools | `tool_choice: any` and named forced tools are rejected; use supported selection and schema validation. |
| History | Thinking is bound to model/history; preserve blocks and avoid rewriting their prefix. Use supported context management for compaction. |
| Progress | Between-tool updates are thinking blocks, empty by default; test display/streaming support in the client. |
| Computer use | Claude API/Google Cloud require the newer toolset; Bedrock differs. |
| Refusal | Handle `stop_reason: refusal` explicitly; HTTP success alone is not task success. |

Source and provider-specific details: [What's new in Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5). Do not implement guessed beta headers or automatic model fallback from this summary; check the linked migration guide and account/provider support first.

## Evaluation before choosing defaults

Compare the current setup with the proposed overlay on the same tasks: a bounded edit, diagnosis with a failing check, source-based research, a long task with interruption/resume, and a reviewer catching a planted defect. Record actual model/version, effort, enabled skills, tools, acceptance result, regressions, human rework, duration, and measured usage/cost when available. Check that refusal, missing input, and pending background work cannot be labeled complete. Report unknown usage instead of estimating it from file size or prompt length.

This is a proposed evaluation, not evidence of a measured gain. No Opus 5.5 session or API migration was executed in this review.

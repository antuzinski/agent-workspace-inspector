# Evidence basis for workspace recommendations

## Purpose and limits

This note helps the workspace audit distinguish supported platform behavior from evidence that a workflow improves outcomes. It does not prove that this repository's harness is best for every workspace. Re-check version-sensitive platform documentation before applying a recommendation.

Sources in this note were checked on 2026-09-25.

## Findings that guide the audit

### Use skills and rules selectively

OpenAI's skill documentation describes staged discovery: the agent sees skill metadata and loads full instructions when the request matches. This supports clear, scoped descriptions and task-specific guidance. It does not show that any particular skill improves a user's results. [OpenAI: Skills](https://developers.openai.com/plugins/concepts/skills)

OpenAI's multi-agent guidance recommends subagents for independent, bounded work and keeping short or dependent tasks with the main agent; it also warns that subagents add token and coordination costs. This supports conditional routing, not mandatory delegation. [OpenAI: Multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)

### Skill benefits depend on the task and setup

SkillsBench and SWE-Skills-Bench evaluate different tasks and methods and report different average effects. SkillsBench reports gains for curated skills on its benchmark while also finding negative task-level deltas. SWE-Skills-Bench reports little average pass-rate change across many public software skills, substantial token overhead in some conditions, and cases where mismatched guidance harms performance. Both are preprints, and neither measures this repository on a user's workspace.

- [SkillsBench (arXiv:2602.12670)](https://arxiv.org/abs/2602.12670)
- [SWE-Skills-Bench (arXiv:2603.15401)](https://arxiv.org/abs/2603.15401)

Together, these results argue against assuming that more skills or a larger harness always helps. They support checking task fit, compatibility with existing project context, and total overhead.

### Evaluate claimed improvements against a baseline

When the user wants evidence that a workflow improves quality, cost, or speed, compare the same representative tasks under the existing and proposed setups. Keep task scope and acceptance criteria comparable. Where available, record task success, required evidence, regressions or rework, total tokens, latency, and cost. OpenAI's deployment checklist likewise recommends comparing task success and resource measures against a baseline. [OpenAI: Deployment checklist](https://developers.openai.com/api/docs/guides/deployment-checklist)

If a paired comparison is unavailable, report the rationale and uncertainty. Do not turn a design rationale, author-reported benchmark, popularity, or a single historical run into a general performance claim.

## Source interpretation

- **Platform documentation** supports claims about discovery, precedence, configuration, and available mechanisms.
- **Empirical studies** support claims only within their tested tasks, models, baselines, and measures. Check whether a paper is a preprint and whether results transfer to the target setup.
- **Project or author reports** describe their own implementation and tests; identify their scope and independence.
- **Local observations** describe the user's workspace and history; distinguish verified state from user-reported experience.
- **Engineering inference** connects observed behavior to a plausible mechanism; label it as inference, not fact.
- **User preference** sets a goal or tradeoff; honor it when feasible rather than debating it as a factual claim.

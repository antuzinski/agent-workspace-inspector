# Shared audit method

## 1. Establish scope

Record:

- product and version when available;
- operating system;
- current working directory and repository root;
- the user's goals, constraints, and what should count as success;
- personal, project, nested, managed, and plugin configuration locations;
- whether the user wants inspection only or also implementation.

Do not scan unrelated home-directory content. Read only known configuration locations and files needed to resolve precedence or references.

## 2. Inventory layers

Inspect these categories separately:

| Layer | Questions |
|---|---|
| Persistent instructions | Is it loaded? Is it concise? Is the rule truly always-on? Does a nearer file conflict? |
| Skills | Is the description discriminating? Does it duplicate another skill? Are referenced resources present? |
| Agents | Is each role materially distinct? Are tools and permissions proportional? Is the handoff explicit? |
| Configuration | Are model, reasoning, sandbox, approvals, trust, and project overrides valid at this scope? |
| MCP | Is external, changing context actually needed? Are unused servers adding cost or attack surface? |
| Hooks | Is deterministic enforcement required? Are commands reviewable, scoped, and safe? |
| Telemetry | Are events and outcomes observable without double counting or invented values? |

## 3. Test activation, not existence

For each item, identify:

- discovery root;
- load timing;
- precedence or merge behavior;
- current activation status;
- evidence used to reach the conclusion.

Restart or start a fresh session when the platform loads configuration only at session start.

## 4. Check context hygiene

Move content out of always-on instructions when it is:

- task-specific;
- long reference material;
- a temporary decision or conversation transcript;
- an operational checklist invoked only sometimes;
- duplicated in a skill or deterministic tool.

Keep always-on files focused on durable scope, safety boundaries, routing, required verification, and project conventions.

## 5. Check routing economics

Delegation is useful only when isolated context or parallelism is worth its extra tokens and coordination. Reject delegation when the task is small, tightly coupled, ambiguous, high-risk, or cheaper to complete directly.

Require the root agent to integrate every result. A returned subagent result is evidence, not automatic acceptance.

## 6. Compare improvement paths

Before recommending this repository's harness, compare these paths:

1. keep the current setup;
2. make targeted changes;
3. merge or adapt selected parts of this harness;
4. replace the relevant setup with this harness.

Use the same criteria for every plausible path: fit to the user's goal, coverage of required behavior, active scope and platform compatibility, context and coordination overhead, safety and permissions, maintenance, reversibility, and verification. Record useful existing behavior and project-specific requirements as invariants. A full replacement must account for each invariant; preserve it, adapt it, or identify it as intentionally retired. Do not assume the template is superior because it is newer or more consistent.

For workflow and effectiveness claims, read [evidence-basis.md](evidence-basis.md). Separate supported platform behavior from measured outcomes, author-reported results, local observations, engineering inference, and preferences. Cite the specific source next to each material research or documentation claim; briefly state its scope and limitations. Use current primary sources when version-sensitive behavior matters. If results are inconclusive, say so and recommend a small, reversible change or a comparison on representative tasks rather than asserting a benefit.

## 7. Report minimum actions

Lead with actions that have a predictable benefit without an A/B experiment:

1. delete stale references and unreachable configuration;
2. resolve direct conflicts and invalid paths;
3. move task-specific material out of always-on files;
4. add missing verification or permission boundaries;
5. add routing only if there is recurring delegable work;
6. leave model tuning and stylistic preferences as optional.

For each material recommendation state the chosen path, strongest viable alternative, deciding criterion, expected effect, evidence and its limits, scope, requirements to preserve, reversibility, confidence, and verification method. Keep the report compact for routine audits.

# Choose components from a demonstrated need

Current source: [harness/](https://github.com/antuzinski/agent-workspace-inspector/tree/main/harness). Pin the commit used in an audit. This catalog belongs to the inspector so it remains available when installed independently. Read candidate instructions only after selecting a plausible component.

| Component | Consider when | Skip when | Dependencies / cost / limits |
|---|---|---|---|
| `harness/AGENTS.md` | Existing durable rules lack scope, clarity, selective reading or ownership | Equivalent rules already work | Merge selected sections; full copy adds permanent context and can conflict. Machine-specific checkpoint command is excluded. |
| `skills/code-workflow` | Nontrivial code work needs diagnosis and narrow verification | Tiny known edit or equivalent process exists | Requires compatible global rules; no mandatory reviewer or extra tests. |
| `skills/research-workflow` | Multiple sources, comparisons or uncertain claims | Simple lookup | Source collection takes time; citations do not establish causal effectiveness. |
| `skills/decision-review` | Consequential choice needs fair alternatives and counterevidence | Routine execution | Extra analysis only at a material decision. |
| `skills/product-work` | Market/competitors, strategy, metrics/economics | No product question | Load one relevant reference; real data still required. Pair with research only when evidence collection is needed. |
| `skills/clear-writing` | Drafting or revising prose | Ordinary conversational answer | Load ru or en; global clarity rules suffice for chat. Preserve uncertainty and voice. |
| `agents/luna-worker.toml` | Repeated independent low-risk units justify handoff | Coupled, small or underspecified task | Model and role availability must be observed; setup and root review have costs. |
| `agents/astra-architect.toml` | Architecture or consequential uncertainty meets global gate | Routine review or merely long task | Optional available model; never silently substitute. Root remains coordinator. |
| `agents/sol-reviewer.toml` | A separate critical review is requested or justified | Review duplicates settled work | Historical role uses its own model; do not mistake it for the default Astra gate. |
| `runtime/bounded-read.mjs` | Large HTML/log output obscures relevant sections | Small files, or visual interpretation needed | Node.js; text extraction misses dynamic behavior and layout. |
| `runtime/runtime.mjs`, `context-guard.mjs`, `context-policy.json` | Repeated context overruns warrant an experimental gate | Ordinary skill discovery is enough | Host hook adapter and session events required; extra reads, state and denial risk. Not a security boundary or measured saving. |
| `unsnooze/` | Work needs durable checkpoints and recovery | Short tasks with no recovery need | Separate executable/install and host integration; checkpoint presence does not prove restoration. Jev optional, off by default. |

## Required recommendation record

For each material component, state:

1. User problem and source evidence; if absent, say unknown.
2. Keep / patch / merge / replace, exact files and useful behavior to preserve.
3. Why this component beats the strongest simpler alternative, or why to skip it.
4. Dependencies, context/coordination overhead and known limitations.
5. Expected benefit as a hypothesis unless measured; confidence and contrary evidence.
6. Observable activation and outcome checks within authorization, plus rollback.

Example: repeated research requests need market evidence, but no independent work exists. Recommend the market reference and research workflow only if their behavior is missing. Skip worker roles, router hooks and Jev. Verify a normal subsequent research task cites matching evidence; do not equate loading the skill with a good conclusion.

Do not automatically install every component. Existing equivalent tools win when migration adds overhead without a demonstrated benefit. Report exported known conflicts before proposing deployment; see the harness README.

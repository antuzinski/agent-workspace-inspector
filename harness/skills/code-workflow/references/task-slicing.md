# Split implementation into useful results

Use this when substantial work needs separate owners or sessions. Reuse the existing plan or tracker. Do not create external tickets or delegate merely because this reference is loaded.

Prefer a slice that delivers observable behavior end to end: “a user saves and reopens a draft”, rather than separate database and interface tasks that cannot demonstrate the outcome. For a broad mechanical migration, an expand → migrate → remove-old-path sequence may preserve compatibility better.

For each necessary task record:

- **Outcome:** the useful change and its boundary.
- **Done when:** observable acceptance criteria; distinguish inspection from tests that need authorization.
- **Dependencies:** actual prerequisites, or none. Avoid invented ordering between independent tasks.
- **Handoff:** the responsible owner, affected files/components, and only the evidence needed to start.

Keep shared invariants and integration ownership in the parent plan. Adjust task size to uncertainty and a coherent result; do not promise a task fits a model context window. Do not require preliminary refactoring, a new tracker, repeated approvals, or an agent for every slice.

Adapted from [Matt Pocock's to-tickets](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/to-tickets/SKILL.md).

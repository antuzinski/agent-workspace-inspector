# Diagnose a difficult bug

Describe the observed symptom, expected behavior, and the smallest observation that distinguishes them. Derive the expectation from the requirement or an independent example, not from the code being repaired.

Use existing logs, inputs and control flow to separate facts from hypotheses. Rank only plausible causes that would change the next action; there is no required number. For each useful hypothesis, identify an observation that would support or disprove it. Prefer a narrow probe that changes one factor and returns a bounded result.

Reproduce when practical and within the user's authorization. Run tests only when testing or verification is requested. If reproduction is unavailable, record the missing input and continue with the evidence available; do not call an unconfirmed cause established. Ask for information only when it blocks a meaningful next step.

Choose the smallest fix supported by the evidence. For a requested verification, check the original symptom and the nearest affected invariant. Remove temporary instrumentation unless it is useful, safe to retain, and within scope.

Stop when the symptom is resolved by the relevant check, or when a specific missing dependency prevents further progress. A failed probe should change the hypothesis or next observation; do not repeat or broaden investigation without a question that could change the result.

Adapted from [Matt Pocock's diagnosing-bugs](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/diagnosing-bugs/SKILL.md).

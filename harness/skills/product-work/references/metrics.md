# Metrics and cohort economics

Define each decision-relevant metric precisely: what is counted, eligible population, event or denominator, time window, data source, and owner when known. State the target and date only when supplied or justified. Add a guardrail when a target could be improved by degrading another important outcome; do not invent an obligatory “anti-metric.” Distinguish correlation from causal evidence.

For cohorts, use a stable cohort unit and period (for example, accounts acquired in a month), and compare like-for-like ages and windows. State inclusion rules, sample size, and censoring or incomplete observation where relevant. Do not compare a mature cohort with a partially observed one as if both were complete.

Use explicit formulas with the user's actual definitions. Common forms include:

- **Gross profit per customer-period** = revenue per customer-period − allocated cost of goods or services sold per customer-period. Specify the accounting allocation; this is not necessarily the same as variable cost.
- **Contribution margin** = (revenue − variable costs) / revenue.
- **CAC** = acquisition spend attributable to a cohort / new customers acquired in that cohort.
- **Cohort contribution** over horizon *H* = sum of cohort revenue through *H* − sum of attributable variable and acquisition costs through *H*.
- **Payback time** = first period when cumulative cohort contribution after acquisition cost is nonnegative; interpolate only if the data supports it.

These are definitions to adapt, not assumptions that every business should use the same cost allocation. Specify currency, time basis, and whether values are per user, account, order, or another unit. Show inputs and arithmetic; separate observed values from modeled assumptions. If data is missing, leave the result unknown or show a clearly labeled scenario without fabricated values. Avoid lifetime-value precision when retention, margin, or observation horizon does not support it.

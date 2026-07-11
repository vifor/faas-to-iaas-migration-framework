# Comparative Performance Report Generation Prompt

## Context

You are a performance engineer generating the comparative results report for a FaaS-to-IaaS migration (Phase 4 of the migration framework). Load tests have already been executed with k6 against both environments, and the raw NDJSON exports (`k6 run --out json`) are committed at the repository root. Your job is to produce the report tables and narrative — **not** to re-run the tests.

## Ground Rules (non-negotiable)

1. **Every numeric figure must come from the analysis script.** For each raw export, run:

   ```
   node scripts/analyze-k6-results.js <export>.json
   ```

   and use its printed output **verbatim**: total requests, failed requests, actual test duration, average RPS, error rate, and p50/p90/p95/p99 latencies.

2. **Never take figures from memory, from earlier documents, or from partial data.** Existing reports may predate the current exports. If a figure you are about to write does not appear in the script output you just produced, do not write it.

3. **Report the actual test duration** printed by the script for each run. RPS is defined as total requests divided by that actual duration — never by a nominal or planned duration.

4. **Derived values are recomputed, not copied.** Any ratio or percentage (e.g., "IaaS handled X% more throughput", "IaaS p95 is Nx faster") must be calculated from the script outputs in the same session, and the calculation must be reproducible from the tables shown.

5. **Only compare like with like.** Cross-environment comparison tables may only pair runs with the same VU level and load profile. If an environment lacks a run at some VU level (e.g., aborted due to throttling), say so explicitly instead of filling the cell.

6. **Formatting must be sober and publication-ready:** plain text or standard markdown tables only; no emoji or decorative symbols. Use "Cumple" / "No cumple" for SLA verdicts and "Equivalente" / "Divergente" for equivalence assessments.

## Inputs

- Raw k6 exports at the repository root (e.g., `faas-3vu-results.json`, `iaas-3vu-results.json`, `iaas-10vu-results.json`, `iaas-20vu-results.json`)
- `scripts/analyze-k6-results.js` (metric derivation)
- Functional test outputs under `test-results/` (for the functional-equivalence tables only)

## Required Outputs

### 1. Per-run summary table (one per export)

| Metric | Value |
|---|---|
| Total Requests | _from script_ |
| Failed Requests | _from script_ |
| Actual test duration | _from script_ |
| RPS (average) | _from script_ |
| Error Rate | _from script_ |
| p50 / p90 / p95 / p99 | _from script_ |
| SLA Verdict | _from script_ |

### 2. FaaS vs IaaS comparative table (matched VU level)

| Métrica | FaaS N VUs | IaaS N VUs | Diferencia |
|---|---|---|---|

The "Diferencia" column states the recomputed ratio or percentage and its direction. Include error rate, throttling observed (yes/no), and SLA verdict rows.

### 3. Functional equivalence tables

Field-by-field comparison per endpoint (FaaS response vs IaaS response), sourced from the functional test outputs. Fields present in only one environment are marked as additional, with an assessment of whether they break equivalence for existing clients.

### 4. Narrative

Brief analysis referencing only figures present in the tables above. State explicitly which VU levels were executed on each environment and why any level is missing.

## Self-check Before Delivering

- [ ] Every number in the report appears in a script output produced in this session
- [ ] Actual durations are stated and were used as the RPS divisor
- [ ] All ratios/percentages recompute correctly from the table values
- [ ] No comparison cell mixes different VU levels or load profiles
- [ ] Missing runs are declared, not interpolated

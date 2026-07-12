# FaaS EP1 Load Test Results - 20 VUs
**Date:** 2026-07-10
**Endpoint:** GET /admin/store/store-001
**Environment:** FaaS (AWS Lambda + API Gateway)
**Region:** sa-east-1
**Virtual Users:** 20 VUs

## Preconditions
Same as the 10 VU run (see faas-ep1-load-test-10vu-2026-07-10.md): account Lambda concurrency limit raised 10 -> 1000 (permanent), usage plan daily quota temporarily raised 1000 -> 50000 requests/day and restored afterwards.

## Test Configuration
- **Base URL:** https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main
- **Authentication:** API Key (x-api-key header)
- **Load Profile** (mirrors the IaaS 20 VU test):
  - Ramp up: 0 -> 20 VUs over 1 minute
  - Steady state: 20 VUs for 3 minutes
  - Ramp down: 20 -> 0 VUs over 1 minute
- **Test script:** scripts/load-testing/faas-ep1-load-test-20vu.js

## Results Summary

| Metric | Value |
|--------|-------|
| Total Requests | 4,314 |
| Failed Requests | 0 |
| Actual test duration | 300.6s |
| RPS (average) | 14.35 |
| Error Rate | 0.00% |

RPS is computed as total requests divided by the actual test duration recorded in the raw k6 export.

### Response Time Metrics
| Percentile | Value |
|------------|-------|
| p50 (median) | 116.48ms |
| p90 | 167.75ms |
| p95 | 190.45ms |
| p99 | 265.68ms |

## Key Findings
1. No throttling: zero HTTP 429 responses at the highest load level tested.
2. Latency continued to improve with load (p95: 322.92ms at 3 VUs, 228.94ms at 10 VUs, 190.45ms at 20 VUs), consistent with a higher proportion of warm Lambda invocations under sustained traffic.
3. Linear throughput scaling: doubling VUs from 10 to 20 roughly doubled throughput (RPS 7.08 -> 14.35).

## SLA Compliance
- p95 < 3000ms: Cumple (190.45ms)
- Error rate < 5%: Cumple (0.00%)
- Overall SLA Verdict: Cumple

## Comparison Reference
IaaS at the same VU level and load profile (2026-05-17 run): 4,613 requests, RPS 15.35, p95 70.86ms. IaaS delivered ~7% more throughput and ~2.7x lower p95 latency. The FaaS/IaaS latency gap narrows as load increases (5.0x at 3 VUs, 3.6x at 10 VUs, 2.7x at 20 VUs). Note the runs are from different dates (validity consideration: same endpoints, profiles and client network).

## Raw Data
- **Results file:** faas-20vu-results.json (repository root)
- **Analysis:** node scripts/analyze-k6-results.js faas-20vu-results.json

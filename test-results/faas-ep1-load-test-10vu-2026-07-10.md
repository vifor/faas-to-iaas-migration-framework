# FaaS EP1 Load Test Results - 10 VUs
**Date:** 2026-07-10
**Endpoint:** GET /admin/store/store-001
**Environment:** FaaS (AWS Lambda + API Gateway)
**Region:** sa-east-1
**Virtual Users:** 10 VUs

## Preconditions
This test level had previously aborted with HTTP 429 (2026-05, see faas-ep1-load-test-3vu-2026-05-19.md). Two limits were identified and raised before this run:
- AWS account Lambda concurrency limit: 10 -> 1000 concurrent executions (permanent, via AWS support request).
- API Gateway usage plan daily quota: 1000 -> 50000 requests/day (temporary, restored to 1000/day after the tests).

## Test Configuration
- **Base URL:** https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main
- **Authentication:** API Key (x-api-key header)
- **Load Profile** (mirrors the IaaS 10 VU test):
  - Ramp up: 0 -> 10 VUs over 1 minute
  - Steady state: 10 VUs for 3 minutes
  - Ramp down: 10 -> 0 VUs over 1 minute
- **Test script:** scripts/load-testing/faas-ep1-load-test-10vu.js

## Results Summary

| Metric | Value |
|--------|-------|
| Total Requests | 2,124 |
| Failed Requests | 0 |
| Actual test duration | 299.9s |
| RPS (average) | 7.08 |
| Error Rate | 0.00% |

RPS is computed as total requests divided by the actual test duration recorded in the raw k6 export.

### Response Time Metrics
| Percentile | Value |
|------------|-------|
| p50 (median) | 140.32ms |
| p90 | 202.65ms |
| p95 | 228.94ms |
| p99 | 304.23ms |

## Key Findings
1. No throttling: zero HTTP 429 responses across the full run, confirming the May failures were caused by the account/usage-plan limits, not by the application.
2. Latency improved versus the 3 VU baseline (p95 228.94ms vs 322.92ms): under sustained load, warm Lambda containers reduce the proportional impact of cold starts.
3. Near-linear throughput scaling versus 3 VUs (RPS 7.08 vs 2.24).

## SLA Compliance
- p95 < 3000ms: Cumple (228.94ms)
- Error rate < 5%: Cumple (0.00%)
- Overall SLA Verdict: Cumple

## Comparison Reference
IaaS at the same VU level and load profile (2026-05-17 run): 2,327 requests, RPS 7.74, p95 63.84ms. IaaS delivered ~9% more throughput and ~3.6x lower p95 latency. Note the runs are from different dates (validity consideration: same endpoints, profiles and client network).

## Raw Data
- **Results file:** faas-10vu-results.json (repository root)
- **Analysis:** node scripts/analyze-k6-results.js faas-10vu-results.json

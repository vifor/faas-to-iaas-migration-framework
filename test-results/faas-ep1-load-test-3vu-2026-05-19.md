# FaaS EP1 Load Test Results - 3 VUs
**Date:** 2026-05-19  
**Test Duration:** ~4 minutes (30s ramp-up + 3min steady + 30s ramp-down)  
**Endpoint:** GET /admin/store/store-001  
**Environment:** FaaS (AWS Lambda + API Gateway)  
**Region:** sa-east-1  
**Virtual Users:** 3 VUs  

## Test Configuration
- **Base URL:** https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main
- **Authentication:** API Key (x-api-key header)
- **Load Profile:**
  - Ramp up: 0 → 3 VUs over 30 seconds
  - Steady state: 3 VUs for 3 minutes
  - Ramp down: 3 → 0 VUs over 30 seconds

## SLA Thresholds
- ✅ **p95 response time:** < 3000ms
- ✅ **Error rate:** < 5%
- ✅ **No throttling:** No HTTP 429 responses

## Results Summary

| Metric | Value |
|--------|-------|
| **Total Requests** | 471 |
| **Failed Requests** | 0 |
| **RPS (average)** | 1.57 |
| **Error Rate** | 0.00% |

### Response Time Metrics
| Percentile | Value |
|------------|-------|
| **p50 (median)** | 183.63ms |
| **p90** | 269.05ms |
| **p95** | 322.92ms |
| **p99** | 664.42ms |

## Key Findings
1. ✅ **No throttling detected** - No HTTP 429 responses observed
2. ✅ **Excellent performance** - All response times well below SLA thresholds
3. ✅ **Zero errors** - 100% request success rate
4. ✅ **Stable performance** - Consistent response times throughout test

## SLA Compliance
- **p95 < 3000ms:** ✅ PASS (322.92ms)
- **Error rate < 5%:** ✅ PASS (0.00%)
- **Overall SLA Verdict:** ✅ PASS

## Comparison with Previous Tests
- **3 VUs:** ✅ PASS - No throttling, excellent performance
- **10 VUs:** ❌ FAIL - Throttling observed at ~2 minutes

## Conclusion
The FaaS endpoint successfully handles 3 VU load without any performance degradation or throttling. Response times remain consistently low (p95 = 322ms), demonstrating excellent cold start optimization and API Gateway efficiency at this load level.

## Raw Data
- **Results file:** faas-3vu-results.json
- **Test script:** scripts/load-testing/admin-ep1-load-test.js
- **K6 version:** Latest
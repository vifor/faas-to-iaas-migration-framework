# IaaS EP1 Load Test Results - 3 VUs (FaaS Comparison Baseline)
**Date:** 2026-05-17  
**Endpoint:** GET /admin/store/store-001  
**Environment:** IaaS (EC2 + Node.js)  
**Instance:** http://[IP_REDACTED]:3000/api/v1  
**Purpose:** Direct comparison baseline with FaaS 3 VU test

## Test Configuration
- **Ramp up:** 0 → 3 VUs over 30 seconds
- **Steady state:** 3 VUs for 3 minutes  
- **Ramp down:** 3 → 0 VUs over 30 seconds
- **Total duration:** ~4 minutes (matching FaaS test profile)
- **API Key:** [IAAS_API_KEY_REDACTED]

## Test Status: ✅ SUCCESS

### Smoke Test Results
```bash
curl -H "x-api-key: ..." http://[IP_REDACTED]:3000/api/v1/admin/store/store-001
Response: [{"id":"store-001","value":"main","name":"Tienda Principal",...}]
Status: 200
Time: 0.139s
```

## 📊 Performance Results

### 3 VUs Load Test Results
**Execution:** ✅ Completed successfully  
**Duration:** ~4 minutes  
**Configuration:** Exactly matching planned FaaS test setup

**Key Metrics:**
- **Actual test duration:** 240.8s (RPS recomputed from the raw k6 export)
- **Total Requests:** 618
- **RPS (average):** 2.57
- **Error Rate:** 0.00%
- **Response Times:**
  - p50: 42.68ms
  - p90: 57.42ms
  - p95: 64.01ms
  - p99: 74.35ms
- **SLA Verdict:** ✅ PASS

## 🎯 Performance Analysis

### Key Performance Characteristics
1. **Consistent Low Latency:** All response times under 75ms
2. **Perfect Reliability:** Zero failures across 618 requests
3. **Stable Performance:** Minimal variance in response times
4. **Efficient Resource Usage:** EC2 instance running well below capacity

### SLA Compliance Analysis
- ✅ **Response Time:** p95 = 64.01ms (far below 3000ms threshold)
- ✅ **Reliability:** 0.00% error rate (well below 5% threshold)
- ✅ **Throughput:** Consistent 2+ RPS with 3 VUs

### Comparison with Higher VU Tests
| Load Level | VUs | Requests | RPS | p95 Latency | Error Rate |
|------------|-----|----------|-----|-------------|------------|
| **Low (FaaS comparison)** | 3 | 618 | 2.57 | 64.01ms | 0.00% |
| **Medium** | 10 | 2,327 | 7.74 | 63.84ms | 0.00% |
| **High** | 20 | 4,613 | 15.35 | 70.86ms | 0.00% |

**Observation:** Latency remains remarkably consistent across all load levels, demonstrating excellent scalability characteristics.

## 📊 Direct FaaS vs IaaS Comparison Table

| Métrica | IaaS (3 VUs) | FaaS (3 VUs) |
|---------|--------------|--------------|
| **Total requests** | 618 | 0 (throttled) |
| **RPS promedio** | 2.57 | N/A |
| **Latencia p50** | 42.68ms | N/A |
| **Latencia p90** | 57.42ms | N/A |
| **Latencia p95** | 64.01ms | N/A |
| **Latencia p99** | 74.35ms | N/A |
| **Tasa de error** | 0.00% | 100% (429) |
| **Throttling** | No | Sí (inmediato) |
| **Veredicto SLA** | ✅ PASS | ❌ FAIL |

## 🔍 Key Observations for Thesis

### IaaS Advantages (Demonstrated)
1. **Predictable Performance:** Consistent sub-65ms p95 latency
2. **No Throttling Issues:** Can handle load testing without service limits
3. **Linear Scalability:** Performance scales proportionally with load
4. **Operational Simplicity:** No complex usage plans or service quotas

### Performance Baseline Established
- **Baseline Latency:** ~43ms p50 (Buenos Aires → sa-east-1)
- **Processing Overhead:** Minimal (~20ms application processing)
- **Capacity Headroom:** Significant room for growth
- **Reliability:** 100% success rate across multiple test scenarios

## 🚀 Implications for Migration Decision

### Current State Assessment
The IaaS implementation provides:
- **Excellent performance** across all tested load levels
- **Predictable behavior** without throttling concerns  
- **Ready for production** load patterns
- **Clear performance characteristics** for capacity planning

### Migration Considerations
1. **Performance Risk:** FaaS currently cannot handle basic load testing
2. **Operational Risk:** FaaS requires resolving service quota issues
3. **Predictability:** IaaS offers more predictable performance characteristics
4. **Cost Model:** Need to analyze at which point FaaS becomes cost-effective

## 📈 Recommendations

### For Load Testing Comparison
1. **Use IaaS baseline** as performance target for FaaS
2. **Resolve FaaS throttling** before meaningful comparison
3. **Test higher VU levels** once FaaS is operational

### For Architecture Decision
1. **IaaS is production-ready** with demonstrated performance
2. **FaaS needs infrastructure work** before consideration
3. **Hybrid approach** may be optimal for different use cases

---
**Test Environment:** EC2 instance in sa-east-1  
**Network:** Buenos Aires → AWS sa-east-1  
**Status:** FaaS comparison baseline established ✅

**Next:** Resolve FaaS throttling to enable meaningful architecture comparison

---
> **Update (2026-07-12):** The FaaS figures and statements in this report ("0 (throttled)", "FaaS currently cannot handle basic load testing", "Resolve FaaS throttling") reflect the state as of 2026-05-17 and are superseded. The FaaS 3 VU test completed successfully on 2026-05-19 (539 requests, SLA pass — see faas-ep1-load-test-3vu-2026-05-19.md), and the 10/20 VU tests completed on 2026-07-10 after raising the AWS account concurrency limit and the API Gateway usage plan quota (see faas-ep1-load-test-10vu-2026-07-10.md and faas-ep1-load-test-20vu-2026-07-10.md). The IaaS figures in this report remain valid.
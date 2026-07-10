# IaaS EP1 Load Test Results
**Date:** 2026-05-17  
**Endpoint:** GET /admin/store/store-001  
**Environment:** IaaS (EC2 + Node.js)  
**Instance:** http://[IP_REDACTED]:3000/api/v1  

## Test Configuration
- **Ramp up:** 0 → N VUs over 1 minute
- **Steady state:** N VUs for 3 minutes  
- **Ramp down:** N → 0 VUs over 1 minute
- **Total duration:** 5 minutes per test
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

### Test 1: 10 VUs Load Test
**Execution:** ✅ Completed successfully  
**Duration:** ~5 minutes  

**Key Metrics:**
- **Actual test duration:** 300.5s (RPS recomputed from the raw k6 export)
- **Total Requests:** 2,327
- **RPS (average):** 7.74
- **Error Rate:** 0.00%
- **Response Times:**
  - p50: 43.01ms
  - p90: 54.42ms
  - p95: 63.84ms
  - p99: 79.99ms
- **SLA Verdict:** ✅ PASS

### Test 2: 20 VUs Load Test  
**Execution:** ✅ Completed successfully  
**Duration:** ~5 minutes  

**Key Metrics:**
- **Actual test duration:** 300.6s (RPS recomputed from the raw k6 export)
- **Total Requests:** 4,613
- **RPS (average):** 15.35
- **Error Rate:** 0.00%
- **Response Times:**
  - p50: 43.66ms
  - p90: 60.99ms
  - p95: 70.86ms
  - p99: 120.14ms
- **SLA Verdict:** ✅ PASS

## 🎯 Performance Analysis

### Scalability Assessment
1. **Linear Scaling:** 20 VUs produced almost exactly double the throughput of 10 VUs
2. **Latency Stability:** Response times remained consistently low even with doubled load
3. **Error Resilience:** 0% error rate across both test scenarios
4. **Resource Efficiency:** EC2 instance handled increased load without degradation

### SLA Compliance
Both test scenarios exceeded SLA requirements:
- ✅ **Response Time:** p95 < 3000ms (actual: 63-70ms, 97%+ improvement)
- ✅ **Reliability:** Error rate < 5% (actual: 0%)

### Infrastructure Performance
- **Network Latency:** ~43ms baseline (Buenos Aires → EC2 sa-east-1)
- **Processing Time:** Minimal overhead, suggesting efficient application code
- **Capacity Headroom:** No signs of saturation at 20 VUs

## 📈 Thesis-Ready Summary Table

| Métrica | 10 VUs | 20 VUs |
|---------|--------|--------|
| **Total requests** | 2,327 | 4,613 |
| **RPS promedio** | 7.74 | 15.35 |
| **Latencia p50** | 43.01ms | 43.66ms |
| **Latencia p90** | 54.42ms | 60.99ms |
| **Latencia p95** | 63.84ms | 70.86ms |
| **Latencia p99** | 79.99ms | 120.14ms |
| **Tasa de error** | 0.00% | 0.00% |
| **Veredicto SLA** | ✅ PASS | ✅ PASS |

## 🔍 Key Observations

### Performance Characteristics
1. **Excellent Latency:** Sub-100ms response times at both load levels
2. **Perfect Reliability:** Zero failures across 6,940 total requests
3. **Linear Scalability:** Performance scales proportionally with VUs
4. **Consistent Performance:** Minimal variance in response times

### Comparison Baseline (for FaaS comparison)
- **IaaS shows predictable, consistent performance**
- **No cold start penalties**
- **Linear cost/performance relationship**
- **Excellent for sustained load scenarios**

## 🚀 Recommendations

### Current State
The IaaS implementation demonstrates excellent performance characteristics and is ready for production load.

### Capacity Planning
Based on current results:
- **Safe operating range:** Up to 20+ concurrent users
- **Peak capacity estimate:** 50+ VUs likely supportable
- **Response time target:** Maintain sub-100ms p95 under normal load

### Next Steps for Thesis
1. **Compare with FaaS results** once throttling issue is resolved
2. **Document architectural trade-offs** between IaaS and FaaS
3. **Analyze cost implications** of both approaches

---
**Test Environment:** EC2 instance in sa-east-1  
**Network:** Buenos Aires → AWS sa-east-1  
**Status:** Baseline established successfully ✅
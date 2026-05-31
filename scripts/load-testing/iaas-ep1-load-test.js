/**
 * Load Test: IaaS Admin Endpoint EP1
 * GET /admin/store/{storeId}
 *
 * Purpose: Measure IaaS baseline performance for FaaS vs IaaS comparison
 * Platform: EC2 instance with Node.js application
 * Authentication: API Key (x-api-key header)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
// Required: -e IAAS_API_KEY=your-iaas-api-key
// Optional: -e IAAS_BASE_URL=your-iaas-url -e STORE_ID=store-id
const BASE_URL = __ENV.IAAS_BASE_URL || 'http://localhost:3000/api/v1';
const API_KEY = __ENV.IAAS_API_KEY;
const STORE_ID = __ENV.STORE_ID || 'store-001';

// Validate required environment variables
if (!API_KEY) {
  throw new Error('IAAS_API_KEY environment variable is required. Use: -e IAAS_API_KEY=your-iaas-api-key');
}

// Load test configuration for 10 VUs
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 VUs over 1 minute
    { duration: '3m', target: 10 },  // Stay at 10 VUs for 3 minutes
    { duration: '1m', target: 0 },   // Ramp down to 0 VUs over 1 minute
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // 95% of requests under 3s
    'http_req_failed': ['rate<0.05'],    // Error rate under 5%
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const url = `${BASE_URL}/admin/store/${STORE_ID}`;

  const params = {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  };

  const response = http.get(url, params);

  // Validation checks
  check(response, {
    'status is 200': (r) => r.status === 200,
    'no throttling (429)': (r) => r.status !== 429,
    'response time < 3s': (r) => r.timings.duration < 3000,
    'response has data': (r) => r.body && r.body.length > 0,
    'response is JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    'store data has required fields': (r) => {
      try {
        const data = JSON.parse(r.body);
        if (!Array.isArray(data) || data.length === 0) return false;
        const store = data[0];
        return store.id && store.value && store.name;
      } catch (e) {
        return false;
      }
    },
  });

  // Monitor for any issues
  if (response.status !== 200) {
    console.error(`❌ Request failed: ${response.status} - ${response.body}`);
  }

  sleep(1); // 1 second pause between requests
}

export function handleSummary(data) {
  const metrics = data.metrics;

  // Calculate key metrics
  const totalRequests = metrics.http_reqs?.values.count || 0;
  const failedRequests = metrics.http_req_failed?.values.passes || 0;
  const errorRatePercent = totalRequests > 0 ? (failedRequests / totalRequests * 100).toFixed(2) : 0;
  const duration = (data.state.testRunDurationMs / 1000).toFixed(2);
  const rps = totalRequests > 0 ? (totalRequests / (duration / 1)).toFixed(2) : 0;

  // Response time metrics
  const p50 = metrics.http_req_duration?.values.med || 0;
  const p90 = metrics.http_req_duration?.values['p(90)'] || 0;
  const p95 = metrics.http_req_duration?.values['p(95)'] || 0;
  const p99 = metrics.http_req_duration?.values['p(99)'] || 0;

  // SLA verdict
  const slaPass = p95 < 3000 && errorRatePercent < 5;

  console.log('\n' + '='.repeat(80));
  console.log('📊 IaaS EP1 Load Test Results Summary');
  console.log('='.repeat(80));
  console.log(`Endpoint: GET /admin/store/${STORE_ID}`);
  console.log(`Environment: IaaS (EC2 + Node.js)`);
  console.log(`Instance: [IP_REDACTED]:3000`);
  console.log(`Duration: ${duration}s`);
  console.log(`VUs: ${__ENV.VU_COUNT || '10'}`);
  console.log('-'.repeat(80));
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`RPS (avg): ${rps}`);
  console.log(`Error Rate: ${errorRatePercent}%`);
  console.log('-'.repeat(80));
  console.log('Response Times:');
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p90: ${p90.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms`);
  console.log('-'.repeat(80));
  console.log(`SLA Verdict: ${slaPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - p95 < 3000ms: ${p95 < 3000 ? '✅' : '❌'} (${p95.toFixed(2)}ms)`);
  console.log(`  - Error rate < 5%: ${errorRatePercent < 5 ? '✅' : '❌'} (${errorRatePercent}%)`);
  console.log('='.repeat(80));

  return {};
}
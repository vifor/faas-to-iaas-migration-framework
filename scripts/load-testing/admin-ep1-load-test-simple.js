/**
 * Load Test: FaaS Admin Endpoint EP1 - Simplified Version
 * GET /admin/store/{storeId}
 *
 * Purpose: Measure FaaS baseline performance with 3 VUs to avoid throttling
 * Authentication: API Key (x-api-key header)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
// Required: -e API_KEY=your-faas-api-key
// Optional: -e BASE_URL=your-api-gateway-url -e STORE_ID=store-id
const BASE_URL = __ENV.BASE_URL || 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
const API_KEY = __ENV.API_KEY;
const STORE_ID = __ENV.STORE_ID || 'store-001';

// Validate required environment variables
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required. Use: -e API_KEY=your-faas-api-key');
}

// Load test configuration - Reduced VUs to avoid API Gateway throttling
export const options = {
  stages: [
    { duration: '30s', target: 3 },  // Ramp up to 3 VUs over 30 seconds
    { duration: '3m', target: 3 },   // Stay at 3 VUs for 3 minutes
    { duration: '30s', target: 0 },  // Ramp down to 0 VUs over 30 seconds
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
  });

  // Monitor for throttling
  if (response.status === 429) {
    console.error(`🚨 THROTTLING DETECTED at iteration ${__ITER}: HTTP 429 - STOPPING TEST`);
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
  console.log('📊 FaaS EP1 Load Test Results Summary (3 VUs)');
  console.log('='.repeat(80));
  console.log(`Endpoint: GET /admin/store/${STORE_ID}`);
  console.log(`Environment: FaaS (AWS Lambda + API Gateway)`);
  console.log(`Region: sa-east-1`);
  console.log(`Duration: ${duration}s`);
  console.log(`VUs: 3`);
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
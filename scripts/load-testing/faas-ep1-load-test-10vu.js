/**
 * Load Test: FaaS Admin Endpoint EP1
 * GET /admin/store/{storeId}
 * 
 * Purpose: Measure FaaS baseline performance for thesis documentation
 * Authentication: API Key (x-api-key header)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
const API_KEY = __ENV.API_KEY;
const STORE_ID = __ENV.STORE_ID || 'store-001';

// Validate environment
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}

// Load test configuration - Reduced VUs to avoid API Gateway throttling
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 VUs over 1 minute (mirrors IaaS profile)
    { duration: '3m', target: 10 },   // Stay at 10 VUs for 3 minutes
    { duration: '1m', target: 0 },   // Ramp down to 0 VUs over 1 minute
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // 95% of requests under 3s
    'http_req_failed': ['rate<0.05'],    // Error rate under 5%
    'errors': ['rate<0.05'],              // Custom error rate under 5%
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
  
  // Record metrics
  responseTime.add(response.timings.duration);
  errorRate.add(response.status !== 200);
  
  // Validation checks
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
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
    'response is array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch (e) {
        return false;
      }
    },
    'store data has required fields': (r) => {
      try {
        const data = JSON.parse(r.body);
        if (!Array.isArray(data) || data.length === 0) return false;
        const store = data[0];
        return store.id && store.value;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
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
  
  // SLA verdict
  const p95 = metrics.http_req_duration?.values['p(95)'] || 0;
  const slaPass = p95 < 3000 && errorRatePercent < 5;
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 FaaS EP1 Load Test Results Summary');
  console.log('='.repeat(80));
  console.log(`Endpoint: GET /admin/store/${STORE_ID}`);
  console.log(`Environment: FaaS (AWS Lambda + API Gateway)`);
  console.log(`Region: sa-east-1`);
  console.log(`Duration: ${duration}s`);
  console.log('-'.repeat(80));
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`RPS (avg): ${rps}`);
  console.log(`Error Rate: ${errorRatePercent}%`);
  console.log('-'.repeat(80));
  console.log('Response Times:');
  console.log(`  Min: ${(metrics.http_req_duration?.values.min || 0).toFixed(2)}ms`);
  console.log(`  Avg: ${(metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms`);
  console.log(`  p50: ${(metrics.http_req_duration?.values.med || 0).toFixed(2)}ms`);
  console.log(`  p90: ${(metrics.http_req_duration?.values['p(90)'] || 0).toFixed(2)}ms`);
  console.log(`  p95: ${(metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms`);
  console.log(`  p99: ${(metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms`);
  console.log(`  Max: ${(metrics.http_req_duration?.values.max || 0).toFixed(2)}ms`);
  console.log('-'.repeat(80));
  console.log(`SLA Verdict: ${slaPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - p95 < 3000ms: ${p95 < 3000 ? '✅' : '❌'} (${p95.toFixed(2)}ms)`);
  console.log(`  - Error rate < 5%: ${errorRatePercent < 5 ? '✅' : '❌'} (${errorRatePercent}%)`);
  console.log('='.repeat(80));

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

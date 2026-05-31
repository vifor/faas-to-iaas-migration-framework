#!/usr/bin/env node

const fs = require('fs');

function analyzeK6Results(filename) {
  const data = fs.readFileSync(filename, 'utf8');
  const lines = data.trim().split('\n');

  let totalRequests = 0;
  let failedRequests = 0;
  let durations = [];

  lines.forEach(line => {
    try {
      const record = JSON.parse(line);

      if (record.type === 'Point') {
        if (record.metric === 'http_reqs') {
          totalRequests++;
        }
        if (record.metric === 'http_req_failed' && record.data.value === 1) {
          failedRequests++;
        }
        if (record.metric === 'http_req_duration') {
          durations.push(record.data.value);
        }
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  });

  // Calculate metrics
  const errorRate = totalRequests > 0 ? ((failedRequests / totalRequests) * 100) : 0;

  // Sort durations for percentiles
  durations.sort((a, b) => a - b);
  const p50 = percentile(durations, 50);
  const p90 = percentile(durations, 90);
  const p95 = percentile(durations, 95);
  const p99 = percentile(durations, 99);

  // Estimate test duration (5 minutes = 300 seconds)
  const testDuration = 300;
  const rps = totalRequests / testDuration;

  console.log('='.repeat(60));
  console.log('📊 IaaS EP1 Load Test Results (10 VUs)');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Failed Requests: ${failedRequests}`);
  console.log(`RPS (avg): ${rps.toFixed(2)}`);
  console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
  console.log('-'.repeat(60));
  console.log('Response Times:');
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p90: ${p90.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms`);
  console.log('-'.repeat(60));

  const slaPass = p95 < 3000 && errorRate < 5;
  console.log(`SLA Verdict: ${slaPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - p95 < 3000ms: ${p95 < 3000 ? '✅' : '❌'} (${p95.toFixed(2)}ms)`);
  console.log(`  - Error rate < 5%: ${errorRate < 5 ? '✅' : '❌'} (${errorRate.toFixed(2)}%)`);
  console.log('='.repeat(60));

  return {
    totalRequests,
    failedRequests,
    errorRate,
    rps,
    p50,
    p90,
    p95,
    p99,
    slaPass
  };
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

if (require.main === module) {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node analyze-k6-results.js <results.json>');
    process.exit(1);
  }
  analyzeK6Results(filename);
}

module.exports = { analyzeK6Results };
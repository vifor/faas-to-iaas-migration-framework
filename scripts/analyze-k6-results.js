#!/usr/bin/env node

const fs = require('fs');

function analyzeK6Results(filename) {
  const data = fs.readFileSync(filename, 'utf8');
  const lines = data.trim().split('\n');

  let totalRequests = 0;
  let failedRequests = 0;
  let durations = [];
  let testRunDurationMs = null;
  let firstPointTime = null;
  let lastPointTime = null;

  lines.forEach(line => {
    try {
      const record = JSON.parse(line);

      if (record.state && typeof record.state.testRunDurationMs === 'number') {
        testRunDurationMs = record.state.testRunDurationMs;
      }

      if (record.type === 'Point') {
        const pointTime = Date.parse(record.data.time);
        if (!Number.isNaN(pointTime)) {
          if (firstPointTime === null || pointTime < firstPointTime) firstPointTime = pointTime;
          if (lastPointTime === null || pointTime > lastPointTime) lastPointTime = pointTime;
        }
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

  // Actual test duration from the k6 export: state.testRunDurationMs when present
  // (summary export), otherwise the span of Point timestamps (NDJSON stream export).
  if (testRunDurationMs === null && firstPointTime !== null && lastPointTime !== null) {
    testRunDurationMs = lastPointTime - firstPointTime;
  }
  if (testRunDurationMs === null || testRunDurationMs <= 0) {
    console.error(`Error: could not determine actual test duration from ${filename} ` +
      '(no state.testRunDurationMs and no Point timestamps). Refusing to use a hardcoded value.');
    process.exit(1);
  }
  const testDuration = testRunDurationMs / 1000;
  console.log(`Actual test duration: ${testDuration.toFixed(1)}s`);
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
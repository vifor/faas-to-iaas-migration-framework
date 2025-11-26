
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const config = {
  baseUrl: __ENV.FAAS_BASE_URL || __ENV.SMOKE_TEST_BASE_URL || 'https://example.com/api',
  testJwt: __ENV.TEST_JWT || '',
};

function validateEnvironment() {
  const missing = [];
  if (!config.baseUrl || config.baseUrl === 'https://example.com/api') {
    missing.push('FAAS_BASE_URL or SMOKE_TEST_BASE_URL');
  }
  if (!config.testJwt) {
    missing.push('TEST_JWT');
  }
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    throw new Error('Missing required environment variables');
  }
}

validateEnvironment();

export const options = {};

export default function () {
  group('Healthcheck without JWT', function () {
    const res = http.get(`${config.baseUrl}/healthcheck`, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });
    const ok = check(res, {
      'Should return 403 if no JWT': (r) => r.status === 403,
    });
    if (ok) {
      console.log(`✅ /healthcheck without JWT: recibió 403 como se esperaba.`);
    } else {
      console.log(`❌ /healthcheck without JWT: status ${res.status} (esperado 403)`);
    }
  });

  sleep(1);

  group('Healthcheck with JWT', function () {
    const res = http.get(`${config.baseUrl}/healthcheck`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.testJwt}`,
      },
      timeout: '10s',
    });
    const ok = check(res, {
      'Should return 200 with valid JWT': (r) => r.status === 200,
    });
    if (ok) {
      console.log(`✅ /healthcheck con JWT: recibió 200 como se esperaba.`);
    } else {
      console.log(`❌ /healthcheck con JWT: status ${res.status} (esperado 200)`);
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  const passed = data.metrics.checks.passes;
  const failed = data.metrics.checks.fails;
  const total = passed + failed;
  const successRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;
  console.log('\n🏁 Smoke Test Summary:');
  console.log(`   Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s`);
  console.log(`   Requests: ${data.metrics.http_reqs?.count || 0}`);
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Avg Response Time: ${Math.round(data.metrics.http_req_duration?.avg || 0)}ms`);
  console.log(`   Environment: ${config.baseUrl.includes('example.com') ? 'PLACEHOLDER' : 'CONFIGURED'}`);
  return {
    stdout: `Smoke Test Complete - ${successRate}% success rate\n`
  };
}
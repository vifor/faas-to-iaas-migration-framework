
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const config = {
  baseUrl: __ENV.FAAS_BASE_URL || __ENV.SMOKE_TEST_BASE_URL || 'https://example.com/api',
  apiKey: __ENV.TEST_API_KEY || '',
  franchiseId: __ENV.TEST_FRANCHISE_ID || '',
};

function validateEnvironment() {
  const missing = [];
  if (!config.baseUrl || config.baseUrl === 'https://example.com/api') {
    missing.push('FAAS_BASE_URL or SMOKE_TEST_BASE_URL');
  }
  if (!config.apiKey) {
    missing.push('TEST_API_KEY');
  }
  if (!config.franchiseId) {
    missing.push('TEST_FRANCHISE_ID');
  }
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    throw new Error('Missing required environment variables');
  }
}

validateEnvironment();

export const options = {};

export default function () {
  group('API without API Key', function () {
    const res = http.get(`${config.baseUrl}/admin/franchise/${config.franchiseId}`, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });
    const ok = check(res, {
      'Should return 403 if no API Key': (r) => r.status === 403,
    });
    if (ok) {
      console.log(`✅ GET /admin/franchise/{id} without API Key: recibió 403 como se esperaba.`);
    } else {
      console.log(`❌ GET /admin/franchise/{id} without API Key: status ${res.status} (esperado 403)`);
    }
  });

  sleep(1);

  group('API with API Key', function () {
    const res = http.get(`${config.baseUrl}/admin/franchise/${config.franchiseId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      timeout: '10s',
    });
    const ok = check(res, {
      'Should return 200 with valid API Key': (r) => r.status === 200,
    });
    if (ok) {
      console.log(`✅ GET /admin/franchise/{id} con API Key: recibió 200 como se esperaba.`);
    } else {
      console.log(`❌ GET /admin/franchise/{id} con API Key: status ${res.status} (esperado 200)`);
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
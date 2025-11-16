// Simple Smoke Test - Quick health check for FaaS API
import http from 'k6/http';
import { check, sleep } from 'k6';

// Load environment variables (K6 reads from .env file automatically)
const config = {
  baseUrl: __ENV.FAAS_BASE_URL || __ENV.SMOKE_TEST_BASE_URL || 'https://example.com/api',
  adminApiKey: __ENV.FAAS_ADMIN_API_KEY || __ENV.SMOKE_TEST_API_KEY || '',
};

// Validate required environment variables
function validateEnvironment() {
  const missing = [];
  
  if (!config.baseUrl || config.baseUrl === 'https://example.com/api') {
    missing.push('FAAS_BASE_URL or SMOKE_TEST_BASE_URL');
  }
  
  if (!config.adminApiKey || config.adminApiKey === '') {
    missing.push('FAAS_ADMIN_API_KEY or SMOKE_TEST_API_KEY');
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('💡 Please copy .env.example to .env and configure your credentials');
    console.error('📖 See SECURITY.md for detailed setup instructions');
    throw new Error('Missing required environment variables');
  }
}

// Validate environment on startup
validateEnvironment();

// Options can be overridden by smoke-test.json - remove hardcoded config to respect JSON
export const options = {};

export default function () {
  console.log(`🚀 Smoke Test - Testing ${config.baseUrl}`);
  
  // Simple health check - just verify the API is responding
  const healthResponse = http.get(`${config.baseUrl}/health`, {
    headers: {
      'x-api-key': config.adminApiKey,
      'Content-Type': 'application/json'
    },
    timeout: '10s'
  });
  
  // Basic checks - just verify we get a response (even if it's 401/403)
  const healthCheck = check(healthResponse, {
    'API is reachable': (r) => r.status !== 0,
    'Response time < 5s': (r) => r.timings.duration < 5000,
    'Not DNS error': (r) => !r.error_code || r.error_code !== 1212,
    'Valid API response': (r) => r.status >= 200 && r.status < 500
  });
  
  if (healthCheck) {
    console.log(`✅ API Health Check: Status ${healthResponse.status}, Duration: ${Math.round(healthResponse.timings.duration)}ms`);
  } else {
    console.log(`❌ API Health Check Failed: ${healthResponse.error || healthResponse.status}`);
  }
  
  // Brief pause
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
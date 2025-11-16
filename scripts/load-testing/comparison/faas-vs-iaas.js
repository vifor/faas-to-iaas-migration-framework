// FaaS vs IaaS Comparison Test - Direct Performance Comparison
import http from 'k6/http';
import { check } from 'k6';

// Load environment variables (K6 reads from .env file automatically)
// Configuration for both environments
const environments = {
  faas: {
    name: 'FaaS (AWS Lambda)',
    baseUrl: __ENV.FAAS_BASE_URL || 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
    authUrl: __ENV.FAAS_AUTH_URL || 'https://cognito-idp.sa-east-1.amazonaws.com/',
    clientId: __ENV.FAAS_CLIENT_ID || '',
    credentials: {
      USERNAME: __ENV.FAAS_USERNAME || '',
      PASSWORD: __ENV.FAAS_PASSWORD || ''
    },
    expectedLatency: {
      p50: parseInt(__ENV.FAAS_P50_EXPECTED) || 2000,  // 2 seconds
      p95: parseInt(__ENV.FAAS_P95_EXPECTED) || 4000   // 4 seconds
    }
  },
  iaas: {
    name: 'IaaS (NestJS)',
    baseUrl: __ENV.IAAS_BASE_URL || 'http://localhost:3000/api/v1',
    credentials: {
      email: __ENV.IAAS_EMAIL || '',
      password: __ENV.IAAS_PASSWORD || ''
    },
    expectedLatency: {
      p50: parseInt(__ENV.IAAS_P50_EXPECTED) || 100,   // 100ms
      p95: parseInt(__ENV.IAAS_P95_EXPECTED) || 300    // 300ms
    }
  }
};

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = {
    'FAAS_CLIENT_ID': __ENV.FAAS_CLIENT_ID,
    'FAAS_USERNAME': __ENV.FAAS_USERNAME,
    'FAAS_PASSWORD': __ENV.FAAS_PASSWORD,
    'IAAS_EMAIL': __ENV.IAAS_EMAIL,
    'IAAS_PASSWORD': __ENV.IAAS_PASSWORD
  };

  const missing = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('💡 Please copy .env.example to .env and configure your credentials');
    throw new Error('Missing required environment variables');
  }
}

// Validate environment on startup
validateEnvironment();

// Global cache for both environments
let tokenCache = {
  faas: { token: null, expiresAt: 0 },
  iaas: { token: null, expiresAt: 0 }
};

class ComparisonTest {
  constructor() {
    this.results = { faas: [], iaas: [] };
  }
  
  async getFaaSToken() {
    const now = Date.now();
    if (tokenCache.faas.token && now < tokenCache.faas.expiresAt) {
      return tokenCache.faas.token;
    }
    
    const env = environments.faas;
    const startTime = Date.now();
    
    const authResponse = http.post(env.authUrl, JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: env.clientId,
      AuthParameters: env.credentials
    }), {
      headers: {
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        'Content-Type': 'application/x-amz-json-1.1'
      }
    });
    
    const authTime = Date.now() - startTime;
    
    if (authResponse.status === 200) {
      const result = JSON.parse(authResponse.body);
      tokenCache.faas.token = result.AuthenticationResult.IdToken;
      tokenCache.faas.expiresAt = now + (55 * 60 * 1000); // 55 minutes
      
      console.log(`🔐 FaaS auth: ${authTime}ms`);
      return tokenCache.faas.token;
    }
    
    console.log(`❌ FaaS auth failed: ${authResponse.status}`);
    return null;
  }
  
  async getIaaSToken() {
    const now = Date.now();
    if (tokenCache.iaas.token && now < tokenCache.iaas.expiresAt) {
      return tokenCache.iaas.token;
    }
    
    const env = environments.iaas;
    const startTime = Date.now();
    
    const authResponse = http.post(`${env.baseUrl}/auth/login`, JSON.stringify(env.credentials), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const authTime = Date.now() - startTime;
    
    if (authResponse.status === 200) {
      const result = JSON.parse(authResponse.body);
      tokenCache.iaas.token = result.accessToken;
      tokenCache.iaas.expiresAt = now + (23 * 60 * 60 * 1000); // 23 hours
      
      console.log(`🔐 IaaS auth: ${authTime}ms`);
      return tokenCache.iaas.token;
    }
    
    console.log(`❌ IaaS auth failed: ${authResponse.status}`);
    return null;
  }
  
  async testFaaSEndpoint() {
    const token = await this.getFaaSToken();
    if (!token) return null;
    
    const startTime = Date.now();
    
    const response = http.get(`${environments.faas.baseUrl}/pets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { environment: 'faas', endpoint: 'pets' }
    });
    
    const totalTime = Date.now() - startTime;
    
    const result = {
      environment: 'FaaS',
      status: response.status,
      duration: totalTime,
      success: response.status === 200,
      timestamp: Date.now()
    };
    
    this.results.faas.push(result);
    return result;
  }
  
  async testIaaSEndpoint() {
    const token = await this.getIaaSToken();
    if (!token) return null;
    
    const startTime = Date.now();
    
    const response = http.get(`${environments.iaas.baseUrl}/store/store-001/pets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { environment: 'iaas', endpoint: 'pets' }
    });
    
    const totalTime = Date.now() - startTime;
    
    const result = {
      environment: 'IaaS',
      status: response.status,
      duration: totalTime,
      success: response.status === 200,
      timestamp: Date.now()
    };
    
    this.results.iaas.push(result);
    return result;
  }
  
  logComparison(faasResult, iaasResult) {
    if (!faasResult || !iaasResult) return;
    
    const speedup = faasResult.duration / iaasResult.duration;
    const improvement = ((faasResult.duration - iaasResult.duration) / faasResult.duration * 100).toFixed(1);
    
    console.log('\n📊 PERFORMANCE COMPARISON:');
    console.log(`⚡ FaaS: ${faasResult.duration}ms (${faasResult.success ? '✅' : '❌'})`);
    console.log(`🚀 IaaS: ${iaasResult.duration}ms (${iaasResult.success ? '✅' : '❌'})`);
    console.log(`📈 Speedup: ${speedup.toFixed(2)}x faster`);
    console.log(`💡 Improvement: ${improvement}% faster`);
  }
}

const comparisonTest = new ComparisonTest();

export default function () {
  const testType = Math.random() < 0.5 ? 'sequential' : 'parallel';
  
  if (testType === 'sequential') {
    // Test environments sequentially
    console.log('🔄 Running sequential comparison...');
    
    const faasResult = comparisonTest.testFaaSEndpoint();
    const iaasResult = comparisonTest.testIaaSEndpoint();
    
    comparisonTest.logComparison(faasResult, iaasResult);
    
    // Checks for sequential testing
    check(faasResult, {
      'FaaS request successful': (r) => r && r.success,
      'FaaS under expected p95': (r) => r && r.duration < environments.faas.expectedLatency.p95
    }, { test_type: 'sequential', environment: 'faas' });
    
    check(iaasResult, {
      'IaaS request successful': (r) => r && r.success,
      'IaaS under expected p95': (r) => r && r.duration < environments.iaas.expectedLatency.p95,
      'IaaS faster than FaaS': (r) => r && faasResult && r.duration < faasResult.duration
    }, { test_type: 'sequential', environment: 'iaas' });
    
  } else {
    // Test single environment (alternating)
    const envName = Math.random() < 0.5 ? 'faas' : 'iaas';
    console.log(`🎯 Testing ${envName.toUpperCase()}...`);
    
    if (envName === 'faas') {
      const result = comparisonTest.testFaaSEndpoint();
      
      check(result, {
        'FaaS request successful': (r) => r && r.success,
        'FaaS reasonable performance': (r) => r && r.duration < 10000 // 10s max
      }, { test_type: 'individual', environment: 'faas' });
      
    } else {
      const result = comparisonTest.testIaaSEndpoint();
      
      check(result, {
        'IaaS request successful': (r) => r && r.success,
        'IaaS fast performance': (r) => r && r.duration < 1000 // 1s max
      }, { test_type: 'individual', environment: 'iaas' });
    }
  }
}

export let options = {
  scenarios: {
    comparison_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },  // Warm up both environments
        { duration: '60s', target: 15 }, // Mixed load testing
        { duration: '30s', target: 25 }, // Higher load
        { duration: '30s', target: 10 }, // Scale down
        { duration: '15s', target: 0 },  // Cool down
      ],
      gracefulRampDown: '10s',
    }
  },
  
  thresholds: {
    // FaaS thresholds
    'http_req_duration{environment:faas}': ['p(95)<5000'], // FaaS can be slower
    'http_req_failed{environment:faas}': ['rate<0.05'], // 5% error rate acceptable
    
    // IaaS thresholds  
    'http_req_duration{environment:iaas}': ['p(95)<500'], // IaaS should be fast
    'http_req_failed{environment:iaas}': ['rate<0.01'], // 1% error rate
    
    // Comparison thresholds
    'checks{test_type:sequential}': ['rate>0.90'], // 90% success for comparisons
    'checks{test_type:individual}': ['rate>0.95'], // 95% success for individual tests
  }
};
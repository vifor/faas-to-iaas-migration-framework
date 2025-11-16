// IaaS Performance Test Suite - Comprehensive Testing
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = 'http://localhost:3000/api/v1';

// Shared token cache across scenarios
let globalTokenCache = {
  token: null,
  expiresAt: 0,
  refreshToken: null,
  user: null
};

class IaaSAuthManager {
  constructor() {
    this.baseUrl = baseUrl;
  }
  
  async authenticate() {
    const loginData = {
      email: 'owner@store1.petstore.com',
      password: 'SecurePassword123!'
    };
    
    const response = http.post(`${this.baseUrl}/auth/login`, JSON.stringify(loginData), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      const result = JSON.parse(response.body);
      
      globalTokenCache.token = result.accessToken;
      globalTokenCache.refreshToken = result.refreshToken;
      globalTokenCache.expiresAt = Date.now() + (result.expiresIn * 1000);
      globalTokenCache.user = result.user;
      
      return result.accessToken;
    }
    
    throw new Error(`Authentication failed: ${response.status}`);
  }
  
  getValidToken() {
    const now = Date.now();
    
    if (!globalTokenCache.token || now > globalTokenCache.expiresAt) {
      return this.authenticate();
    }
    
    return globalTokenCache.token;
  }
}

const authManager = new IaaSAuthManager();

export let options = {
  scenarios: {
    // Scenario 1: Authentication Performance
    auth_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      exec: 'testAuthPerformance',
      tags: { test_type: 'auth_performance' },
    },
    
    // Scenario 2: API Endpoint Performance
    api_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 2 },   // Warm-up
        { duration: '10s', target: 10 }, // Normal load
        { duration: '15s', target: 25 }, // High load
        { duration: '10s', target: 50 }, // Peak load
        { duration: '10s', target: 10 }, // Scale down
        { duration: '5s', target: 0 },   // Cool down
      ],
      gracefulRampDown: '10s',
      exec: 'testApiPerformance',
      tags: { test_type: 'api_performance' },
      startTime: '45s', // Start after auth tests
    },
    
    // Scenario 3: Mixed Workload
    mixed_workload: {
      executor: 'constant-vus',
      vus: 15,
      duration: '60s',
      exec: 'testMixedWorkload',
      tags: { test_type: 'mixed_workload' },
      startTime: '120s', // Start after other scenarios
    }
  },
  
  thresholds: {
    // Overall performance thresholds
    http_req_duration: ['p(95)<300'], // IaaS should be fast
    http_req_duration: ['p(50)<100'], // Median under 100ms
    
    // Auth-specific thresholds
    'http_req_duration{test_type:auth_performance}': ['p(95)<200'],
    'http_req_duration{endpoint:login}': ['p(95)<150'],
    
    // API-specific thresholds
    'http_req_duration{test_type:api_performance}': ['p(95)<150'],
    'http_req_duration{endpoint:pets}': ['p(95)<100'],
    
    // Error thresholds
    http_req_failed: ['rate<0.02'], // Less than 2% failures
    'checks{test_type:auth_performance}': ['rate>0.98'],
    'checks{test_type:api_performance}': ['rate>0.99'],
  },
};

// Scenario 1: Test authentication performance
export function testAuthPerformance() {
  const startTime = Date.now();
  
  const loginData = {
    email: 'owner@store1.petstore.com',
    password: 'SecurePassword123!'
  };
  
  const loginResponse = http.post(`${baseUrl}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login', test_type: 'auth_performance' }
  });
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken && body.accessToken.length > 0;
      } catch (e) {
        return false;
      }
    },
    'login response time < 100ms': (r) => r.timings.duration < 100,
  }, { test_type: 'auth_performance' });
  
  if (loginSuccess && loginResponse.status === 200) {
    const authResult = JSON.parse(loginResponse.body);
    
    // Test token validation
    const validateResponse = http.get(`${baseUrl}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${authResult.accessToken}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'validate', test_type: 'auth_performance' }
    });
    
    check(validateResponse, {
      'validate status is 200': (r) => r.status === 200,
      'validate response time < 50ms': (r) => r.timings.duration < 50,
    }, { test_type: 'auth_performance' });
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`🔐 Auth test completed in ${totalTime}ms`);
  
  sleep(1);
}

// Scenario 2: Test API endpoint performance with cached token
export function testApiPerformance() {
  const token = authManager.getValidToken();
  
  if (!token) {
    console.log('❌ No valid token for API test');
    return;
  }
  
  const startTime = Date.now();
  
  // Test pets endpoint
  const petsResponse = http.get(`${baseUrl}/store/store-001/pets`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    tags: { endpoint: 'pets', test_type: 'api_performance' }
  });
  
  const success = check(petsResponse, {
    'pets status is 200': (r) => r.status === 200,
    'pets has data': (r) => r.body.length > 0,
    'pets response time < 100ms': (r) => r.timings.duration < 100,
  }, { test_type: 'api_performance' });
  
  if (success) {
    try {
      const data = JSON.parse(petsResponse.body);
      console.log(`🐾 Retrieved ${data.pets ? data.pets.length : 0} pets`);
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`🏪 API test completed in ${totalTime}ms`);
  
  sleep(0.5);
}

// Scenario 3: Mixed workload simulation
export function testMixedWorkload() {
  const operations = ['pets', 'profile', 'validate'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  const token = authManager.getValidToken();
  
  if (!token) {
    console.log('❌ No valid token for mixed workload');
    return;
  }
  
  let response;
  
  switch (operation) {
    case 'pets':
      response = http.get(`${baseUrl}/store/store-001/pets`, {
        headers: { 'Authorization': `Bearer ${token}` },
        tags: { endpoint: 'pets', test_type: 'mixed_workload' }
      });
      break;
      
    case 'profile':
      response = http.get(`${baseUrl}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
        tags: { endpoint: 'profile', test_type: 'mixed_workload' }
      });
      break;
      
    case 'validate':
      response = http.get(`${baseUrl}/auth/validate`, {
        headers: { 'Authorization': `Bearer ${token}` },
        tags: { endpoint: 'validate', test_type: 'mixed_workload' }
      });
      break;
  }
  
  check(response, {
    [`${operation} status is 200`]: (r) => r.status === 200,
    [`${operation} response time < 200ms`]: (r) => r.timings.duration < 200,
  }, { test_type: 'mixed_workload' });
  
  sleep(Math.random() * 2); // Random pause 0-2s
}
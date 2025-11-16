// IaaS Load Test with Token Caching - NestJS Performance
import http from 'k6/http';
import { check } from 'k6';

// Global token cache for IaaS
let tokenCache = {
  token: null,
  expiresAt: 0,
  lastRefresh: 0,
  user: null
};

const baseUrl = 'http://localhost:3000/api/v1';

function getCachedToken() {
  const now = Date.now();
  
  // Check if we need a new token (expired or doesn't exist)
  // IaaS tokens typically last 24h vs Cognito 1h
  if (!tokenCache.token || now > tokenCache.expiresAt) {
    console.log('🔄 Getting new IaaS token (cache miss/expired)...');
    
    const startAuth = Date.now();
    
    const loginData = {
      email: 'owner@store1.petstore.com',
      password: 'SecurePassword123!'
    };
    
    const authResponse = http.post(`${baseUrl}/auth/login`, JSON.stringify(loginData), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const authDuration = Date.now() - startAuth;
    
    if (authResponse.status === 200) {
      const authResult = JSON.parse(authResponse.body);
      
      // Cache token for 23 hours (JWT expires in 24h by default)
      tokenCache.token = authResult.accessToken;
      tokenCache.expiresAt = now + (23 * 60 * 60 * 1000);
      tokenCache.lastRefresh = now;
      tokenCache.user = authResult.user;
      
      console.log(`✅ IaaS token cached (auth took ${authDuration}ms)`);
      console.log(`👤 User: ${authResult.user.email}, Role: ${authResult.user.role}`);
      
      return tokenCache.token;
    } else {
      console.log(`❌ IaaS auth failed: ${authResponse.status}`);
      console.log(`Error: ${authResponse.body.substring(0, 100)}`);
      return null;
    }
  } else {
    const cacheAge = Math.round((now - tokenCache.lastRefresh) / 1000);
    console.log(`🎯 Using cached IaaS token (age: ${cacheAge}s)`);
    return tokenCache.token;
  }
}

export default function () {
  const iterationStart = Date.now();
  
  // Get token (cached or new)
  const tokenStart = Date.now();
  const token = getCachedToken();
  const tokenDuration = Date.now() - tokenStart;
  
  if (!token) {
    console.log('❌ No token available, skipping request');
    return;
  }
  
  // Make API request with token
  const apiStart = Date.now();
  const response = http.get(`${baseUrl}/store/store-001/pets`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const apiDuration = Date.now() - apiStart;
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has response body': (r) => r.body.length > 0,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  const totalDuration = Date.now() - iterationStart;
  
  // Enhanced logging for IaaS performance
  if (success) {
    console.log(`✅ IaaS request successful - Token: ${tokenDuration}ms, API: ${apiDuration}ms, Total: ${totalDuration}ms`);
    
    // Parse response to log data details
    try {
      const responseData = JSON.parse(response.body);
      if (responseData.pets) {
        console.log(`📊 Retrieved ${responseData.pets.length} pets from store ${responseData.storeId}`);
      }
    } catch (e) {
      // Ignore parsing errors for logging
    }
  } else {
    console.log(`❌ IaaS request failed - Status: ${response.status}, Total: ${totalDuration}ms`);
    if (response.status === 401) {
      console.log('🔐 Token might be expired, will refresh on next request');
      tokenCache.token = null; // Force token refresh
    }
  }
}

// Test configuration optimized for IaaS performance characteristics
export let options = {
  stages: [
    { duration: '5s', target: 1 },    // Warm-up (token cached)
    { duration: '10s', target: 10 },  // Ramp-up to 10 users
    { duration: '30s', target: 10 },  // Sustain 10 users
    { duration: '10s', target: 50 },  // Spike to 50 users
    { duration: '20s', target: 50 },  // Sustain spike
    { duration: '10s', target: 10 },  // Scale down
    { duration: '5s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // IaaS should be much faster than FaaS
    http_req_duration: ['p(50)<100'], // 50% under 100ms
    'http_req_duration{cached:true}': ['p(95)<150'], // Cached requests even faster
    http_req_failed: ['rate<0.01'], // Less than 1% failures
    checks: ['rate>0.99'], // 99%+ success rate
  },
};
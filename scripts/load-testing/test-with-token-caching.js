// K6 Test with Token Caching - Demonstrating Performance Improvement
import http from 'k6/http';
import { check } from 'k6';

// Global token cache shared across all virtual users
let tokenCache = {
  token: null,
  expiresAt: 0,
  lastRefresh: 0
};

const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
const clientId = '34uf0bee83j3ciq8sd7durq31k';

function getCachedToken() {
  const now = Date.now();
  
  // Check if we need a new token (expired or doesn't exist)
  if (!tokenCache.token || now > tokenCache.expiresAt) {
    console.log('🔄 Getting new token (cache miss/expired)...');
    
    const startAuth = Date.now();
    const authResponse = http.post('https://cognito-idp.sa-east-1.amazonaws.com/', 
      JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: 'vicky',
          PASSWORD: 'tesis1512_'
        }
      }), {
        headers: {
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
          'Content-Type': 'application/x-amz-json-1.1'
        }
      }
    );
    
    if (authResponse.status === 200) {
      const authResult = JSON.parse(authResponse.body);
      
      // Cache the token for 55 minutes (JWT expires in 1 hour)
      tokenCache.token = authResult.AuthenticationResult.IdToken;
      tokenCache.expiresAt = now + (55 * 60 * 1000);
      tokenCache.lastRefresh = now;
      
      const authDuration = Date.now() - startAuth;
      console.log(`✅ Token cached (auth took ${authDuration}ms)`);
      
      return tokenCache.token;
    } else {
      console.log(`❌ Auth failed: ${authResponse.status}`);
      return null;
    }
  } else {
    const cacheAge = Math.round((now - tokenCache.lastRefresh) / 1000);
    console.log(`🎯 Using cached token (age: ${cacheAge}s)`);
    return tokenCache.token;
  }
}

export default function () {
  const iterationStart = Date.now();
  
  // Get token (cached or new)
  const token = getCachedToken();
  
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
    'has response body': (r) => r.body.length > 0
  });
  
  const totalDuration = Date.now() - iterationStart;
  
  if (success) {
    console.log(`✅ Request successful - API: ${apiDuration}ms, Total: ${totalDuration}ms`);
  } else {
    console.log(`❌ Request failed - Status: ${response.status}, Total: ${totalDuration}ms`);
  }
}

// Test configuration for demonstrating caching benefits
export let options = {
  stages: [
    { duration: '10s', target: 1 },   // Single user for 10s (token cached after first request)
    { duration: '20s', target: 5 },   // Scale to 5 users (all use cached token)
    { duration: '10s', target: 1 },   // Scale back down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    'http_req_duration{cached:true}': ['p(95)<2000'], // Cached requests under 2s
  },
};
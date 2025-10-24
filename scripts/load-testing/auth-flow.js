// Authentication flow testing for both admin and store endpoints
import { group, sleep } from 'k6';
import { check } from 'k6';
import { vu } from 'k6/execution';
import { getConfig } from './config/environment.js';
import { 
  getApiKey, 
  getAdminHeaders, 
  authenticateUser, 
  getJwtToken, 
  validateJwtToken,
  testAuthentication,
  refreshAllTokens 
} from './config/auth.js';
import { AdminOperations } from './test-scenarios/admin-operations.js';
import { StoreOperations } from './test-scenarios/store-operations.js';
import { MetricsCollector } from './utils/metrics.js';

// Load configuration
const config = getConfig(process.env.NODE_ENV || 'development');

export const options = {
  stages: [
    { duration: '30s', target: 3 },
    { duration: '1m', target: 8 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
    auth_operation_duration: ['p(95)<2000'],
    auth_success_rate: ['rate>0.98']
  },
  ext: {
    loadimpact: {
      name: 'PetStore FaaS - Authentication Flow Test'
    }
  }
};

export function setup() {
  console.log('🔐 Starting Authentication Flow Test');
  console.log('Testing both API Key (admin) and JWT (store) authentication');
  
  // Test authentication setup
  const authResults = testAuthentication();
  
  console.log(`API Key Auth: ${authResults.apiKey ? '✅' : '❌'}`);
  console.log(`JWT Auth: ${authResults.jwtAuth ? '✅' : '❌'}`);
  console.log(`Authenticated Users: ${authResults.userCount}`);
  
  if (authResults.errors.length > 0) {
    console.log('Auth Errors:');
    authResults.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (!authResults.apiKey && !authResults.jwtAuth) {
    throw new Error('Both authentication methods failed');
  }
  
  return authResults;
}

export default function (data) {
  const vuId = vu.idInTest;
  
  group('API Key Authentication Tests', function () {
    if (data.apiKey) {
      testApiKeyAuth(vuId);
    } else {
      console.log('⚠️ Skipping API Key tests - authentication not available');
    }
  });
  
  sleep(1);
  
  group('JWT Authentication Tests', function () {
    if (data.jwtAuth) {
      testJwtAuth(vuId);
    } else {
      console.log('⚠️ Skipping JWT tests - authentication not available');
    }
  });
  
  sleep(1);
  
  group('Authentication Error Scenarios', function () {
    testAuthErrorScenarios();
  });
  
  sleep(2);
}

function testApiKeyAuth(vuId) {
  const adminOps = new AdminOperations(config);
  
  group('Valid API Key Operations', function () {
    // Test franchise operations with valid API key
    const listResponse = adminOps.listFranchises();
    const isSuccess = check(listResponse, {
      'API key auth successful': (r) => r.status === 200,
      'response has content': (r) => r.body && r.body.length > 0
    });
    
    MetricsCollector.recordAuthOperation(listResponse, 'api_key_valid');
    
    if (isSuccess) {
      // Test store operations with valid API key
      const storeListResponse = adminOps.listStores();
      check(storeListResponse, {
        'API key works for stores': (r) => r.status === 200
      });
      
      MetricsCollector.recordAuthOperation(storeListResponse, 'api_key_store_access');
    }
  });
  
  group('API Key Validation', function () {
    // Verify API key format and accessibility
    const apiKey = getApiKey();
    check(null, {
      'API key is configured': () => apiKey && apiKey.length > 0,
      'API key is not placeholder': () => apiKey !== 'your-admin-api-key-here'
    });
    
    // Test headers generation
    const headers = getAdminHeaders();
    check(null, {
      'Admin headers contain API key': () => headers['x-api-key'] === apiKey,
      'Admin headers have content type': () => headers['Content-Type'] === 'application/json'
    });
  });
}

function testJwtAuth(vuId) {
  const storeOps = new StoreOperations(config);
  const testUsers = config.store.cognito.testUsers;
  
  if (!testUsers || testUsers.length === 0) {
    console.log('⚠️ No test users configured for JWT authentication');
    return;
  }
  
  group('JWT Token Generation', function () {
    // Test JWT token generation for different users
    testUsers.forEach((user, index) => {
      if (index < 3) { // Limit to first 3 users to control load
        const startTime = Date.now();
        const token = authenticateUser(user.username, user.password);
        const duration = Date.now() - startTime;
        
        const isValid = validateJwtToken(token);
        
        check(null, {
          [`JWT generated for ${user.username}`]: () => !!token,
          [`JWT valid for ${user.username}`]: () => isValid,
          [`JWT generation time acceptable for ${user.username}`]: () => duration < 5000
        });
        
        // Record authentication metrics
        MetricsCollector.recordAuthOperation({
          status: token ? 200 : 401,
          timings: { duration }
        }, 'jwt_generation');
      }
    });
  });
  
  group('JWT Store Operations', function () {
    const userIndex = vuId % testUsers.length;
    const storeId = config.store.defaultStores[0];
    
    // Test store operations with JWT
    const searchResponse = storeOps.searchPets(storeId, userIndex);
    const isAuthorized = check(searchResponse, {
      'JWT auth successful for store': (r) => r.status === 200,
      'JWT response indicates authorization': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.decision === 'ALLOW';
        } catch (e) {
          return false;
        }
      }
    });
    
    MetricsCollector.recordAuthOperation(searchResponse, 'jwt_store_access');
    
    if (isAuthorized) {
      // Test inventory access
      const inventoryResponse = storeOps.getInventory(storeId, userIndex);
      check(inventoryResponse, {
        'JWT works for inventory': (r) => r.status === 200
      });
      
      MetricsCollector.recordAuthOperation(inventoryResponse, 'jwt_inventory_access');
    }
  });
  
  group('JWT Token Validation', function () {
    // Test token validation and extraction
    const userIndex = vuId % testUsers.length;
    const token = getJwtToken(userIndex);
    
    if (token) {
      const isValid = validateJwtToken(token);
      check(null, {
        'JWT token structure valid': () => isValid,
        'JWT token not expired': () => {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
          } catch (e) {
            return false;
          }
        }
      });
    }
  });
}

function testAuthErrorScenarios() {
  const adminOps = new AdminOperations(config);
  const storeOps = new StoreOperations(config);
  
  group('API Key Error Scenarios', function () {
    // Test missing API key
    const noKeyResponse = adminOps.testUnauthorizedAccess();
    check(noKeyResponse, {
      'Missing API key returns 403': (r) => r.status === 403 || r.status === 401,
      'Missing API key has error message': (r) => r.body && r.body.includes('key')
    });
    
    MetricsCollector.recordAuthOperation(noKeyResponse, 'api_key_missing');
  });
  
  group('JWT Error Scenarios', function () {
    const storeId = config.store.defaultStores[0];
    
    // Test missing JWT
    const noTokenResponse = storeOps.testUnauthorizedAccess(storeId);
    check(noTokenResponse, {
      'Missing JWT returns 403': (r) => r.status === 403 || r.status === 401,
      'Missing JWT has error message': (r) => r.body && r.body.includes('token')
    });
    
    MetricsCollector.recordAuthOperation(noTokenResponse, 'jwt_missing');
    
    // Test expired JWT
    const expiredTokenResponse = storeOps.testExpiredToken(storeId);
    check(expiredTokenResponse, {
      'Expired JWT returns 403': (r) => r.status === 403 || r.status === 401
    });
    
    MetricsCollector.recordAuthOperation(expiredTokenResponse, 'jwt_expired');
    
    // Test cross-store access (authorization)
    if (config.store.defaultStores.length > 1) {
      const crossStoreResponse = storeOps.testCrossStoreAccess(storeId, 0);
      check(crossStoreResponse, {
        'Cross-store access handled': (r) => r.status === 200 || r.status === 403,
        'Cross-store access has decision': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.decision === 'DENY' || data.decision === 'ALLOW';
          } catch (e) {
            return false;
          }
        }
      });
      
      MetricsCollector.recordAuthOperation(crossStoreResponse, 'jwt_cross_store');
    }
  });
  
  group('Token Refresh Scenarios', function () {
    // Test token refresh mechanism
    const startTime = Date.now();
    refreshAllTokens();
    const refreshDuration = Date.now() - startTime;
    
    check(null, {
      'Token refresh completes quickly': () => refreshDuration < 10000
    });
    
    MetricsCollector.recordAuthOperation({
      status: 200,
      timings: { duration: refreshDuration }
    }, 'token_refresh');
  });
}

export function teardown(data) {
  console.log('🏁 Authentication Flow Test Complete');
  
  console.log('\n🔐 Authentication Summary:');
  console.log(`API Key Authentication: ${data.apiKey ? 'Available' : 'Not Available'}`);
  console.log(`JWT Authentication: ${data.jwtAuth ? 'Available' : 'Not Available'}`);
  console.log(`Test Users: ${data.userCount} successfully authenticated`);
  
  if (data.errors.length > 0) {
    console.log('\n❌ Authentication Errors Encountered:');
    data.errors.forEach(error => console.log(`  - ${error}`));
  }
}

export function handleSummary(data) {
  return {
    'auth-test-results.json': JSON.stringify(data, null, 2),
    stdout: generateAuthSummary(data)
  };
}

function generateAuthSummary(data) {
  let summary = '\n🔐 Authentication Flow Test Results\n';
  summary += '===================================\n\n';
  
  const httpReqs = data.metrics.http_reqs;
  const httpFailed = data.metrics.http_req_failed;
  const authDuration = data.metrics.auth_operation_duration;
  const authSuccess = data.metrics.auth_success_rate;
  
  if (httpReqs) {
    summary += `Total Auth Requests: ${httpReqs.count}\n`;
  }
  
  if (httpFailed) {
    summary += `Auth Failure Rate: ${(httpFailed.rate * 100).toFixed(2)}%\n`;
  }
  
  if (authDuration) {
    summary += `Avg Auth Duration: ${authDuration.avg.toFixed(2)}ms\n`;
    summary += `95th Percentile: ${authDuration['p(95)'].toFixed(2)}ms\n`;
  }
  
  if (authSuccess) {
    summary += `Auth Success Rate: ${(authSuccess.rate * 100).toFixed(2)}%\n`;
  }
  
  summary += '\n📊 Authentication Analysis:\n';
  
  if (authSuccess && authSuccess.rate > 0.98) {
    summary += '✅ Authentication reliability excellent\n';
  } else {
    summary += '⚠️ Authentication reliability issues detected\n';
  }
  
  if (authDuration && authDuration['p(95)'] < 2000) {
    summary += '✅ Authentication performance acceptable\n';
  } else {
    summary += '⚠️ Authentication performance slow\n';
  }
  
  summary += '\n🔑 Authentication Methods Tested:\n';
  summary += '  - API Key Authentication (Admin endpoints)\n';
  summary += '  - JWT Bearer Token (Store endpoints)\n';
  summary += '  - Error scenarios (missing/invalid tokens)\n';
  summary += '  - Cross-store authorization\n';
  summary += '  - Token refresh mechanisms\n';
  
  return summary;
}

// Base64 decode helper for environments without atob
function atob(str) {
  if (typeof globalThis !== 'undefined' && globalThis.atob) {
    return globalThis.atob(str);
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  str = str.replace(/[^A-Za-z0-9+/]/g, '');
  
  while (i < str.length) {
    const encoded1 = chars.indexOf(str.charAt(i++));
    const encoded2 = chars.indexOf(str.charAt(i++));
    const encoded3 = chars.indexOf(str.charAt(i++));
    const encoded4 = chars.indexOf(str.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return result;
}
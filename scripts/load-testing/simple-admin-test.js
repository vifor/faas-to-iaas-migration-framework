// Simple Admin Endpoints Test - Solo API Key Authentication
// Tests básicos para endpoints administrativos usando x-api-key

import http from 'k6/http';
import { check } from 'k6';
import { group, sleep } from 'k6';

// Cargar configuración desde variables de entorno
const BASE_URL = __ENV.FAAS_BASE_URL || 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
const ADMIN_API_KEY = __ENV.FAAS_ADMIN_API_KEY || __ENV.ADMIN_API_KEY;

console.log('🔧 Admin Test Configuration:');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔑 Admin API Key configured: ${ADMIN_API_KEY ? 'Yes' : 'No'}`);

export const options = {
  stages: [
    { duration: '10s', target: 1 },   // Single user start
    { duration: '30s', target: 2 },   // Light load
    { duration: '30s', target: 0 }    // Ramp down
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.1']
  }
};

function getAdminHeaders() {
  return {
    'x-api-key': ADMIN_API_KEY,
    'Content-Type': 'application/json'
  };
}

export default function () {
  const headers = getAdminHeaders();
  
  if (!ADMIN_API_KEY) {
    console.error('❌ ADMIN_API_KEY no está configurado');
    return;
  }

  group('Admin List Operations', function () {
    
    // Test list franchises
    const listFranchisesResponse = http.get(`${BASE_URL}/admin/franchises`, { headers });
    const franchiseListOk = check(listFranchisesResponse, {
      'Admin List Franchises - Status is 200': (r) => r.status === 200,
      'Admin List Franchises - Response time < 3s': (r) => r.timings.duration < 3000,
      'Admin List Franchises - No auth errors': (r) => r.status !== 401 && r.status !== 403
    });
    
    console.log(`📋 List Franchises: ${listFranchisesResponse.status} (${listFranchisesResponse.timings.duration}ms)`);
    
    sleep(1);
    
    // Test list stores
    const listStoresResponse = http.get(`${BASE_URL}/admin/stores`, { headers });
    const storeListOk = check(listStoresResponse, {
      'Admin List Stores - Status is 200': (r) => r.status === 200,
      'Admin List Stores - Response time < 3s': (r) => r.timings.duration < 3000,
      'Admin List Stores - No auth errors': (r) => r.status !== 401 && r.status !== 403
    });
    
    console.log(`🏪 List Stores: ${listStoresResponse.status} (${listStoresResponse.timings.duration}ms)`);
    
  });
  
  sleep(1);
  
  group('Admin Create Operations', function () {
    
    // Create test franchise
    const franchiseData = {
      name: `Test Franchise ${Date.now()}`,
      location: `Test Location ${Date.now()}`,
      description: 'Test franchise created by load test'
    };
    
    const createFranchiseResponse = http.post(`${BASE_URL}/admin/franchises`, JSON.stringify(franchiseData), { headers });
    const franchiseCreateOk = check(createFranchiseResponse, {
      'Admin Create Franchise - Status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'Admin Create Franchise - Response time < 5s': (r) => r.timings.duration < 5000,
      'Admin Create Franchise - No auth errors': (r) => r.status !== 401 && r.status !== 403
    });
    
    console.log(`🏢 Create Franchise: ${createFranchiseResponse.status} (${createFranchiseResponse.timings.duration}ms)`);
    
    // If franchise creation succeeded, try creating a store
    if (createFranchiseResponse.status === 200 || createFranchiseResponse.status === 201) {
      let franchiseId;
      try {
        const franchiseResponse = JSON.parse(createFranchiseResponse.body);
        franchiseId = franchiseResponse.id || `test-${Date.now()}`;
      } catch (e) {
        franchiseId = `test-${Date.now()}`;
      }
      
      sleep(1);
      
      const storeData = {
        name: `Test Store ${Date.now()}`,
        franchiseId: franchiseId,
        address: `Test Address ${Date.now()}`,
        description: 'Test store created by load test'
      };
      
      const createStoreResponse = http.post(`${BASE_URL}/admin/stores`, JSON.stringify(storeData), { headers });
      const storeCreateOk = check(createStoreResponse, {
        'Admin Create Store - Status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'Admin Create Store - Response time < 5s': (r) => r.timings.duration < 5000,
        'Admin Create Store - No auth errors': (r) => r.status !== 401 && r.status !== 403
      });
      
      console.log(`🏪 Create Store: ${createStoreResponse.status} (${createStoreResponse.timings.duration}ms)`);
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  console.log('\n🔑 Simple Admin Test Summary:');
  console.log('==============================');
  console.log(`Duration: ${data.metrics.iteration_duration.avg.toFixed(0)}ms avg`);
  console.log(`HTTP Requests: ${data.metrics.http_reqs.count} total`);
  console.log(`HTTP Failures: ${data.metrics.http_req_failed.rate.toFixed(2)}%`);
  console.log(`Avg Response Time: ${data.metrics.http_req_duration.avg.toFixed(0)}ms`);
  console.log(`P95 Response Time: ${data.metrics.http_req_duration['p(95)'].toFixed(0)}ms`);
  
  return {
    'stdout': JSON.stringify(data, null, 2)
  };
}
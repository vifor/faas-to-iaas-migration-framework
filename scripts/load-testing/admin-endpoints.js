// Dedicated test for administrative endpoints (franchise and store management)
import { group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { vu } from 'k6/execution';
import { getConfig } from './config/environment.js';
import { FranchiseGenerator, StoreGenerator } from './config/test-data.js';
import { AdminValidators } from './utils/validation.js';
import { MetricsCollector } from './utils/metrics.js';
import { AdminOperations } from './test-scenarios/admin-operations.js';

// Load configuration
const config = getConfig(process.env.NODE_ENV || 'development');

// Shared test data for admin operations
const adminTestData = new SharedArray('admin test data', function () {
  return {
    franchises: FranchiseGenerator.generateBatch(50),
    stores: StoreGenerator.generateBatch(100)
  };
});

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 15 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
    admin_operation_duration: ['p(95)<4000'],
    admin_success_rate: ['rate>0.98']
  },
  ext: {
    loadimpact: {
      name: 'PetStore FaaS - Admin Endpoints Test'
    }
  }
};

export function setup() {
  console.log('🔧 Starting Admin Endpoints Load Test');
  console.log(`Admin API Base URL: ${config.baseUrl}${config.admin.basePath}`);
  
  // Test API key authentication
  const adminOps = new AdminOperations(config);
  const testResponse = adminOps.listFranchises();
  
  if (testResponse.status !== 200) {
    console.error('❌ Admin API authentication failed');
    console.error(`Status: ${testResponse.status}, Body: ${testResponse.body}`);
    throw new Error('Admin API authentication failed');
  }
  
  console.log('✅ Admin API authentication successful');
  return adminTestData;
}

export default function (data) {
  const vuId = vu.idInTest;
  const adminOps = new AdminOperations(config);
  
  group('Admin Franchise Operations', function () {
    // Select test data for this VU
    const franchise = data.franchises[vuId % data.franchises.length];
    
    group('Franchise CRUD Operations', function () {
      // Create franchise
      const createResponse = adminOps.createFranchise(franchise);
      AdminValidators.validateFranchiseCreate(createResponse);
      MetricsCollector.recordAdminOperation(createResponse, 'create_franchise');
      
      if (createResponse.status === 201) {
        sleep(0.5); // Brief pause between operations
        
        // Read franchise
        const getResponse = adminOps.getFranchise(franchise.id);
        AdminValidators.validateFranchiseGet(getResponse, franchise.id);
        MetricsCollector.recordAdminOperation(getResponse, 'get_franchise');
        
        sleep(0.5);
        
        // Update franchise
        const updateData = FranchiseGenerator.generateUpdate(franchise);
        const updateResponse = adminOps.updateFranchise(updateData);
        MetricsCollector.recordAdminOperation(updateResponse, 'update_franchise');
        
        sleep(0.5);
        
        // List franchises
        const listResponse = adminOps.listFranchises();
        AdminValidators.validateFranchiseList(listResponse);
        MetricsCollector.recordAdminOperation(listResponse, 'list_franchises');
        
        // Optionally delete franchise for cleanup
        if (Math.random() < 0.1) { // 10% chance to clean up
          sleep(0.5);
          const deleteResponse = adminOps.deleteFranchise(franchise.id);
          MetricsCollector.recordAdminOperation(deleteResponse, 'delete_franchise');
        }
      }
    });
    
    group('Franchise Query Operations', function () {
      // Test different query methods
      const queryResponse = adminOps.getFranchisesByID(franchise.id);
      MetricsCollector.recordAdminOperation(queryResponse, 'query_franchises');
    });
  });
  
  sleep(1); // Pause between major operation groups
  
  group('Admin Store Operations', function () {
    // Select test data for this VU
    const store = data.stores[vuId % data.stores.length];
    
    group('Store CRUD Operations', function () {
      // Create store
      const createResponse = adminOps.createStore(store);
      AdminValidators.validateStoreCreate(createResponse);
      MetricsCollector.recordAdminOperation(createResponse, 'create_store');
      
      if (createResponse.status === 201) {
        sleep(0.5);
        
        // Read store
        const getResponse = adminOps.getStore(store.id, store.value);
        AdminValidators.validateStoreGet(getResponse, store.id);
        MetricsCollector.recordAdminOperation(getResponse, 'get_store');
        
        sleep(0.5);
        
        // Update store
        const updateData = StoreGenerator.generateUpdate(store);
        const updateResponse = adminOps.updateStore(updateData);
        MetricsCollector.recordAdminOperation(updateResponse, 'update_store');
        
        sleep(0.5);
        
        // List stores
        const listResponse = adminOps.listStores();
        AdminValidators.validateStoreList(listResponse);
        MetricsCollector.recordAdminOperation(listResponse, 'list_stores');
        
        // Optionally delete store for cleanup
        if (Math.random() < 0.1) { // 10% chance to clean up
          sleep(0.5);
          const deleteResponse = adminOps.deleteStore(store.id, store.value);
          MetricsCollector.recordAdminOperation(deleteResponse, 'delete_store');
        }
      }
    });
    
    group('Store Query Operations', function () {
      // Test different query methods
      const queryResponse = adminOps.getStoresByID(store.id);
      MetricsCollector.recordAdminOperation(queryResponse, 'query_stores');
    });
  });
  
  // Error scenarios (run occasionally)
  if (Math.random() < 0.05) { // 5% chance to run error scenarios
    group('Error Scenarios', function () {
      // Test unauthorized access
      const unauthorizedResponse = adminOps.testUnauthorizedAccess();
      MetricsCollector.recordAdminOperation(unauthorizedResponse, 'unauthorized_test');
      
      // Test invalid data
      const invalidDataResponse = adminOps.testInvalidFranchiseData();
      MetricsCollector.recordAdminOperation(invalidDataResponse, 'invalid_data_test');
      
      // Test non-existent resource
      const notFoundResponse = adminOps.testNonExistentFranchise();
      MetricsCollector.recordAdminOperation(notFoundResponse, 'not_found_test');
    });
  }
  
  // Think time between iterations
  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  console.log('🏁 Admin Endpoints Load Test Complete');
  
  // Generate admin-specific metrics summary
  console.log('=== Admin Operations Summary ===');
  console.log(`Base URL: ${config.baseUrl}${config.admin.basePath}`);
  console.log('==============================');
}

export function handleSummary(data) {
  return {
    'admin-test-results.json': JSON.stringify(data, null, 2),
    stdout: generateAdminSummary(data)
  };
}

function generateAdminSummary(data) {
  let summary = '\n🔧 Admin Endpoints Load Test Results\n';
  summary += '=====================================\n\n';
  
  const httpReqs = data.metrics.http_reqs;
  const httpDuration = data.metrics.http_req_duration;
  const httpFailed = data.metrics.http_req_failed;
  const adminDuration = data.metrics.admin_operation_duration;
  const adminSuccess = data.metrics.admin_success_rate;
  
  if (httpReqs) {
    summary += `Total Requests: ${httpReqs.count}\n`;
    summary += `Request Rate: ${httpReqs.rate.toFixed(2)}/sec\n`;
  }
  
  if (httpDuration) {
    summary += `Avg Response Time: ${httpDuration.avg.toFixed(2)}ms\n`;
    summary += `95th Percentile: ${httpDuration['p(95)'].toFixed(2)}ms\n`;
  }
  
  if (httpFailed) {
    summary += `Failure Rate: ${(httpFailed.rate * 100).toFixed(2)}%\n`;
  }
  
  if (adminDuration) {
    summary += `\nAdmin Operations:\n`;
    summary += `  Avg Duration: ${adminDuration.avg.toFixed(2)}ms\n`;
    summary += `  95th Percentile: ${adminDuration['p(95)'].toFixed(2)}ms\n`;
  }
  
  if (adminSuccess) {
    summary += `  Success Rate: ${(adminSuccess.rate * 100).toFixed(2)}%\n`;
  }
  
  // Performance analysis
  summary += '\n📊 Performance Analysis:\n';
  
  if (httpDuration && httpDuration['p(95)'] < 3000) {
    summary += '✅ 95th percentile response time within acceptable limits\n';
  } else {
    summary += '⚠️  95th percentile response time exceeds 3 seconds\n';
  }
  
  if (httpFailed && httpFailed.rate < 0.05) {
    summary += '✅ Error rate within acceptable limits (< 5%)\n';
  } else {
    summary += '❌ Error rate exceeds acceptable limits (>= 5%)\n';
  }
  
  if (adminSuccess && adminSuccess.rate > 0.98) {
    summary += '✅ Admin operation success rate excellent (> 98%)\n';
  } else {
    summary += '⚠️  Admin operation success rate below target (< 98%)\n';
  }
  
  summary += '\n';
  return summary;
}
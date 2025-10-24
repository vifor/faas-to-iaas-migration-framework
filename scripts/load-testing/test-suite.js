// Main test suite for PetStore FaaS application
import { group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { vu } from 'k6/execution';
import { getConfig } from './config/environment.js';
import { getAdminHeaders, getStoreHeaders, refreshAllTokens } from './config/auth.js';
import { FranchiseGenerator, StoreGenerator, ScenarioGenerator } from './config/test-data.js';
import { AdminValidators, StoreValidators } from './utils/validation.js';
import { MetricsCollector, MetricsDashboard } from './utils/metrics.js';
import { AdminOperations } from './test-scenarios/admin-operations.js';
import { StoreOperations } from './test-scenarios/store-operations.js';

// Load configuration
const config = getConfig(process.env.NODE_ENV || 'development');

// Shared test data
const testData = new SharedArray('test data', function () {
  return ScenarioGenerator.generateMixedWorkflow();
});

// Test configuration can be overridden by command line options
export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
    admin_operation_duration: ['p(95)<3000'],
    store_operation_duration: ['p(95)<2000'],
    admin_success_rate: ['rate>0.95'],
    store_success_rate: ['rate>0.95']
  }
};

// Setup function - runs once before all VUs start
export function setup() {
  console.log('🚀 Starting PetStore FaaS Load Test');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Test Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Pre-authenticate users to avoid auth overhead during test
  refreshAllTokens();
  
  // Generate test data for the test
  const setupData = {
    testFranchises: FranchiseGenerator.generateBatch(10),
    testStores: StoreGenerator.generateBatch(20),
    testScenarios: Array.from({ length: 5 }, () => ScenarioGenerator.generateMixedWorkflow())
  };
  
  console.log(`Generated ${setupData.testFranchises.length} test franchises`);
  console.log(`Generated ${setupData.testStores.length} test stores`);
  console.log(`Generated ${setupData.testScenarios.length} test scenarios`);
  
  return setupData;
}

// Main test function - runs for each VU iteration
export default function (data) {
  const vuId = vu.idInTest;
  const iterationData = data.testScenarios[vuId % data.testScenarios.length];
  
  // Record concurrent users
  MetricsCollector.recordConcurrentUsers(vu.idInTest);
  
  group('Complete Business Workflow', function () {
    // Run admin operations (franchise and store management)
    group('Admin Operations', function () {
      runAdminWorkflow(iterationData, vuId);
    });
    
    // Brief pause between operation groups
    sleep(Math.random() * 2 + 1);
    
    // Run store operations (customer-facing operations)
    group('Store Operations', function () {
      runStoreWorkflow(iterationData, vuId);
    });
  });
  
  // Think time between iterations
  const thinkTime = Math.random() * 
    (config.loadTest.thinkTime.max - config.loadTest.thinkTime.min) + 
    config.loadTest.thinkTime.min;
  
  sleep(thinkTime / 1000);
}

/**
 * Execute admin workflow (franchise and store management)
 */
function runAdminWorkflow(scenarioData, vuId) {
  const adminOps = new AdminOperations(config);
  
  group('Franchise Management', function () {
    // Create a test franchise
    const franchise = scenarioData.franchise;
    const createResponse = adminOps.createFranchise(franchise);
    AdminValidators.validateFranchiseCreate(createResponse);
    MetricsCollector.recordAdminOperation(createResponse, 'create_franchise');
    
    if (createResponse.status === 201) {
      // Get the created franchise
      const getResponse = adminOps.getFranchise(franchise.id);
      AdminValidators.validateFranchiseGet(getResponse, franchise.id);
      MetricsCollector.recordAdminOperation(getResponse, 'get_franchise');
      
      // Update the franchise
      const updateData = { ...franchise, name: `${franchise.name} - Updated` };
      const updateResponse = adminOps.updateFranchise(updateData);
      MetricsCollector.recordAdminOperation(updateResponse, 'update_franchise');
      
      // List all franchises
      const listResponse = adminOps.listFranchises();
      AdminValidators.validateFranchiseList(listResponse);
      MetricsCollector.recordAdminOperation(listResponse, 'list_franchises');
    }
  });
  
  group('Store Management', function () {
    // Create stores for the franchise
    scenarioData.stores.forEach((store, index) => {
      if (index < 2) { // Limit to 2 stores per iteration to control load
        const createResponse = adminOps.createStore(store);
        AdminValidators.validateStoreCreate(createResponse);
        MetricsCollector.recordAdminOperation(createResponse, 'create_store');
        
        if (createResponse.status === 201) {
          // Get the created store
          const getResponse = adminOps.getStore(store.id, store.value);
          AdminValidators.validateStoreGet(getResponse, store.id);
          MetricsCollector.recordAdminOperation(getResponse, 'get_store');
        }
      }
    });
    
    // List all stores
    const listResponse = adminOps.listStores();
    AdminValidators.validateStoreList(listResponse);
    MetricsCollector.recordAdminOperation(listResponse, 'list_stores');
  });
}

/**
 * Execute store workflow (customer-facing operations)
 */
function runStoreWorkflow(scenarioData, vuId) {
  const storeOps = new StoreOperations(config);
  const storeId = scenarioData.storeId || config.store.defaultStores[0];
  const userIndex = vuId % config.store.cognito.testUsers.length;
  
  group('Pet Operations', function () {
    // Search for pets in the store
    const searchResponse = storeOps.searchPets(storeId, userIndex);
    StoreValidators.validatePetSearch(searchResponse);
    MetricsCollector.recordStoreOperation(searchResponse, 'search_pets', storeId);
    
    // Add pets to the store
    scenarioData.pets.forEach((pet, index) => {
      if (index < 2) { // Limit to 2 pets per iteration
        const addResponse = storeOps.addPet(storeId, pet, userIndex);
        StoreValidators.validatePetCreate(addResponse);
        MetricsCollector.recordStoreOperation(addResponse, 'add_pet', storeId);
      }
    });
  });
  
  group('Inventory Operations', function () {
    // Check store inventory
    const inventoryResponse = storeOps.getInventory(storeId, userIndex);
    StoreValidators.validateInventory(inventoryResponse);
    MetricsCollector.recordStoreOperation(inventoryResponse, 'get_inventory', storeId);
  });
  
  group('Order Operations', function () {
    // List existing orders
    const listOrdersResponse = storeOps.listOrders(storeId, userIndex);
    StoreValidators.validateOrderList(listOrdersResponse);
    MetricsCollector.recordStoreOperation(listOrdersResponse, 'list_orders', storeId);
    
    // Place new orders
    scenarioData.orders.forEach((order, index) => {
      if (index < 1) { // Limit to 1 order per iteration
        const orderResponse = storeOps.placeOrder(storeId, order, userIndex);
        StoreValidators.validateOrderCreate(orderResponse);
        MetricsCollector.recordStoreOperation(orderResponse, 'place_order', storeId);
      }
    });
  });
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  console.log('🏁 PetStore FaaS Load Test Complete');
  
  // Generate and display metrics summary
  MetricsDashboard.logSummaryReport();
  
  // Cleanup operations could go here
  // (e.g., delete test data, reset system state)
  
  console.log('✅ Test teardown complete');
}

// Handle data for different test types
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Text summary helper
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors;
  
  let summary = '\n' + indent + '✓ PetStore FaaS Load Test Results\n';
  summary += indent + '=====================================\n\n';
  
  // Test duration
  summary += indent + `Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s\n`;
  
  // HTTP metrics
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  
  if (httpReqs) {
    summary += indent + `HTTP Requests: ${Math.round(httpReqs.count)} (${Math.round(httpReqs.rate)}/s)\n`;
  }
  
  if (httpReqDuration) {
    summary += indent + `Response Time: avg=${Math.round(httpReqDuration.avg)}ms p(95)=${Math.round(httpReqDuration['p(95)'])}ms\n`;
  }
  
  if (httpReqFailed) {
    const failRate = (httpReqFailed.rate * 100).toFixed(2);
    summary += indent + `Failure Rate: ${failRate}%\n`;
  }
  
  // Custom metrics
  const adminOps = data.metrics.admin_operation_duration;
  const storeOps = data.metrics.store_operation_duration;
  
  if (adminOps) {
    summary += indent + `Admin Operations: avg=${Math.round(adminOps.avg)}ms p(95)=${Math.round(adminOps['p(95)'])}ms\n`;
  }
  
  if (storeOps) {
    summary += indent + `Store Operations: avg=${Math.round(storeOps.avg)}ms p(95)=${Math.round(storeOps['p(95)'])}ms\n`;
  }
  
  summary += '\n';
  return summary;
}
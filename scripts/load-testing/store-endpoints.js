// Dedicated test for store endpoints (customer-facing operations with authorization)
import { group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { vu } from 'k6/execution';
import { getConfig } from './config/environment.js';
import { refreshAllTokens } from './config/auth.js';
import { PetGenerator, OrderGenerator, ScenarioGenerator } from './config/test-data.js';
import { StoreValidators } from './utils/validation.js';
import { MetricsCollector } from './utils/metrics.js';
import { StoreOperations } from './test-scenarios/store-operations.js';

// Load configuration
const config = getConfig(process.env.NODE_ENV || 'development');

// Shared test data for store operations
const storeTestData = new SharedArray('store test data', function () {
  return {
    pets: PetGenerator.generateBatch(100),
    orders: OrderGenerator.generateBatch(50),
    scenarios: Array.from({ length: 20 }, () => ScenarioGenerator.generateStoreWorkflow())
  };
});

export const options = {
  stages: [
    { duration: '30s', target: 3 },
    { duration: '2m', target: 10 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
    store_operation_duration: ['p(95)<2500'],
    store_success_rate: ['rate>0.95'],
    auth_success_rate: ['rate>0.99']
  },
  ext: {
    loadimpact: {
      name: 'PetStore FaaS - Store Endpoints Test'
    }
  }
};

export function setup() {
  console.log('🏪 Starting Store Endpoints Load Test');
  console.log(`Store API Base URL: ${config.baseUrl}${config.store.basePath}`);
  
  // Pre-authenticate all test users
  console.log('🔐 Pre-authenticating test users...');
  refreshAllTokens();
  
  // Test store API authentication with first user
  const storeOps = new StoreOperations(config);
  const testStoreId = config.store.defaultStores[0];
  const testResponse = storeOps.searchPets(testStoreId, 0);
  
  if (testResponse.status !== 200) {
    console.error('❌ Store API authentication failed');
    console.error(`Status: ${testResponse.status}, Body: ${testResponse.body}`);
    throw new Error('Store API authentication failed');
  }
  
  console.log('✅ Store API authentication successful');
  console.log(`Available test stores: ${config.store.defaultStores.join(', ')}`);
  console.log(`Test users configured: ${config.store.cognito.testUsers.length}`);
  
  return storeTestData;
}

export default function (data) {
  const vuId = vu.idInTest;
  const storeOps = new StoreOperations(config);
  
  // Distribute users across available stores and test users
  const storeId = config.store.defaultStores[vuId % config.store.defaultStores.length];
  const userIndex = vuId % config.store.cognito.testUsers.length;
  
  group(`Store Operations - ${storeId}`, function () {
    
    group('Pet Management', function () {
      // Search for pets (most common operation)
      const searchResponse = storeOps.searchPets(storeId, userIndex);
      StoreValidators.validatePetSearch(searchResponse);
      MetricsCollector.recordStoreOperation(searchResponse, 'search_pets', storeId);
      
      sleep(0.5);
      
      // Add new pet (less frequent operation)
      if (Math.random() < 0.7) { // 70% chance
        const pet = data.pets[vuId % data.pets.length];
        const addResponse = storeOps.addPet(storeId, pet, userIndex);
        StoreValidators.validatePetCreate(addResponse);
        MetricsCollector.recordStoreOperation(addResponse, 'add_pet', storeId);
        
        // Sometimes update the pet right after adding
        if (Math.random() < 0.3) { // 30% chance
          sleep(0.5);
          const petId = `pet-${Date.now()}-${vuId}`;
          const updateData = PetGenerator.generateUpdate(pet);
          const updateResponse = storeOps.updatePet(storeId, petId, updateData, userIndex);
          MetricsCollector.recordStoreOperation(updateResponse, 'update_pet', storeId);
        }
      }
      
      // Get specific pet (occasional operation)
      if (Math.random() < 0.4) { // 40% chance
        sleep(0.5);
        const petId = `pet-demo-${vuId}`;
        const getResponse = storeOps.getPet(storeId, petId, userIndex);
        MetricsCollector.recordStoreOperation(getResponse, 'get_pet', storeId);
      }
    });
    
    sleep(1); // Brief pause between operation groups
    
    group('Inventory Management', function () {
      // Check inventory (frequent operation)
      const inventoryResponse = storeOps.getInventory(storeId, userIndex);
      StoreValidators.validateInventory(inventoryResponse);
      MetricsCollector.recordStoreOperation(inventoryResponse, 'get_inventory', storeId);
    });
    
    sleep(0.5);
    
    group('Order Management', function () {
      // List orders (frequent operation)
      const listResponse = storeOps.listOrders(storeId, userIndex);
      StoreValidators.validateOrderList(listResponse);
      MetricsCollector.recordStoreOperation(listResponse, 'list_orders', storeId);
      
      // Place new order (moderate frequency)
      if (Math.random() < 0.6) { // 60% chance
        sleep(0.5);
        const order = data.orders[vuId % data.orders.length];
        const placeResponse = storeOps.placeOrder(storeId, order, userIndex);
        StoreValidators.validateOrderCreate(placeResponse);
        MetricsCollector.recordStoreOperation(placeResponse, 'place_order', storeId);
        
        // Sometimes get the order details right after placing
        if (Math.random() < 0.5) { // 50% chance
          sleep(0.5);
          const orderNumber = `order-${Date.now()}-${vuId}`;
          const getOrderResponse = storeOps.getOrder(storeId, orderNumber, userIndex);
          MetricsCollector.recordStoreOperation(getOrderResponse, 'get_order', storeId);
        }
      }
      
      // Cancel order (rare operation)
      if (Math.random() < 0.1) { // 10% chance
        sleep(0.5);
        const orderNumber = `order-cancel-${vuId}`;
        const cancelResponse = storeOps.cancelOrder(storeId, orderNumber, userIndex);
        MetricsCollector.recordStoreOperation(cancelResponse, 'cancel_order', storeId);
      }
    });
  });
  
  // Simulate realistic user sessions occasionally
  if (Math.random() < 0.2) { // 20% chance
    sleep(1);
    
    group('Customer Session Simulation', function () {
      const session = storeOps.simulateCustomerSession(storeId, userIndex);
      
      session.operations.forEach(op => {
        MetricsCollector.recordStoreOperation(op.response, op.type, storeId);
      });
    });
  }
  
  // Manager operations (less frequent, different user profile)
  if (Math.random() < 0.15) { // 15% chance
    sleep(1);
    
    group('Manager Session Simulation', function () {
      // Use a manager user if available
      const managerUserIndex = config.store.cognito.testUsers.findIndex(u => u.role === 'manager');
      const effectiveUserIndex = managerUserIndex >= 0 ? managerUserIndex : userIndex;
      
      const session = storeOps.simulateManagerSession(storeId, effectiveUserIndex);
      
      session.operations.forEach(op => {
        MetricsCollector.recordStoreOperation(op.response, op.type, storeId);
      });
    });
  }
  
  // Authorization and error testing (rare)
  if (Math.random() < 0.05) { // 5% chance
    sleep(1);
    
    group('Authorization Tests', function () {
      // Test unauthorized access
      const unauthorizedResponse = storeOps.testUnauthorizedAccess(storeId);
      MetricsCollector.recordStoreOperation(unauthorizedResponse, 'unauthorized_test', storeId);
      
      // Test cross-store access
      const crossStoreResponse = storeOps.testCrossStoreAccess(storeId, userIndex);
      MetricsCollector.recordStoreOperation(crossStoreResponse, 'cross_store_test', storeId);
      
      // Test expired token
      const expiredTokenResponse = storeOps.testExpiredToken(storeId);
      MetricsCollector.recordStoreOperation(expiredTokenResponse, 'expired_token_test', storeId);
    });
  }
  
  // Error scenarios (occasional)
  if (Math.random() < 0.05) { // 5% chance
    sleep(1);
    
    group('Error Scenarios', function () {
      // Test invalid pet data
      const invalidPetResponse = storeOps.testInvalidPetData(storeId, userIndex);
      MetricsCollector.recordStoreOperation(invalidPetResponse, 'invalid_pet_test', storeId);
      
      // Test invalid order data
      const invalidOrderResponse = storeOps.testInvalidOrderData(storeId, userIndex);
      MetricsCollector.recordStoreOperation(invalidOrderResponse, 'invalid_order_test', storeId);
      
      // Test non-existent resources
      const notFoundPetResponse = storeOps.testNonExistentPet(storeId, userIndex);
      MetricsCollector.recordStoreOperation(notFoundPetResponse, 'not_found_pet_test', storeId);
    });
  }
  
  // Think time between iterations
  sleep(Math.random() * 4 + 1);
}

export function teardown(data) {
  console.log('🏁 Store Endpoints Load Test Complete');
  
  // Generate store-specific metrics summary
  console.log('=== Store Operations Summary ===');
  console.log(`Base URL: ${config.baseUrl}${config.store.basePath}`);
  console.log(`Stores tested: ${config.store.defaultStores.join(', ')}`);
  console.log(`Users simulated: ${config.store.cognito.testUsers.length}`);
  console.log('==============================');
}

export function handleSummary(data) {
  return {
    'store-test-results.json': JSON.stringify(data, null, 2),
    stdout: generateStoreSummary(data)
  };
}

function generateStoreSummary(data) {
  let summary = '\n🏪 Store Endpoints Load Test Results\n';
  summary += '====================================\n\n';
  
  const httpReqs = data.metrics.http_reqs;
  const httpDuration = data.metrics.http_req_duration;
  const httpFailed = data.metrics.http_req_failed;
  const storeDuration = data.metrics.store_operation_duration;
  const storeSuccess = data.metrics.store_success_rate;
  const authSuccess = data.metrics.auth_success_rate;
  
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
  
  if (storeDuration) {
    summary += `\nStore Operations:\n`;
    summary += `  Avg Duration: ${storeDuration.avg.toFixed(2)}ms\n`;
    summary += `  95th Percentile: ${storeDuration['p(95)'].toFixed(2)}ms\n`;
  }
  
  if (storeSuccess) {
    summary += `  Success Rate: ${(storeSuccess.rate * 100).toFixed(2)}%\n`;
  }
  
  if (authSuccess) {
    summary += `  Auth Success Rate: ${(authSuccess.rate * 100).toFixed(2)}%\n`;
  }
  
  // Store-specific analysis
  summary += '\n📊 Performance Analysis:\n';
  
  if (httpDuration && httpDuration['p(95)'] < 2000) {
    summary += '✅ Store response times within target (< 2s)\n';
  } else {
    summary += '⚠️  Store response times exceed target (>= 2s)\n';
  }
  
  if (httpFailed && httpFailed.rate < 0.1) {
    summary += '✅ Error rate within acceptable limits (< 10%)\n';
  } else {
    summary += '❌ Error rate exceeds acceptable limits (>= 10%)\n';
  }
  
  if (storeSuccess && storeSuccess.rate > 0.95) {
    summary += '✅ Store operation success rate excellent (> 95%)\n';
  } else {
    summary += '⚠️  Store operation success rate below target (< 95%)\n';
  }
  
  if (authSuccess && authSuccess.rate > 0.99) {
    summary += '✅ Authorization success rate excellent (> 99%)\n';
  } else {
    summary += '⚠️  Authorization issues detected (< 99% success)\n';
  }
  
  summary += '\n🔍 Business Operations:\n';
  summary += `  Stores: ${config.store.defaultStores.length} stores tested\n`;
  summary += `  Users: ${config.store.cognito.testUsers.length} user profiles\n`;
  summary += `  Operations: Pet management, orders, inventory\n`;
  
  summary += '\n';
  return summary;
}
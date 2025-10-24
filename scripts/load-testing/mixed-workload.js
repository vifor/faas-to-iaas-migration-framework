// Mixed workload test simulating realistic usage patterns
import { group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { vu } from 'k6/execution';
import { getConfig } from './config/environment.js';
import { refreshAllTokens } from './config/auth.js';
import { ScenarioGenerator } from './config/test-data.js';
import { AdminValidators, StoreValidators } from './utils/validation.js';
import { MetricsCollector, MetricsDashboard } from './utils/metrics.js';
import { AdminOperations } from './test-scenarios/admin-operations.js';
import { StoreOperations } from './test-scenarios/store-operations.js';

// Load configuration
const config = getConfig(process.env.NODE_ENV || 'development');

// Mixed workload scenarios
const mixedWorkloadData = new SharedArray('mixed workload data', function () {
  return Array.from({ length: 30 }, () => ScenarioGenerator.generateMixedWorkflow());
});

export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up
    { duration: '3m', target: 15 },  // Stay at moderate load
    { duration: '2m', target: 25 },  // Increase load
    { duration: '3m', target: 25 },  // Maintain high load
    { duration: '1m', target: 5 },   // Ramp down
    { duration: '30s', target: 0 }   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500'],
    http_req_failed: ['rate<0.15'],
    admin_operation_duration: ['p(95)<3500'],
    store_operation_duration: ['p(95)<2000'],
    admin_success_rate: ['rate>0.90'],
    store_success_rate: ['rate>0.93']
  },
  ext: {
    loadimpact: {
      name: 'PetStore FaaS - Mixed Workload Test'
    }
  }
};

export function setup() {
  console.log('🔄 Starting Mixed Workload Load Test');
  console.log('This test simulates realistic usage patterns with both admin and store operations');
  
  // Pre-authenticate users
  refreshAllTokens();
  
  // Validate both admin and store APIs
  const adminOps = new AdminOperations(config);
  const storeOps = new StoreOperations(config);
  
  const adminTest = adminOps.listFranchises();
  const storeTest = storeOps.searchPets(config.store.defaultStores[0], 0);
  
  if (adminTest.status !== 200 || storeTest.status !== 200) {
    throw new Error('API validation failed during setup');
  }
  
  console.log('✅ Both Admin and Store APIs validated');
  return mixedWorkloadData;
}

export default function (data) {
  const vuId = vu.idInTest;
  const scenario = data[vuId % data.length];
  
  // Simulate user behavior patterns based on VU ID
  const userType = getUserType(vuId);
  
  switch (userType) {
    case 'admin':
      executeAdminWorkflow(scenario, vuId);
      break;
    case 'manager':
      executeManagerWorkflow(scenario, vuId);
      break;
    case 'customer':
      executeCustomerWorkflow(scenario, vuId);
      break;
    case 'mixed':
      executeMixedWorkflow(scenario, vuId);
      break;
  }
  
  // Variable think time based on user type
  const thinkTime = getThinkTime(userType);
  sleep(thinkTime);
}

function getUserType(vuId) {
  // Distribute users across different types
  const mod = vuId % 10;
  if (mod < 2) return 'admin';      // 20% admin users
  if (mod < 4) return 'manager';    // 20% manager users  
  if (mod < 8) return 'customer';   // 40% customer users
  return 'mixed';                   // 20% mixed usage
}

function executeAdminWorkflow(scenario, vuId) {
  const adminOps = new AdminOperations(config);
  
  group('Admin User Session', function () {
    // Admin users primarily manage franchises and stores
    group('Franchise Management', function () {
      const franchise = scenario.franchise;
      
      // Create franchise
      const createResponse = adminOps.createFranchise(franchise);
      AdminValidators.validateFranchiseCreate(createResponse);
      MetricsCollector.recordAdminOperation(createResponse, 'admin_create_franchise');
      
      sleep(1);
      
      // List and review franchises
      const listResponse = adminOps.listFranchises();
      AdminValidators.validateFranchiseList(listResponse);
      MetricsCollector.recordAdminOperation(listResponse, 'admin_list_franchises');
      
      if (createResponse.status === 201) {
        sleep(1);
        
        // Get detailed franchise info
        const getResponse = adminOps.getFranchise(franchise.id);
        AdminValidators.validateFranchiseGet(getResponse, franchise.id);
        MetricsCollector.recordAdminOperation(getResponse, 'admin_get_franchise');
      }
    });
    
    sleep(2); // Pause between major operations
    
    group('Store Management', function () {
      // Create stores for the franchise
      scenario.stores.slice(0, 2).forEach((store, index) => {
        const createResponse = adminOps.createStore(store);
        AdminValidators.validateStoreCreate(createResponse);
        MetricsCollector.recordAdminOperation(createResponse, 'admin_create_store');
        
        if (index === 0 && createResponse.status === 201) {
          sleep(1);
          
          // Get store details
          const getResponse = adminOps.getStore(store.id, store.value);
          AdminValidators.validateStoreGet(getResponse, store.id);
          MetricsCollector.recordAdminOperation(getResponse, 'admin_get_store');
        }
        
        sleep(1);
      });
      
      // List all stores
      const listResponse = adminOps.listStores();
      AdminValidators.validateStoreList(listResponse);
      MetricsCollector.recordAdminOperation(listResponse, 'admin_list_stores');
    });
  });
}

function executeManagerWorkflow(scenario, vuId) {
  const storeOps = new StoreOperations(config);
  const storeId = scenario.storeId || config.store.defaultStores[0];
  const userIndex = vuId % config.store.cognito.testUsers.length;
  
  group('Manager User Session', function () {
    // Managers focus on store operations and inventory management
    group('Inventory Management', function () {
      const inventoryResponse = storeOps.getInventory(storeId, userIndex);
      StoreValidators.validateInventory(inventoryResponse);
      MetricsCollector.recordStoreOperation(inventoryResponse, 'manager_check_inventory', storeId);
      
      sleep(1);
      
      // Add pets to inventory
      scenario.pets.slice(0, 3).forEach((pet, index) => {
        const addResponse = storeOps.addPet(storeId, pet, userIndex);
        StoreValidators.validatePetCreate(addResponse);
        MetricsCollector.recordStoreOperation(addResponse, 'manager_add_pet', storeId);
        
        if (index < 2) sleep(0.5); // Brief pause between additions
      });
    });
    
    sleep(2);
    
    group('Order Management', function () {
      // Review orders
      const listOrdersResponse = storeOps.listOrders(storeId, userIndex);
      StoreValidators.validateOrderList(listOrdersResponse);
      MetricsCollector.recordStoreOperation(listOrdersResponse, 'manager_review_orders', storeId);
      
      sleep(1);
      
      // Process some orders (simulated)
      scenario.orders.slice(0, 2).forEach(order => {
        const orderNumber = `mgr-order-${Date.now()}-${Math.random()}`;
        const getOrderResponse = storeOps.getOrder(storeId, orderNumber, userIndex);
        MetricsCollector.recordStoreOperation(getOrderResponse, 'manager_process_order', storeId);
        
        sleep(0.5);
      });
    });
  });
}

function executeCustomerWorkflow(scenario, vuId) {
  const storeOps = new StoreOperations(config);
  const storeId = config.store.defaultStores[vuId % config.store.defaultStores.length];
  const userIndex = vuId % config.store.cognito.testUsers.length;
  
  group('Customer User Session', function () {
    // Customers primarily search and place orders
    group('Pet Shopping', function () {
      // Search for pets
      const searchResponse = storeOps.searchPets(storeId, userIndex);
      StoreValidators.validatePetSearch(searchResponse);
      MetricsCollector.recordStoreOperation(searchResponse, 'customer_search_pets', storeId);
      
      sleep(2); // Customer browsing time
      
      // Look at specific pets
      const petId = `pet-browse-${vuId}`;
      const getPetResponse = storeOps.getPet(storeId, petId, userIndex);
      MetricsCollector.recordStoreOperation(getPetResponse, 'customer_view_pet', storeId);
      
      sleep(1);
      
      // Check inventory
      const inventoryResponse = storeOps.getInventory(storeId, userIndex);
      StoreValidators.validateInventory(inventoryResponse);
      MetricsCollector.recordStoreOperation(inventoryResponse, 'customer_check_inventory', storeId);
    });
    
    sleep(3); // Decision time
    
    group('Order Placement', function () {
      // Place an order (50% of customers)
      if (Math.random() < 0.5) {
        const order = scenario.orders[0] || {
          petId: `pet-customer-${vuId}`,
          quantity: 1,
          customerId: `customer-${vuId}`
        };
        
        const placeResponse = storeOps.placeOrder(storeId, order, userIndex);
        StoreValidators.validateOrderCreate(placeResponse);
        MetricsCollector.recordStoreOperation(placeResponse, 'customer_place_order', storeId);
        
        sleep(1);
        
        // Check order status
        const orderNumber = `cust-order-${Date.now()}-${vuId}`;
        const getOrderResponse = storeOps.getOrder(storeId, orderNumber, userIndex);
        MetricsCollector.recordStoreOperation(getOrderResponse, 'customer_check_order', storeId);
      }
      
      // View order history
      const listOrdersResponse = storeOps.listOrders(storeId, userIndex);
      StoreValidators.validateOrderList(listOrdersResponse);
      MetricsCollector.recordStoreOperation(listOrdersResponse, 'customer_view_orders', storeId);
    });
  });
}

function executeMixedWorkflow(scenario, vuId) {
  // Mixed users perform both admin and store operations
  const adminOps = new AdminOperations(config);
  const storeOps = new StoreOperations(config);
  const storeId = config.store.defaultStores[0];
  const userIndex = 0; // Use first user for mixed operations
  
  group('Mixed User Session', function () {
    // Start with store operations
    group('Store Operations Phase', function () {
      const searchResponse = storeOps.searchPets(storeId, userIndex);
      StoreValidators.validatePetSearch(searchResponse);
      MetricsCollector.recordStoreOperation(searchResponse, 'mixed_search_pets', storeId);
      
      sleep(1);
      
      const inventoryResponse = storeOps.getInventory(storeId, userIndex);
      StoreValidators.validateInventory(inventoryResponse);
      MetricsCollector.recordStoreOperation(inventoryResponse, 'mixed_check_inventory', storeId);
    });
    
    sleep(2);
    
    // Switch to admin operations
    group('Admin Operations Phase', function () {
      const listFranchisesResponse = adminOps.listFranchises();
      AdminValidators.validateFranchiseList(listFranchisesResponse);
      MetricsCollector.recordAdminOperation(listFranchisesResponse, 'mixed_list_franchises');
      
      sleep(1);
      
      const listStoresResponse = adminOps.listStores();
      AdminValidators.validateStoreList(listStoresResponse);
      MetricsCollector.recordAdminOperation(listStoresResponse, 'mixed_list_stores');
    });
  });
}

function getThinkTime(userType) {
  const baseTimes = {
    admin: { min: 3, max: 8 },      // Admins think longer
    manager: { min: 2, max: 6 },    // Managers are focused
    customer: { min: 1, max: 5 },   // Customers browse quickly
    mixed: { min: 2, max: 7 }       // Mixed usage varies
  };
  
  const times = baseTimes[userType] || baseTimes.customer;
  return Math.random() * (times.max - times.min) + times.min;
}

export function teardown(data) {
  console.log('🏁 Mixed Workload Load Test Complete');
  
  // Display comprehensive metrics
  MetricsDashboard.logSummaryReport();
  
  console.log('\n📊 Mixed Workload Analysis:');
  console.log('Admin operations: Franchise and store management');
  console.log('Manager operations: Inventory and order management');
  console.log('Customer operations: Pet browsing and order placement');
  console.log('Mixed operations: Combined admin and store workflows');
}

export function handleSummary(data) {
  return {
    'mixed-workload-results.json': JSON.stringify(data, null, 2),
    stdout: generateMixedWorkloadSummary(data)
  };
}

function generateMixedWorkloadSummary(data) {
  let summary = '\n🔄 Mixed Workload Load Test Results\n';
  summary += '==================================\n\n';
  
  const httpReqs = data.metrics.http_reqs;
  const httpDuration = data.metrics.http_req_duration;
  const httpFailed = data.metrics.http_req_failed;
  const adminDuration = data.metrics.admin_operation_duration;
  const storeDuration = data.metrics.store_operation_duration;
  const adminSuccess = data.metrics.admin_success_rate;
  const storeSuccess = data.metrics.store_success_rate;
  
  summary += `Test Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s\n`;
  summary += `Total Requests: ${httpReqs ? httpReqs.count : 'N/A'}\n`;
  summary += `Request Rate: ${httpReqs ? httpReqs.rate.toFixed(2) : 'N/A'}/sec\n`;
  summary += `Overall Failure Rate: ${httpFailed ? (httpFailed.rate * 100).toFixed(2) : 'N/A'}%\n\n`;
  
  // Admin operations summary
  if (adminDuration && adminSuccess) {
    summary += `📋 Admin Operations:\n`;
    summary += `  Avg Duration: ${adminDuration.avg.toFixed(2)}ms\n`;
    summary += `  95th Percentile: ${adminDuration['p(95)'].toFixed(2)}ms\n`;
    summary += `  Success Rate: ${(adminSuccess.rate * 100).toFixed(2)}%\n\n`;
  }
  
  // Store operations summary
  if (storeDuration && storeSuccess) {
    summary += `🏪 Store Operations:\n`;
    summary += `  Avg Duration: ${storeDuration.avg.toFixed(2)}ms\n`;
    summary += `  95th Percentile: ${storeDuration['p(95)'].toFixed(2)}ms\n`;
    summary += `  Success Rate: ${(storeSuccess.rate * 100).toFixed(2)}%\n\n`;
  }
  
  // Performance assessment
  summary += `🎯 Performance Assessment:\n`;
  
  if (httpDuration && httpDuration['p(95)'] < 2500) {
    summary += `✅ Mixed workload response times acceptable\n`;
  } else {
    summary += `⚠️  Mixed workload response times high\n`;
  }
  
  if (httpFailed && httpFailed.rate < 0.15) {
    summary += `✅ Mixed workload error rate acceptable\n`;
  } else {
    summary += `❌ Mixed workload error rate too high\n`;
  }
  
  summary += `\n📈 User Type Distribution:\n`;
  summary += `  Admin Users: 20% (Franchise/Store management)\n`;
  summary += `  Manager Users: 20% (Inventory/Order management)\n`;
  summary += `  Customer Users: 40% (Pet browsing/Orders)\n`;
  summary += `  Mixed Users: 20% (Combined operations)\n`;
  
  return summary;
}
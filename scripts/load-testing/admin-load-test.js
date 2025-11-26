// Admin Endpoints Load Test - API Key Authentication Only
// Tests administrative operations using x-api-key headers
// Separate from store operations to isolate API key authentication

import { group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { vu } from 'k6/execution';
import { getConfig } from './config/environment.js';
import { FranchiseGenerator, StoreGenerator, ScenarioGenerator } from './config/test-data.js';
import { AdminValidators } from './utils/validation.js';
import { MetricsCollector, MetricsDashboard } from './utils/metrics.js';
import { AdminOperations } from './test-scenarios/admin-operations.js';

// Load configuration
const config = getConfig(__ENV.NODE_ENV || 'development');

// Shared admin test data
const adminTestData = new SharedArray('admin test data', function () {
  console.log('🔧 Generating admin test data...');
  return Array.from({ length: 15 }, (_, index) => ({
    franchise: FranchiseGenerator.generate({
      id: `test-franchise-${Date.now()}-${index}`,
      namePrefix: `Admin Test Franchise ${index + 1}`,
      locationPrefix: `Admin Test Location ${index + 1}`
    }),
    stores: StoreGenerator.generateBatch(3, {
      franchiseId: `test-franchise-${Date.now()}-${index}`,
      namePrefix: `Admin Test Store ${index + 1}`,
      addressPrefix: `Admin Test Address ${index + 1}`
    })
  }));
});

// Admin-focused test configuration
export const options = {
  // Conservative stages for API Key testing
  stages: [
    { duration: '30s', target: 2 },   // Gentle ramp-up
    { duration: '2m', target: 5 },    // Light sustained load
    { duration: '2m', target: 8 },    // Medium load
    { duration: '1m', target: 10 },   // Peak load (lower than store tests)
    { duration: '30s', target: 0 }    // Ramp-down
  ],
  
  // Admin-specific thresholds (simplified)
  thresholds: {
    http_req_duration: ['p(95)<3000'],           // Admin ops can be slower
    http_req_failed: ['rate<0.05']               // Very low failure rate expected
  },
  
  // Resource limits for admin testing
  maxRedirects: 0,
  userAgent: 'K6-Admin-LoadTest/1.0',
  
  // Admin-specific tags
  tags: {
    test_type: 'admin_endpoints',
    auth_method: 'api_key',
    environment: __ENV.NODE_ENV || 'development'
  }
};

// Setup function - validates admin configuration
export function setup() {
  console.log('🔑 Starting Admin Endpoints Load Test');
  console.log(`Admin API Base URL: ${config.baseUrl}${config.admin.basePath}`);
  console.log(`Authentication: API Key (x-api-key header)`);
  console.log(`Test Environment: ${__ENV.NODE_ENV || 'development'}`);
  console.log(`Admin Timeout: ${config.admin.timeout}ms`);
  
  // Validate admin configuration
  if (!config.admin.apiKey || config.admin.apiKey === '') {
    console.error('❌ Admin API key not configured');
    console.error('💡 Set FAAS_ADMIN_API_KEY or ADMIN_API_KEY environment variable');
    throw new Error('Admin API key required for admin endpoint testing');
  }
  
  console.log('✅ Admin API key configured');
  
  // Test admin connectivity before starting load test
  const adminOps = new AdminOperations(config);
  
  console.log('🔍 Testing admin connectivity...');
  const healthCheck = adminOps.listFranchises();
  
  if (healthCheck.status >= 200 && healthCheck.status < 300) {
    console.log('✅ Admin endpoints accessible');
  } else if (healthCheck.status === 403) {
    console.error('❌ Admin API key authentication failed (403 Forbidden)');
    console.error('💡 Verify ADMIN_API_KEY is correct and has proper permissions');
    throw new Error('Admin API key authentication failed');
  } else if (healthCheck.status === 429) {
    console.warn('⚠️ Rate limiting detected during setup (429 Too Many Requests)');
    console.warn('💡 API Gateway may have restrictive throttling - consider reducing test intensity');
  } else {
    console.warn(`⚠️ Admin connectivity test returned: ${healthCheck.status} ${healthCheck.body}`);
  }
  
  // Generate setup data
  const setupData = {
    adminTestData: adminTestData,
    startTime: new Date(),
    adminConfig: {
      baseUrl: config.baseUrl,
      basePath: config.admin.basePath,
      timeout: config.admin.timeout,
      hasApiKey: !!config.admin.apiKey
    }
  };
  
  console.log(`📊 Generated admin test data for ${adminTestData.length} scenarios`);
  console.log('🚀 Admin load test ready to start');
  
  return setupData;
}

// Main admin test function
export default function () {
  const vuId = vu.idInTest;
  const iterationIndex = (vu.iterationInScenario || 0) % adminTestData.length;
  const testData = adminTestData[iterationIndex];
  
  // Record admin user activity
  MetricsCollector.recordConcurrentUsers(vuId, 'admin');
  
  group('Admin Operations Suite', function () {
    
    // Test franchise management operations
    group('Franchise Management', function () {
      runFranchiseOperations(testData.franchise, vuId);
    });
    
    // Brief pause between operation groups
    sleep(0.5 + Math.random() * 0.5);
    
    // Test store management operations
    group('Store Management', function () {
      runStoreManagementOperations(testData.stores, testData.franchise.id, vuId);
    });
    
    // Brief pause for listing operations
    sleep(0.2 + Math.random() * 0.3);
    
    // Test listing and search operations
    group('List Operations', function () {
      runListOperations(vuId);
    });
  });
  
  // Admin think time (shorter than customer operations)
  const adminThinkTime = 0.5 + Math.random() * 1.5; // 0.5-2 seconds
  sleep(adminThinkTime);
}

/**
 * Test franchise CRUD operations
 */
function runFranchiseOperations(franchise, vuId) {
  const adminOps = new AdminOperations(config);
  
  // Create franchise
  const createResponse = adminOps.createFranchise(franchise);
  AdminValidators.validateFranchiseCreate(createResponse);
  MetricsCollector.recordOperation(createResponse, 'admin_franchise_create', 'admin_franchise_duration');
  
  if (createResponse.status === 201 || createResponse.status === 200) {
    console.log(`✅ VU${vuId}: Created franchise ${franchise.name}`);
    
    // Get the created franchise
    const getResponse = adminOps.getFranchise(franchise.id);
    AdminValidators.validateFranchiseGet(getResponse, franchise.id);
    MetricsCollector.recordOperation(getResponse, 'admin_franchise_get', 'admin_franchise_duration');
    
    // Update franchise
    const updateData = {
      ...franchise,
      name: `${franchise.name} - Updated`,
      description: `Updated by VU${vuId} at ${new Date().toISOString()}`
    };
    
    const updateResponse = adminOps.updateFranchise(updateData);
    MetricsCollector.recordOperation(updateResponse, 'admin_franchise_update', 'admin_franchise_duration');
    
    if (updateResponse.status >= 400) {
      console.warn(`⚠️ VU${vuId}: Franchise update failed: ${updateResponse.status}`);
    }
    
  } else {
    console.warn(`⚠️ VU${vuId}: Franchise creation failed: ${createResponse.status} - ${createResponse.body}`);
    
    // Record API key authentication failures specifically
    if (createResponse.status === 403) {
      MetricsCollector.recordCustomMetric('admin_api_key_failures', 1);
    }
  }
}

/**
 * Test store management operations
 */
function runStoreManagementOperations(stores, franchiseId, vuId) {
  const adminOps = new AdminOperations(config);
  
  // Create stores (limit to 2 per iteration to control load)
  const storesToCreate = stores.slice(0, 2);
  
  storesToCreate.forEach((store, index) => {
    // Ensure store belongs to the test franchise
    const storeData = { ...store, franchiseId: franchiseId };
    
    const createResponse = adminOps.createStore(storeData);
    AdminValidators.validateStoreCreate(createResponse);
    MetricsCollector.recordOperation(createResponse, 'admin_store_create', 'admin_store_duration');
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      console.log(`✅ VU${vuId}: Created store ${storeData.name}`);
      
      // Get the created store
      const getResponse = adminOps.getStore(storeData.id, storeData.value || store.id);
      AdminValidators.validateStoreGet(getResponse, storeData.id);
      MetricsCollector.recordOperation(getResponse, 'admin_store_get', 'admin_store_duration');
      
      // Update store (only for first store to reduce load)
      if (index === 0) {
        const updateData = {
          ...storeData,
          name: `${storeData.name} - Admin Updated`,
          status: 'active'
        };
        
        const updateResponse = adminOps.updateStore(updateData);
        MetricsCollector.recordOperation(updateResponse, 'admin_store_update', 'admin_store_duration');
      }
      
    } else {
      console.warn(`⚠️ VU${vuId}: Store creation failed: ${createResponse.status} - ${createResponse.body}`);
      
      // Record API key authentication failures
      if (createResponse.status === 403) {
        MetricsCollector.recordCustomMetric('admin_api_key_failures', 1);
      }
    }
    
    // Small delay between store operations
    sleep(0.1);
  });
}

/**
 * Test listing and administrative query operations
 */
function runListOperations(vuId) {
  const adminOps = new AdminOperations(config);
  
  // List franchises
  const listFranchisesResponse = adminOps.listFranchises();
  AdminValidators.validateFranchiseList(listFranchisesResponse);
  MetricsCollector.recordOperation(listFranchisesResponse, 'admin_franchise_list', 'admin_list_duration');
  
  if (listFranchisesResponse.status === 200) {
    console.log(`📋 VU${vuId}: Listed franchises successfully`);
  } else if (listFranchisesResponse.status === 403) {
    console.warn(`⚠️ VU${vuId}: Franchise list failed - API key auth issue: 403`);
    MetricsCollector.recordCustomMetric('admin_api_key_failures', 1);
  }
  
  // Brief pause
  sleep(0.1);
  
  // List stores
  const listStoresResponse = adminOps.listStores();
  AdminValidators.validateStoreList(listStoresResponse);
  MetricsCollector.recordOperation(listStoresResponse, 'admin_store_list', 'admin_list_duration');
  
  if (listStoresResponse.status === 200) {
    console.log(`📋 VU${vuId}: Listed stores successfully`);
  } else if (listStoresResponse.status === 403) {
    console.warn(`⚠️ VU${vuId}: Store list failed - API key auth issue: 403`);
    MetricsCollector.recordCustomMetric('admin_api_key_failures', 1);
  }
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Admin Endpoints Load Test Complete');
  console.log(`Test Duration: ${new Date() - data.startTime}ms`);
  
  // Display admin-specific metrics summary
  MetricsDashboard.logAdminSummaryReport();
  
  // Cleanup - could add admin cleanup operations here
  console.log('🧹 Admin test cleanup complete');
  console.log('✅ Admin load test finished');
}

// Custom summary for admin testing
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Generate detailed admin report
  const adminReport = generateAdminReport(data, timestamp);
  
  return {
    [`results/admin-loadtest-${timestamp.split('T')[0]}.json`]: JSON.stringify(data, null, 2),
    [`results/admin-summary-${timestamp.split('T')[0]}.md`]: adminReport,
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

/**
 * Generate admin-specific test report
 */
function generateAdminReport(data, timestamp) {
  let report = `# Admin Endpoints Load Test Report\n\n`;
  report += `**Test Date:** ${timestamp}\n`;
  report += `**Test Type:** Admin Endpoints (API Key Authentication)\n`;
  report += `**Duration:** ${Math.round(data.state.testRunDurationMs / 1000)}s\n\n`;
  
  // Admin API Key Performance
  report += `## Admin API Key Authentication\n\n`;
  const authFailures = data.metrics.admin_api_key_failures;
  if (authFailures) {
    const failureRate = (authFailures.rate * 100).toFixed(2);
    report += `- API Key Failure Rate: ${failureRate}%\n`;
    report += `- Total Auth Failures: ${authFailures.count}\n`;
  } else {
    report += `- API Key Failure Rate: 0.00%\n`;
  }
  
  // Admin Operation Performance
  report += `\n## Admin Operations Performance\n\n`;
  
  ['admin_franchise_duration', 'admin_store_duration', 'admin_list_duration'].forEach(metric => {
    const metricData = data.metrics[metric];
    if (metricData) {
      const operation = metric.replace('admin_', '').replace('_duration', '');
      report += `### ${operation.charAt(0).toUpperCase() + operation.slice(1)} Operations\n`;
      report += `- Average: ${Math.round(metricData.avg)}ms\n`;
      report += `- P95: ${Math.round(metricData['p(95)'])}ms\n`;
      report += `- P99: ${Math.round(metricData['p(99)'])}ms\n\n`;
    }
  });
  
  // HTTP Status Analysis
  report += `## HTTP Status Summary\n\n`;
  const httpReqs = data.metrics.http_reqs;
  const httpReqFailed = data.metrics.http_req_failed;
  
  if (httpReqs && httpReqFailed) {
    const totalRequests = httpReqs.count;
    const failedRequests = Math.round(totalRequests * httpReqFailed.rate);
    const successRequests = totalRequests - failedRequests;
    
    report += `- Total Requests: ${totalRequests}\n`;
    report += `- Successful: ${successRequests} (${((successRequests/totalRequests)*100).toFixed(1)}%)\n`;
    report += `- Failed: ${failedRequests} (${(httpReqFailed.rate*100).toFixed(2)}%)\n`;
  }
  
  // Performance Recommendations
  report += `\n## Recommendations\n\n`;
  
  if (authFailures && authFailures.rate > 0.01) {
    report += `⚠️ **API Key Authentication Issues Detected**\n`;
    report += `   - Check API key configuration and permissions\n`;
    report += `   - Verify API Gateway API key settings\n\n`;
  }
  
  const overallP95 = data.metrics.http_req_duration ? data.metrics.http_req_duration['p(95)'] : 0;
  if (overallP95 > 3000) {
    report += `⚠️ **Performance Issues Detected**\n`;
    report += `   - P95 response time: ${Math.round(overallP95)}ms exceeds 3000ms threshold\n`;
    report += `   - Consider optimizing admin operations or increasing AWS resources\n\n`;
  }
  
  if (!authFailures || authFailures.rate < 0.01) {
    report += `✅ **API Key Authentication Working Correctly**\n`;
    report += `   - No authentication issues detected\n`;
    report += `   - Ready for higher intensity testing\n\n`;
  }
  
  return report;
}

/**
 * Text summary for console output
 */
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  
  let summary = '\n' + indent + '🔑 Admin Endpoints Load Test Results\n';
  summary += indent + '==========================================\n\n';
  
  // Test duration
  summary += indent + `Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s\n`;
  
  // Admin-specific metrics
  const adminKeyFailures = data.metrics.admin_api_key_failures;
  if (adminKeyFailures) {
    summary += indent + `API Key Failures: ${adminKeyFailures.count} (${(adminKeyFailures.rate * 100).toFixed(2)}%)\n`;
  } else {
    summary += indent + `API Key Failures: 0 (0.00%)\n`;
  }
  
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
  
  summary += '\n' + indent + '🎯 Admin-specific metrics available in detailed report\n';
  
  return summary;
}
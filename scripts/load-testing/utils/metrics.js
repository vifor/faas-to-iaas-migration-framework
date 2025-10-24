// Custom metrics collection for K6 load tests
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

/**
 * Custom Metrics Definition
 */

// Response time metrics for different operation types
export const adminOperationDuration = new Trend('admin_operation_duration', true);
export const storeOperationDuration = new Trend('store_operation_duration', true);
export const authOperationDuration = new Trend('auth_operation_duration', true);

// Success rate metrics
export const adminSuccessRate = new Rate('admin_success_rate');
export const storeSuccessRate = new Rate('store_success_rate');
export const authSuccessRate = new Rate('auth_success_rate');

// Business transaction metrics
export const franchiseOperations = new Counter('franchise_operations_total');
export const storeOperations = new Counter('store_operations_total');
export const petOperations = new Counter('pet_operations_total');
export const orderOperations = new Counter('order_operations_total');

// Error tracking metrics
export const authenticationErrors = new Counter('authentication_errors_total');
export const authorizationErrors = new Counter('authorization_errors_total');
export const serverErrors = new Counter('server_errors_total');
export const clientErrors = new Counter('client_errors_total');

// Performance metrics
export const coldStartDuration = new Trend('lambda_cold_start_duration', true);
export const warmRequestDuration = new Trend('lambda_warm_request_duration', true);
export const apiGatewayLatency = new Trend('api_gateway_latency', true);

// Concurrent user metrics
export const activeUsers = new Gauge('active_users');
export const peakConcurrentUsers = new Gauge('peak_concurrent_users');

// Throughput metrics
export const requestThroughput = new Trend('request_throughput_per_second', true);
export const dataThroughput = new Trend('data_throughput_bytes_per_second', true);

/**
 * Metrics Collection Helper Class
 */
export class MetricsCollector {
  static recordAdminOperation(response, operationType) {
    const duration = response.timings.duration;
    const success = response.status >= 200 && response.status < 300;
    
    adminOperationDuration.add(duration, { operation: operationType });
    adminSuccessRate.add(success);
    
    franchiseOperations.add(1, { type: operationType });
    
    if (!success) {
      this.recordError(response, 'admin');
    }
    
    this.detectColdStart(response, operationType);
  }

  static recordStoreOperation(response, operationType, storeId = null) {
    const duration = response.timings.duration;
    const success = response.status >= 200 && response.status < 300;
    
    storeOperationDuration.add(duration, { operation: operationType, store: storeId });
    storeSuccessRate.add(success);
    
    // Categorize store operations
    if (operationType.includes('pet')) {
      petOperations.add(1, { type: operationType });
    } else if (operationType.includes('order')) {
      orderOperations.add(1, { type: operationType });
    } else {
      storeOperations.add(1, { type: operationType });
    }
    
    if (!success) {
      this.recordError(response, 'store');
    }
    
    this.detectColdStart(response, operationType);
  }

  static recordAuthOperation(response, operationType) {
    const duration = response.timings.duration;
    const success = response.status >= 200 && response.status < 300;
    
    authOperationDuration.add(duration, { operation: operationType });
    authSuccessRate.add(success);
    
    if (!success) {
      authenticationErrors.add(1, { operation: operationType });
    }
  }

  static recordError(response, category) {
    const status = response.status;
    
    if (status === 401 || status === 403) {
      if (category === 'admin') {
        authenticationErrors.add(1, { type: 'api_key' });
      } else {
        authorizationErrors.add(1, { type: 'jwt_auth' });
      }
    } else if (status >= 400 && status < 500) {
      clientErrors.add(1, { status: status, category: category });
    } else if (status >= 500) {
      serverErrors.add(1, { status: status, category: category });
    }
  }

  static detectColdStart(response, operationType) {
    const duration = response.timings.duration;
    
    // Heuristic: Requests over 3 seconds are likely cold starts
    if (duration > 3000) {
      coldStartDuration.add(duration, { operation: operationType });
    } else {
      warmRequestDuration.add(duration, { operation: operationType });
    }
  }

  static recordConcurrentUsers(currentVUs) {
    activeUsers.add(currentVUs);
    
    // Track peak concurrent users
    const currentPeak = peakConcurrentUsers.value || 0;
    if (currentVUs > currentPeak) {
      peakConcurrentUsers.add(currentVUs);
    }
  }

  static recordThroughput(requestCount, duration, dataSize = 0) {
    const rps = requestCount / (duration / 1000); // requests per second
    requestThroughput.add(rps);
    
    if (dataSize > 0) {
      const bps = dataSize / (duration / 1000); // bytes per second
      dataThroughput.add(bps);
    }
  }

  static recordApiGatewayLatency(response) {
    // Extract API Gateway specific timing if available in headers
    const apiGatewayTime = response.headers['X-Amzn-Trace-Id'] ? 
      response.timings.waiting : response.timings.duration;
    
    apiGatewayLatency.add(apiGatewayTime);
  }
}

/**
 * Business Metrics Tracker
 */
export class BusinessMetrics {
  static recordFranchiseWorkflow(operations) {
    operations.forEach(op => {
      franchiseOperations.add(1, { workflow_step: op.type });
    });
  }

  static recordStoreWorkflow(operations, storeId) {
    operations.forEach(op => {
      if (op.type.includes('pet')) {
        petOperations.add(1, { workflow_step: op.type, store: storeId });
      } else if (op.type.includes('order')) {
        orderOperations.add(1, { workflow_step: op.type, store: storeId });
      } else {
        storeOperations.add(1, { workflow_step: op.type, store: storeId });
      }
    });
  }

  static recordUserSession(sessionDuration, operationCount, userType) {
    // Record session-level metrics
    const avgOperationTime = sessionDuration / operationCount;
    
    if (userType === 'admin') {
      adminOperationDuration.add(avgOperationTime, { session_metric: true });
    } else {
      storeOperationDuration.add(avgOperationTime, { session_metric: true });
    }
  }
}

/**
 * Performance Analysis Helper
 */
export class PerformanceAnalyzer {
  static analyzeResponsePattern(responses) {
    const analysis = {
      totalRequests: responses.length,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      errorBreakdown: {},
      statusCodeDistribution: {}
    };

    const responseTimes = [];
    
    responses.forEach(response => {
      const duration = response.timings.duration;
      responseTimes.push(duration);
      
      if (response.status >= 200 && response.status < 300) {
        analysis.successfulRequests++;
      } else {
        analysis.failedRequests++;
        
        // Error breakdown
        const errorType = this.categorizeError(response.status);
        analysis.errorBreakdown[errorType] = (analysis.errorBreakdown[errorType] || 0) + 1;
      }
      
      // Status code distribution
      analysis.statusCodeDistribution[response.status] = 
        (analysis.statusCodeDistribution[response.status] || 0) + 1;
      
      // Response time analysis
      analysis.minResponseTime = Math.min(analysis.minResponseTime, duration);
      analysis.maxResponseTime = Math.max(analysis.maxResponseTime, duration);
    });

    // Calculate averages and percentiles
    if (responseTimes.length > 0) {
      analysis.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      analysis.p95ResponseTime = responseTimes[p95Index] || 0;
    }

    return analysis;
  }

  static categorizeError(statusCode) {
    if (statusCode === 401) return 'authentication';
    if (statusCode === 403) return 'authorization';
    if (statusCode === 404) return 'not_found';
    if (statusCode === 429) return 'rate_limit';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  static generatePerformanceReport(testDuration) {
    const report = {
      testDuration: testDuration,
      timestamp: new Date().toISOString(),
      metrics: {
        admin: {
          operationCount: franchiseOperations.count,
          avgDuration: adminOperationDuration.avg,
          successRate: adminSuccessRate.rate * 100
        },
        store: {
          operationCount: storeOperations.count + petOperations.count + orderOperations.count,
          avgDuration: storeOperationDuration.avg,
          successRate: storeSuccessRate.rate * 100
        },
        errors: {
          authentication: authenticationErrors.count,
          authorization: authorizationErrors.count,
          client: clientErrors.count,
          server: serverErrors.count
        },
        performance: {
          coldStarts: coldStartDuration.count,
          avgColdStartTime: coldStartDuration.avg,
          avgWarmRequestTime: warmRequestDuration.avg,
          peakConcurrentUsers: peakConcurrentUsers.value
        }
      }
    };

    return report;
  }
}

/**
 * Real-time Metrics Dashboard
 */
export class MetricsDashboard {
  static logCurrentMetrics() {
    console.log('=== Current Metrics ===');
    console.log(`Admin Operations: ${franchiseOperations.count} (Success Rate: ${(adminSuccessRate.rate * 100).toFixed(2)}%)`);
    console.log(`Store Operations: ${storeOperations.count + petOperations.count + orderOperations.count} (Success Rate: ${(storeSuccessRate.rate * 100).toFixed(2)}%)`);
    console.log(`Active Users: ${activeUsers.value} (Peak: ${peakConcurrentUsers.value})`);
    console.log(`Errors - Auth: ${authenticationErrors.count}, Server: ${serverErrors.count}`);
    console.log(`Avg Response Times - Admin: ${adminOperationDuration.avg?.toFixed(2)}ms, Store: ${storeOperationDuration.avg?.toFixed(2)}ms`);
    console.log('=====================');
  }

  static logSummaryReport() {
    const report = PerformanceAnalyzer.generatePerformanceReport(0);
    console.log('=== Test Summary ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('==================');
  }

  static exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      trends: {
        adminOperationDuration: adminOperationDuration.values,
        storeOperationDuration: storeOperationDuration.values,
        coldStartDuration: coldStartDuration.values
      },
      counters: {
        franchiseOperations: franchiseOperations.count,
        storeOperations: storeOperations.count,
        petOperations: petOperations.count,
        orderOperations: orderOperations.count,
        authenticationErrors: authenticationErrors.count,
        serverErrors: serverErrors.count
      },
      rates: {
        adminSuccessRate: adminSuccessRate.rate,
        storeSuccessRate: storeSuccessRate.rate,
        authSuccessRate: authSuccessRate.rate
      },
      gauges: {
        activeUsers: activeUsers.value,
        peakConcurrentUsers: peakConcurrentUsers.value
      }
    };
  }
}

/**
 * Metric Collection Utilities
 */
export class MetricUtils {
  static startTimer() {
    return Date.now();
  }

  static endTimer(startTime) {
    return Date.now() - startTime;
  }

  static measureOperation(operation, category = 'general') {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function(...args) {
        const startTime = MetricUtils.startTimer();
        
        try {
          const result = originalMethod.apply(this, args);
          const duration = MetricUtils.endTimer(startTime);
          
          // Record successful operation
          if (category === 'admin') {
            adminOperationDuration.add(duration, { operation });
            adminSuccessRate.add(true);
          } else if (category === 'store') {
            storeOperationDuration.add(duration, { operation });
            storeSuccessRate.add(true);
          }
          
          return result;
        } catch (error) {
          const duration = MetricUtils.endTimer(startTime);
          
          // Record failed operation
          if (category === 'admin') {
            adminOperationDuration.add(duration, { operation });
            adminSuccessRate.add(false);
          } else if (category === 'store') {
            storeOperationDuration.add(duration, { operation });
            storeSuccessRate.add(false);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  static resetAllMetrics() {
    // Note: K6 metrics cannot be reset during execution
    // This is a placeholder for potential future functionality
    console.log('Metrics reset requested (not supported in K6)');
  }
}
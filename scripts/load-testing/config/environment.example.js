// Environment configuration for K6 load tests
// Copy this file to environment.js and update with your actual values

export const config = {
  // Base API URL - Update with your actual API Gateway URL
  baseUrl: 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
  
  // Administrative API Configuration
  admin: {
    // API Key for admin endpoints (x-api-key header)
    apiKey: 'your-admin-api-key-here',
    
    // Admin endpoints base path
    basePath: '/admin',
    
    // Default timeout for admin operations (ms)
    timeout: 30000
  },
  
  // Store API Configuration
  store: {
    // Cognito Configuration for JWT authentication
    cognito: {
      region: 'sa-east-1',
      userPoolId: 'sa-east-1_XXXXXXXXX',
      clientId: 'your-cognito-client-id',
      
      // Test user credentials (create test users in your Cognito User Pool)
      testUsers: [
        {
          username: 'testuser1@example.com',
          password: 'TempPassword123!',
          storeId: 'store-001'
        },
        {
          username: 'testuser2@example.com', 
          password: 'TempPassword123!',
          storeId: 'store-002'
        },
        {
          username: 'manager1@example.com',
          password: 'TempPassword123!',
          storeId: 'store-001',
          role: 'manager'
        }
      ]
    },
    
    // Store endpoints base path
    basePath: '/store',
    
    // Default timeout for store operations (ms)
    timeout: 15000,
    
    // Default store IDs for testing
    defaultStores: ['store-001', 'store-002', 'store-003']
  },
  
  // Test Data Configuration
  testData: {
    // Franchise test data
    franchises: {
      namePrefix: 'Test Franchise',
      locationPrefix: 'Test Location',
      maxFranchises: 100
    },
    
    // Store test data
    stores: {
      namePrefix: 'Test Store',
      addressPrefix: 'Test Address',
      maxStores: 200,
      storeTypes: ['main', 'branch', 'outlet']
    },
    
    // Pet test data
    pets: {
      namePrefix: 'Test Pet',
      species: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster'],
      breeds: {
        Dog: ['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog'],
        Cat: ['Persian', 'Siamese', 'Maine Coon', 'British Shorthair'],
        Bird: ['Parakeet', 'Canary', 'Cockatiel', 'Finch'],
        Fish: ['Goldfish', 'Betta', 'Angelfish', 'Guppy'],
        Rabbit: ['Holland Lop', 'Netherland Dwarf', 'Flemish Giant'],
        Hamster: ['Syrian', 'Dwarf', 'Roborovski']
      },
      priceRange: { min: 50, max: 1500 },
      ageRange: { min: 2, max: 120 } // in months
    },
    
    // Order test data
    orders: {
      customerPrefix: 'customer',
      maxCustomers: 1000,
      quantityRange: { min: 1, max: 3 }
    }
  },
  
  // Load Testing Configuration
  loadTest: {
    // Think time between requests (ms)
    thinkTime: { min: 1000, max: 3000 },
    
    // Request timeouts
    timeouts: {
      admin: 30000,
      store: 15000,
      auth: 10000
    },
    
    // Retry configuration
    retries: {
      maxRetries: 3,
      retryDelay: 1000
    },
    
    // Error thresholds
    thresholds: {
      http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
      http_req_failed: ['rate<0.1'],     // Error rate under 10%
      http_reqs: ['rate>10']             // At least 10 requests/sec
    }
  },
  
  // Monitoring and Metrics
  monitoring: {
    // Custom metrics collection
    enableCustomMetrics: true,
    
    // Detailed logging
    enableVerboseLogging: false,
    
    // Performance budgets
    performanceBudgets: {
      adminOperations: 2000,  // ms
      storeOperations: 1500,  // ms
      authOperations: 1000    // ms
    }
  },
  
  // AWS Specific Configuration
  aws: {
    region: 'sa-east-1',
    
    // Lambda configuration expectations
    lambda: {
      coldStartThreshold: 5000, // ms
      warmRequestThreshold: 1000 // ms
    },
    
    // API Gateway configuration
    apiGateway: {
      throttleLimit: 1000, // requests per second
      burstLimit: 2000     // burst capacity
    }
  }
};

// Environment-specific overrides
export const environments = {
  development: {
    baseUrl: 'https://dev-api.petstore.com',
    loadTest: {
      thresholds: {
        http_req_duration: ['p(95)<3000'], // More lenient for dev
        http_req_failed: ['rate<0.2']      // Higher error tolerance
      }
    }
  },
  
  staging: {
    baseUrl: 'https://staging-api.petstore.com',
    loadTest: {
      thresholds: {
        http_req_duration: ['p(95)<2500'],
        http_req_failed: ['rate<0.15']
      }
    }
  },
  
  production: {
    baseUrl: 'https://api.petstore.com',
    loadTest: {
      thresholds: {
        http_req_duration: ['p(95)<1500'], // Stricter for production
        http_req_failed: ['rate<0.05']     // Lower error tolerance
      }
    }
  }
};

// Get configuration for current environment
export function getConfig(env = 'development') {
  const baseConfig = config;
  const envOverrides = environments[env] || {};
  
  // Deep merge configuration
  return mergeDeep(baseConfig, envOverrides);
}

// Deep merge utility function
function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return (item && typeof item === "object" && !Array.isArray(item));
}
// IaaS Test Configuration
// Configuration file for NestJS monolith testing

export const IAAS_CONFIG = {
  // Application settings
  application: {
    name: 'PetStore IaaS',
    baseUrl: 'http://localhost:3000/api/v1',
    healthEndpoint: '/health',
    docsEndpoint: '/api/docs',
    environment: 'development'
  },
  
  // Authentication settings
  authentication: {
    loginEndpoint: '/auth/login',
    validateEndpoint: '/auth/validate',
    profileEndpoint: '/auth/profile',
    refreshEndpoint: '/auth/refresh',
    logoutEndpoint: '/auth/logout',
    tokenType: 'Bearer',
    tokenExpiryHours: 24,
    refreshExpiryDays: 7
  },
  
  // Test users
  users: {
    storeOwner: {
      email: 'owner@store1.petstore.com',
      password: 'SecurePassword123!',
      role: 'store_owner',
      storeId: 'store-001',
      permissions: ['SearchPets', 'AddPet', 'UpdatePet', 'DeletePet']
    },
    storeEmployee: {
      email: 'employee@store1.petstore.com',
      password: process.env.TEST_USER_PASSWORD,
      role: 'store_employee',
      storeId: 'store-001',
      permissions: ['SearchPets', 'AddPet']
    },
    customer: {
      email: 'customer@example.com',
      password: 'SecurePassword123!',
      role: 'customer',
      storeId: null,
      permissions: ['ViewPets']
    }
  },
  
  // API endpoints for testing
  endpoints: {
    // Store operations
    store: {
      listPets: '/store/{storeId}/pets',
      createPet: '/store/{storeId}/pet/create',
      getPet: '/store/{storeId}/pet/get/{petId}',
      updatePet: '/store/{storeId}/pet/update/{petId}',
      deletePet: '/store/{storeId}/pet/delete/{petId}'
    },
    
    // Admin operations
    admin: {
      listStores: '/admin/stores',
      createStore: '/admin/store',
      getStore: '/admin/store/{storeId}',
      updateStore: '/admin/store/{storeId}',
      deleteStore: '/admin/store/{storeId}'
    }
  },
  
  // Performance expectations
  performance: {
    authentication: {
      p50: 50,    // 50ms
      p95: 150,   // 150ms
      p99: 300    // 300ms
    },
    api: {
      p50: 100,   // 100ms
      p95: 300,   // 300ms
      p99: 500    // 500ms
    },
    overall: {
      p50: 150,   // 150ms
      p95: 400,   // 400ms
      p99: 800    // 800ms
    }
  },
  
  // Test scenarios configuration
  scenarios: {
    smoke: {
      duration: '30s',
      users: 1,
      description: 'Smoke test for basic functionality'
    },
    load: {
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 }
      ],
      description: 'Standard load test'
    },
    stress: {
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 }
      ],
      description: 'Stress test to find breaking point'
    },git push origin main --force
    spike: {
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 10 },
        { duration: '1m', target: 0 }
      ],
      description: 'Spike test for sudden load increases'
    }
  },
  
  // Test data
  testData: {
    stores: [
      'store-001',
      'store-002',
      'store-003'
    ],
    pets: [
      {
        name: 'Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 24,
        price: 500
      },
      {
        name: 'Whiskers',
        species: 'Cat',
        breed: 'Persian',
        age: 18,
        price: 300
      },
      {
        name: 'Polly',
        species: 'Bird',
        breed: 'Parrot',
        age: 6,
        price: 200
      }
    ]
  },
  
  // Thresholds for different test types
  thresholds: {
    functional: {
      'http_req_failed': ['rate<0.01'],        // <1% failures
      'http_req_duration': ['p(95)<500']        // 95% under 500ms
    },
    performance: {
      'http_req_failed': ['rate<0.02'],        // <2% failures
      'http_req_duration': ['p(95)<300'],      // 95% under 300ms
      'http_req_duration': ['p(50)<150']       // 50% under 150ms
    },
    stress: {
      'http_req_failed': ['rate<0.05'],        // <5% failures
      'http_req_duration': ['p(95)<1000'],     // 95% under 1s
      'http_req_duration': ['p(50)<500']       // 50% under 500ms
    }
  }
};

export default IAAS_CONFIG;
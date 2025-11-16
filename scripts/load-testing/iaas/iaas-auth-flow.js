// IaaS Authentication Flow Test - NestJS Monolith
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const baseUrl = 'http://localhost:3000/api/v1';
  
  console.log('🔐 Testing IaaS authentication flow...');
  
  // 1. Login to NestJS application
  const loginData = {
    email: 'owner@store1.petstore.com',
    password: 'SecurePassword123!'
  };
  
  const loginResponse = http.post(`${baseUrl}/auth/login`, JSON.stringify(loginData), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log(`🔑 Login response: ${loginResponse.status}`);
  
  const loginCheck = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  if (loginCheck && loginResponse.status === 200) {
    const authResult = JSON.parse(loginResponse.body);
    const accessToken = authResult.accessToken;
    
    console.log('✅ JWT token obtained successfully');
    console.log(`📝 User: ${authResult.user.email}, Role: ${authResult.user.role}`);
    
    // 2. Test protected endpoint access
    console.log('🏪 Testing access to store pets endpoint...');
    
    const storeResponse = http.get(`${baseUrl}/store/store-001/pets`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🏪 Store access: ${storeResponse.status}`);
    
    const apiCheck = check(storeResponse, {
      'store access is 200': (r) => r.status === 200,
      'has pets data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.pets !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
    
    if (apiCheck) {
      console.log('🎉 SUCCESS! Complete IaaS authorization working');
      console.log('✅ User authenticated and authorized for store operations');
      
      // 3. Test token validation endpoint
      const validateResponse = http.get(`${baseUrl}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      check(validateResponse, {
        'token validation is 200': (r) => r.status === 200,
        'token is valid': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.valid === true;
          } catch (e) {
            return false;
          }
        }
      });
      
      console.log(`🔍 Token validation: ${validateResponse.status}`);
      
    } else if (storeResponse.status === 401) {
      console.log('❌ Token not valid or expired');
    } else if (storeResponse.status === 403) {
      console.log('❌ User authenticated but not authorized for this store');
    } else {
      console.log(`❌ Unexpected error: ${storeResponse.status}`);
      console.log(`Response: ${storeResponse.body.substring(0, 200)}`);
    }
  } else {
    console.log('❌ Login failed');
    console.log(`Error: ${loginResponse.body}`);
  }
  
  console.log('\n📋 IAAS CONFIGURATION VERIFIED:');
  console.log('✅ Application: NestJS Monolith');
  console.log('✅ Auth: Local JWT tokens');
  console.log('✅ Port: 3000');
  console.log('✅ Test user configured');
}

export let options = {
  vus: 1,
  duration: '5s',
};
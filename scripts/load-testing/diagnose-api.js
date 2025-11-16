// Script de diagnóstico completo para verificar API endpoints
import http from 'k6/http';

export default function () {
  const apiKey = '0e7da1c5-960f-4c69-9adf-fe176e1e35d4';
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  
  console.log('🔍 DIAGNÓSTICO COMPLETO DE API ENDPOINTS');
  console.log('=========================================');
  
  const headers = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };
  
  // Test 1: Verificar conectividad básica
  console.log('\n1️⃣ Verificando conectividad básica...');
  const rootResponse = http.get(baseUrl, { headers });
  console.log(`   Root endpoint: ${rootResponse.status} - ${rootResponse.statusText}`);
  
  // Test 2: Probar diferentes rutas de admin store
  console.log('\n2️⃣ Probando endpoints de admin/store...');
  
  const storeEndpoints = [
    '/admin/store',
    '/admin/stores',
    '/v1/admin/store',
    '/api/v1/admin/store'
  ];
  
  storeEndpoints.forEach(endpoint => {
    const response = http.get(`${baseUrl}${endpoint}`, { headers });
    console.log(`   ${endpoint}: ${response.status} - ${response.statusText}`);
    if (response.status === 200) {
      console.log(`   ✅ ÉXITO! Stores encontrados en: ${endpoint}`);
      try {
        const data = JSON.parse(response.body);
        console.log(`   Datos: ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        console.log(`   Body: ${response.body.substring(0, 200)}...`);
      }
    }
  });
  
  // Test 3: Probar endpoints de franchise (para ver si la API está funcionando)
  console.log('\n3️⃣ Probando endpoints de admin/franchise...');
  
  const franchiseEndpoints = [
    '/admin/franchise',
    '/admin/franchises',
    '/v1/admin/franchise',
    '/api/v1/admin/franchise'
  ];
  
  franchiseEndpoints.forEach(endpoint => {
    const response = http.get(`${baseUrl}${endpoint}`, { headers });
    console.log(`   ${endpoint}: ${response.status} - ${response.statusText}`);
    if (response.status === 200) {
      console.log(`   ✅ ÉXITO! Franchises encontradas en: ${endpoint}`);
      try {
        const data = JSON.parse(response.body);
        console.log(`   Datos: ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        console.log(`   Body: ${response.body.substring(0, 200)}...`);
      }
    }
  });
  
  // Test 4: Intentar crear un store de prueba
  console.log('\n4️⃣ Intentando crear un store de prueba...');
  
  const createStoreEndpoints = ['/admin/store', '/api/v1/admin/store'];
  const testStore = {
    id: 'test-store-001',
    value: 'main',
    name: 'Test Store para K6',
    address: '123 Test Street, Test City'
  };
  
  createStoreEndpoints.forEach(endpoint => {
    const response = http.post(`${baseUrl}${endpoint}`, JSON.stringify(testStore), { headers });
    console.log(`   POST ${endpoint}: ${response.status} - ${response.statusText}`);
    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ Store creado exitosamente!`);
    } else if (response.status === 409) {
      console.log(`   ℹ️  Store ya existe (normal si se ejecutó antes)`);
    } else {
      console.log(`   Body: ${response.body.substring(0, 200)}...`);
    }
  });
  
  // Test 5: Verificar health/status endpoint
  console.log('\n5️⃣ Verificando endpoints de salud...');
  
  const healthEndpoints = [
    '/health',
    '/status',
    '/api/health',
    '/v1/health'
  ];
  
  healthEndpoints.forEach(endpoint => {
    const response = http.get(`${baseUrl}${endpoint}`, { headers });
    console.log(`   ${endpoint}: ${response.status} - ${response.statusText}`);
    if (response.status === 200) {
      console.log(`   ✅ Health endpoint funcionando!`);
      console.log(`   Response: ${response.body.substring(0, 100)}...`);
    }
  });
  
  // Test 6: Verificar sin API key (para confirmar que la auth está funcionando)
  console.log('\n6️⃣ Verificando autenticación (sin API key)...');
  const noAuthResponse = http.get(`${baseUrl}/admin/store`);
  console.log(`   Sin API key: ${noAuthResponse.status} - ${noAuthResponse.statusText}`);
  if (noAuthResponse.status === 403 || noAuthResponse.status === 401) {
    console.log(`   ✅ Autenticación funcionando correctamente`);
  }
  
  console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
  console.log('===========================');
  console.log('Base URL:', baseUrl);
  console.log('API Key:', apiKey.substring(0, 8) + '...');
  console.log('\n🔍 Busca los endpoints que devolvieron status 200 arriba');
  console.log('📝 Si no hay stores, necesitarás crearlos primero');
}

export let options = {
  vus: 1,
  duration: '10s',
};
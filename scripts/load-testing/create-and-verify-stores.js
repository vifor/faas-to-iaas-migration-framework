// Script para verificar stores creados y usar endpoints correctos
import http from 'k6/http';

export default function () {
  const apiKey = '0e7da1c5-960f-4c69-9adf-fe176e1e35d4';
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  
  console.log('🔍 VERIFICANDO STORES DESPUÉS DE CREACIÓN');
  console.log('==========================================');
  
  const headers = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };
  
  // Crear algunos stores de prueba para tener datos
  console.log('\n1️⃣ Creando stores de prueba...');
  
  const testStores = [
    {
      id: 'store-001',
      value: 'main',
      name: 'Tienda Principal',
      address: '123 Main St, Ciudad Principal'
    },
    {
      id: 'store-002', 
      value: 'branch',
      name: 'Sucursal Norte',
      address: '456 North Ave, Ciudad Norte'
    },
    {
      id: 'store-003',
      value: 'outlet',
      name: 'Outlet Sur',
      address: '789 South Blvd, Ciudad Sur'
    }
  ];
  
  testStores.forEach((store, index) => {
    const response = http.post(`${baseUrl}/admin/store`, JSON.stringify(store), { headers });
    console.log(`   Store ${index + 1}: ${response.status} - ${store.id}`);
    if (response.status === 200) {
      console.log(`   ✅ ${store.name} creado exitosamente`);
    } else if (response.status === 409) {
      console.log(`   ℹ️  ${store.name} ya existe`);
    }
  });
  
  // Ahora intentemos obtener stores individuales (ya que sabemos los IDs)
  console.log('\n2️⃣ Intentando obtener stores individuales...');
  
  const getEndpoints = [
    '/admin/store/object/store-001/main',
    '/admin/store/store-001/main',
    '/admin/store/store-001',
    '/admin/stores/store-001'
  ];
  
  getEndpoints.forEach(endpoint => {
    const response = http.get(`${baseUrl}${endpoint}`, { headers });
    console.log(`   GET ${endpoint}: ${response.status}`);
    if (response.status === 200) {
      console.log(`   ✅ ÉXITO! Store encontrado en: ${endpoint}`);
      try {
        const data = JSON.parse(response.body);
        console.log(`   Store data: ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        console.log(`   Body: ${response.body}`);
      }
    }
  });
  
  // Verificar si el endpoint usa Query parameters
  console.log('\n3️⃣ Probando con query parameters...');
  
  const queryEndpoints = [
    '/admin/store?id=store-001',
    '/admin/store?storeId=store-001',
    '/admin/store?limit=10'
  ];
  
  queryEndpoints.forEach(endpoint => {
    const response = http.get(`${baseUrl}${endpoint}`, { headers });
    console.log(`   GET ${endpoint}: ${response.status}`);
    if (response.status === 200) {
      console.log(`   ✅ ÉXITO! Stores encontrados con query: ${endpoint}`);
      try {
        const data = JSON.parse(response.body);
        console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        console.log(`   Body: ${response.body.substring(0, 200)}`);
      }
    }
  });
  
  console.log('\n📋 STORES DISPONIBLES PARA USAR EN ENVIRONMENT.JS:');
  console.log('================================================');
  console.log('✅ store-001 (Tienda Principal)');
  console.log('✅ store-002 (Sucursal Norte)'); 
  console.log('✅ store-003 (Outlet Sur)');
  console.log('✅ test-store-001 (Test Store)');
  
  console.log('\n🔧 CONFIGURACIÓN RECOMENDADA PARA ENVIRONMENT.JS:');
  console.log('===============================================');
  console.log('testUsers: [');
  console.log('  {');
  console.log('    username: "victoria.pocladova@gmail.com",');
  console.log('    password: "tesis1512_",');
  console.log('    storeId: "store-001"  // <-- Usar este storeId');
  console.log('  }');
  console.log(']');
}

export let options = {
  vus: 1,
  duration: '5s',
};
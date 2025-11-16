// Script para verificar configuración de autorización
import http from 'k6/http';

export default function () {
  const apiKey = '0e7da1c5-960f-4c69-9adf-fe176e1e35d4';
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  
  console.log('🔍 Verificando configuración de autorización...');
  
  // 1. Listar stores disponibles
  console.log('\n📋 1. Stores disponibles:');
  const storesResponse = http.get(`${baseUrl}/admin/store`, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });
  
  if (storesResponse.status === 200) {
    const stores = JSON.parse(storesResponse.body);
    console.log(JSON.stringify(stores, null, 2));
  } else {
    console.log(`❌ Error listando stores: ${storesResponse.status}`);
  }
  
  // 2. Verificar autenticación JWT
  console.log('\n🔐 2. Testeando autenticación JWT...');
  const authUrl = `${baseUrl}/store/store-001/pets`;
  
  // Sin token (debería fallar)
  const noAuthResponse = http.get(authUrl);
  console.log(`Sin auth: ${noAuthResponse.status} (esperado: 401/403)`);
  
  // 3. Información para configuración
  console.log('\n⚙️  3. Para configurar autorización:');
  console.log('   - Usuario: victoria.pocladova@gmail.com');
  console.log('   - User Pool: sa-east-1_LAeXR4OOV');
  console.log('   - Grupos sugeridos: StoreOwnerRole');
  console.log('   - Stores a configurar: Los listados arriba');
  
  console.log('\n📝 4. Pasos siguientes:');
  console.log('   1. Agregar usuario al grupo "StoreOwnerRole" en Cognito');
  console.log('   2. Configurar custom:employmentStoreCodes con storeId válido');
  console.log('   3. Actualizar environment.js con storeId real');
  console.log('   4. Ejecutar tests de store endpoints');
}

export let options = {
  vus: 1,
  duration: '5s',
};
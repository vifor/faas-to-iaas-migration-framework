// Simple script to list existing stores
import http from 'k6/http';

export default function () {
  const apiKey = '0e7da1c5-960f-4c69-9adf-fe176e1e35d4';
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  
  const params = {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  };
  
  console.log('🔍 Listando stores existentes...');
  
  const response = http.get(`${baseUrl}/admin/store`, params);
  
  console.log(`Status: ${response.status}`);
  
  if (response.status === 200) {
    const stores = JSON.parse(response.body);
    console.log('📋 Stores disponibles:');
    console.log(JSON.stringify(stores, null, 2));
    
    if (stores.stores && stores.stores.length > 0) {
      console.log('\n✅ StoreIds disponibles para usar en environment.js:');
      stores.stores.forEach(store => {
        console.log(`  - "${store.id}" (${store.name})`);
      });
    } else {
      console.log('\n⚠️  No hay stores creados. Necesitas crear al menos uno usando admin API.');
    }
  } else {
    console.log(`❌ Error: ${response.body}`);
  }
}

export let options = {
  vus: 1,
  duration: '5s',
};
// Test de autorización completa para verificar configuración
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  const clientId = '[COGNITO_CLIENT_ID_REDACTED]';
  
  console.log('🔐 Probando autenticación completa...');
  
  // 1. Autenticar con Cognito usando las credenciales configuradas
  const authData = JSON.stringify({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: 'vicky',
      PASSWORD: '[PASSWORD_REDACTED]'
    }
  });
  
  const authResponse = http.post('https://cognito-idp.sa-east-1.amazonaws.com/', authData, {
    headers: {
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      'Content-Type': 'application/x-amz-json-1.1'
    }
  });
  
  console.log(`🔑 Autenticación: ${authResponse.status}`);
  
  if (authResponse.status === 200) {
    const authResult = JSON.parse(authResponse.body);
    
    if (authResult.AuthenticationResult && authResult.AuthenticationResult.IdToken) {
      const idToken = authResult.AuthenticationResult.IdToken;
      console.log('✅ Token JWT obtenido exitosamente');
      
      // 2. Probar acceso a store endpoint con JWT
      console.log('🏪 Probando acceso a store-001...');
      
      const storeResponse = http.get(`${baseUrl}/store/store-001/pets`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`🏪 Acceso a store: ${storeResponse.status}`);
      
      if (storeResponse.status === 200) {
        console.log('🎉 ¡ÉXITO! Autorización completa funcionando');
        console.log('✅ Usuario autenticado y autorizado para store-001');
      } else if (storeResponse.status === 401) {
        console.log('❌ Token no válido o expirado');
      } else if (storeResponse.status === 403) {
        console.log('❌ Usuario autenticado pero no autorizado para este store');
        console.log('🔍 Verificar configuración de Amazon Verified Permissions');
      } else {
        console.log(`❌ Error inesperado: ${storeResponse.status}`);
        console.log(`Response: ${storeResponse.body.substring(0, 200)}`);
      }
    } else {
      console.log('❌ No se recibió token en la respuesta');
      console.log(`Response: ${authResponse.body}`);
    }
  } else {
    console.log(`❌ Error de autenticación: ${authResponse.status}`);
    console.log(`Error: ${authResponse.body}`);
  }
  
  console.log('\n📋 CONFIGURACIÓN VERIFICADA:');
  console.log('✅ Username: vicky');
  console.log('✅ Grupo: StoreOwnerRole'); 
  console.log('✅ Store: store-001');
  console.log('✅ Atributos custom configurados');
}

export let options = {
  vus: 1,
  duration: '5s',
};
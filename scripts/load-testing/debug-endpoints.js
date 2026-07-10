// Test específico para debuggear el resource que se está enviando
import http from 'k6/http';

export default function () {
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  const clientId = '[COGNITO_CLIENT_ID_REDACTED]';
  
  console.log('🔍 Debuggeando Request y Response...');
  
  // 1. Obtener token
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
  
  if (authResponse.status === 200) {
    const authResult = JSON.parse(authResponse.body);
    
    if (authResult.AuthenticationResult && authResult.AuthenticationResult.IdToken) {
      const idToken = authResult.AuthenticationResult.IdToken;
      
      // 2. Probar diferentes endpoints
      console.log('\n🎯 PROBANDO DIFERENTES ENDPOINTS:');
      
      const endpoints = [
        '/store/store-001/pets',
        '/store/store-001/inventory', 
        '/store/store-001/orders'
      ];
      
      endpoints.forEach(endpoint => {
        console.log(`\n🔗 Probando: ${endpoint}`);
        
        const response = http.get(`${baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`📊 Status: ${response.status}`);
        
        if (response.status !== 200) {
          // Imprimir respuesta de error
          const errorBody = response.body.substring(0, 300);
          console.log(`❌ Error: ${errorBody}`);
        } else {
          console.log(`✅ Success!`);
        }
      });
      
      // 3. También probar sin store específica
      console.log(`\n🔗 Probando endpoint general: /stores`);
      
      const generalResponse = http.get(`${baseUrl}/stores`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Status: ${generalResponse.status}`);
      if (generalResponse.status !== 200) {
        console.log(`❌ Error: ${generalResponse.body.substring(0, 300)}`);
      }
    }
  }
}

export let options = {
  vus: 1,
  iterations: 1,
};
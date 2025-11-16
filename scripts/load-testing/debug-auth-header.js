// Debug del Authorization Header específicamente
import http from 'k6/http';

export default function () {
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  const clientId = '34uf0bee83j3ciq8sd7durq31k';
  
  console.log('🔍 Debug del Authorization Header...');
  
  // 1. Obtener token
  const authData = JSON.stringify({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: 'vicky',
      PASSWORD: 'tesis1512_'
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
      
      console.log('✅ Token obtenido');
      console.log(`🔑 Token length: ${idToken.length}`);
      console.log(`🔑 Token start: ${idToken.substring(0, 50)}...`);
      console.log(`🔑 Token end: ...${idToken.substring(idToken.length - 50)}`);
      
      // 2. Construir Authorization header
      const authHeader = `Bearer ${idToken}`;
      console.log(`🔐 Auth Header length: ${authHeader.length}`);
      console.log(`🔐 Auth Header start: ${authHeader.substring(0, 80)}...`);
      
      // 3. Probar diferentes formatos de header
      console.log('\n🎯 PROBANDO DIFERENTES FORMATOS:');
      
      // Formato 1: Bearer + token
      const response1 = http.get(`${baseUrl}/store/store-001/pets`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`📊 Bearer format: ${response1.status}`);
      if (response1.status !== 200) {
        console.log(`❌ Error: ${response1.body.substring(0, 200)}`);
      }
      
      // Formato 2: Solo token (sin Bearer)
      const response2 = http.get(`${baseUrl}/store/store-001/pets`, {
        headers: {
          'Authorization': idToken,
          'Content-Type': 'application/json'
        }
      });
      console.log(`📊 Token only: ${response2.status}`);
      if (response2.status !== 200) {
        console.log(`❌ Error: ${response2.body.substring(0, 200)}`);
      }
      
      // Formato 3: Con header x-api-key (si se usa)
      const response3 = http.get(`${baseUrl}/store/store-001/pets`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-api-key': 'test-key', // En caso de que se necesite
          'Content-Type': 'application/json'
        }
      });
      console.log(`📊 With API Key: ${response3.status}`);
      
    }
  } else {
    console.log(`❌ Error obteniendo token: ${authResponse.status}`);
  }
}

export let options = {
  vus: 1,
  iterations: 1,
};
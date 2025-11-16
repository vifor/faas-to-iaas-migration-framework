// Obtener JWT Token para test del authorizer
import http from 'k6/http';

export default function () {
  const clientId = '34uf0bee83j3ciq8sd7durq31k';
  
  console.log('🔑 Obteniendo JWT para test de authorizer...');
  
  const authResponse = http.post('https://cognito-idp.sa-east-1.amazonaws.com/', JSON.stringify({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: 'vicky',
      PASSWORD: 'tesis1512_'
    }
  }), {
    headers: {
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      'Content-Type': 'application/x-amz-json-1.1'
    }
  });
  
  if (authResponse.status === 200) {
    const authResult = JSON.parse(authResponse.body);
    const idToken = authResult.AuthenticationResult.IdToken;
    
    console.log('==========================================');
    console.log('🔑 JWT TOKEN PARA AUTHORIZER TEST:');
    console.log('==========================================');
    console.log(`Bearer ${idToken}`);
    console.log('==========================================');
    console.log('📝 Copia este valor completo en el campo "Value"');
    
  } else {
    console.log(`❌ Error: ${authResponse.status}`);
  }
}

export let options = {
  vus: 1,
  iterations: 1,
};
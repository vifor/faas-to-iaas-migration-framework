// Debug JWT Token - Ver contenido del token para verificar atributos
import http from 'k6/http';
import encoding from 'k6/encoding';

export default function () {
  const clientId = '[COGNITO_CLIENT_ID_REDACTED]';
  
  console.log('🔍 Debuggeando JWT Token...');
  
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
      
      // 2. Decodificar JWT token (solo el payload, sin verificar firma)
      const parts = idToken.split('.');
      if (parts.length === 3) {
        // Decodificar header
        const headerDecoded = encoding.b64decode(parts[0], 'rawurl');
        console.log('🔑 JWT Header:');
        console.log(headerDecoded);
        
        // Decodificar payload
        const payloadDecoded = encoding.b64decode(parts[1], 'rawurl'); 
        console.log('\n📋 JWT Payload:');
        console.log(payloadDecoded);
        
        // Parsear payload como JSON
        try {
          const payload = JSON.parse(payloadDecoded);
          console.log('\n🎯 ATRIBUTOS CLAVE:');
          console.log(`📧 Username: ${payload['cognito:username'] || payload.username || 'NO_ENCONTRADO'}`);
          console.log(`👥 Groups: ${JSON.stringify(payload['cognito:groups'] || 'NO_ENCONTRADO')}`);
          console.log(`🏪 Employment Store Code: ${payload['custom:employmentStoreCode'] || 'NO_ENCONTRADO'}`);
          console.log(`🆔 Sub: ${payload.sub || 'NO_ENCONTRADO'}`);
          console.log(`⏰ Exp: ${new Date(payload.exp * 1000).toISOString()}`);
          
          // Verificar todos los claims custom
          console.log('\n🔍 TODOS LOS CLAIMS:');
          for (const [key, value] of Object.entries(payload)) {
            if (key.startsWith('custom:') || key.startsWith('cognito:')) {
              console.log(`   ${key}: ${JSON.stringify(value)}`);
            }
          }
        } catch (e) {
          console.log(`❌ Error parseando payload: ${e}`);
        }
      }
    }
  } else {
    console.log(`❌ Error obteniendo token: ${authResponse.status}`);
  }
}

export let options = {
  vus: 1,
  iterations: 1,
};
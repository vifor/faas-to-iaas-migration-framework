// Diagnóstico específico del JWT format y structure
import http from 'k6/http';

export default function () {
  const clientId = '34uf0bee83j3ciq8sd7durq31k';
  
  console.log('🔍 Diagnóstico JWT Structure...');
  
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
      
      console.log('🔍 ANÁLISIS DEL TOKEN:');
      console.log(`📏 Length: ${idToken.length}`);
      
      // Verificar estructura de 3 partes
      const parts = idToken.split('.');
      console.log(`🔧 Parts count: ${parts.length}`);
      
      if (parts.length === 3) {
        console.log('✅ Token tiene 3 partes correctas');
        console.log(`📝 Header length: ${parts[0].length}`);
        console.log(`📝 Payload length: ${parts[1].length}`);
        console.log(`📝 Signature length: ${parts[2].length}`);
        
        // Verificar si hay caracteres problemáticos
        console.log(`🔍 Header: ${parts[0].substring(0, 20)}...`);
        console.log(`🔍 Payload: ${parts[1].substring(0, 20)}...`);
        console.log(`🔍 Signature: ${parts[2].substring(0, 20)}...`);
        
        // Verificar que no hay espacios o caracteres extraños
        const hasSpaces = idToken.includes(' ');
        const hasNewlines = idToken.includes('\n') || idToken.includes('\r');
        const hasSpecialChars = /[^A-Za-z0-9._-]/.test(idToken);
        
        console.log(`🔍 Has spaces: ${hasSpaces}`);
        console.log(`🔍 Has newlines: ${hasNewlines}`);
        console.log(`🔍 Has special chars: ${hasSpecialChars}`);
        
      } else {
        console.log(`❌ Token malformed: expected 3 parts, got ${parts.length}`);
        console.log('🔍 Parts:');
        parts.forEach((part, index) => {
          console.log(`   Part ${index}: length=${part.length}, content=${part.substring(0, 50)}...`);
        });
      }
      
      // Test con el token tal como está
      console.log('\n🎯 TESTING RAW TOKEN:');
      const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
      
      const response = http.get(`${baseUrl}/store/store-001/pets`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Response: ${response.status}`);
      if (response.status !== 200) {
        const errorBody = response.body.substring(0, 300);
        console.log(`❌ Error: ${errorBody}`);
      }
      
    }
  } else {
    console.log(`❌ Error getting token: ${authResponse.status}`);
  }
}

export let options = {
  vus: 1,
  iterations: 1,
};
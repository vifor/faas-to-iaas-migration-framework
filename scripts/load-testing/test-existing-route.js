// Test with existing Lambda route that actually exists
import http from 'k6/http';

export default function () {
  const baseUrl = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
  const clientId = '34uf0bee83j3ciq8sd7durq31k';
  
  console.log('🧪 Testing existing Lambda route...');
  
  // 1. Get token
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
    
    console.log('✅ Token obtained');
    
    // Test the actual Lambda route that exists
    const response = http.get(`${baseUrl}/admin/store/store-001`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response: ${response.body.substring(0, 200)}`);
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! Lambda integration working');
    }
  }
}

export let options = {
  vus: 1,
  iterations: 1,
};
import http from 'k6/http';
import { check } from 'k6';

// --------------------------------------------------------------------------------
// CONFIGURACIÓN (Variables Globales)
// --------------------------------------------------------------------------------
const config = {
  baseUrl: 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
  clientId: '34uf0bee83j3ciq8sd7durq31k',
  // 🔴 ¡IMPORTANTE! Reemplaza esto con la API Key que copiaste de la consola de AWS
  apiKey: '0e7da1c5-960f-4c69-9adf-fe176e1e35d4', 
  authUrl: 'https://cognito-idp.sa-east-1.amazonaws.com/',
  user: {
      username: 'vicky',
      password: 'tesis1512_'
  }
};

// --------------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL (VU Code)
// --------------------------------------------------------------------------------
export default function () {
  console.log('🧪 Iniciando prueba de humo con Auth + API Key...');

  // PASO 1: Obtener el Token de Cognito
  const authPayload = JSON.stringify({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: config.user.username,
      PASSWORD: config.user.password
    }
  });

  const authHeaders = {
    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    'Content-Type': 'application/x-amz-json-1.1'
  };

  const authResponse = http.post(config.authUrl, authPayload, { headers: authHeaders });

  if (authResponse.status !== 200) {
    console.error(`❌ Error obteniendo token: ${authResponse.status} - ${authResponse.body}`);
    return; // Terminamos si no hay login
  }

  // Extraemos el IdToken
  const authResult = JSON.parse(authResponse.body);
  const idToken = authResult.AuthenticationResult.IdToken;
  console.log('✅ Token obtenido correctamente.');

  // PASO 2: Llamar al Endpoint Protegido (Con Token + API Key)
  // Usamos el endpoint que sabemos que existe: /admin/store/store-001
  const targetUrl = `${config.baseUrl}/admin/store/store-001`;
  
  const apiParams = {
    headers: {
      'Authorization': `Bearer ${idToken}`, // Tu identidad (Cognito)
      'x-api-key': config.apiKey            // Tu permiso de infraestructura (API Gateway)
    }
  };

  const response = http.get(targetUrl, apiParams);

  // Validación y Logs
  console.log(`📊 Respuesta API: Status ${response.status}`);
  
  if (response.status !== 200) {
      console.log(`⚠️ Cuerpo del error: ${response.body}`);
  }

  check(response, {
    'Status es 200 OK': (r) => r.status === 200,
    'Respuesta es JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('json'),
  });

  if (response.status === 200) {
    console.log('🎉 ¡ÉXITO! La integración FaaS completa funciona.');
  }
}

export const options = {
  vus: 1,
  iterations: 1,
};
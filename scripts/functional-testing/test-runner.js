// Simple Node.js test runner to verify the endpoints
// This simulates what k6 would do

const https = require('https');
const http = require('http');

const BASE_URL = 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
const IAAS_URL = 'http://[IP_REDACTED]:3000/api/v1';
const STORE_ID = 'store-001';

// Environment variables
const API_KEY = process.env.API_KEY || '';
const IAAS_API_KEY = process.env.IAAS_API_KEY || '';
const COGNITO_PASSWORD = process.env.COGNITO_PASSWORD || '';
const COGNITO_USERNAME = 'vicky';
const COGNITO_CLIENT_ID = '[COGNITO_CLIENT_ID_REDACTED]';
const COGNITO_ENDPOINT = 'https://cognito-idp.sa-east-1.amazonaws.com/';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: body
      }));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

function tryParseJson(body) {
  try { return JSON.parse(body); } catch (_) { return null; }
}

async function getCognitoToken() {
  console.log('\n── Authentication ───────────────────────────────────────────────');

  if (!COGNITO_PASSWORD) {
    console.error('FAIL  COGNITO_PASSWORD is required.');
    return null;
  }

  console.log(`→ POST ${COGNITO_ENDPOINT}  (InitiateAuth for "${COGNITO_USERNAME}")`);

  try {
    const res = await makeRequest(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        'Content-Type': 'application/x-amz-json-1.1',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: COGNITO_USERNAME,
          PASSWORD: COGNITO_PASSWORD,
        },
      }),
    });

    if (res.status !== 200) {
      const body = tryParseJson(res.body);
      const msg = body ? (body.message || body.Message) : res.body.substring(0, 200);
      console.error(`FAIL  Cognito auth HTTP ${res.status}: ${msg}`);
      return null;
    }

    const body = tryParseJson(res.body);
    const idToken = body && body.AuthenticationResult && body.AuthenticationResult.IdToken;

    if (!idToken) {
      console.error(`FAIL  No IdToken in Cognito response. Keys: ${Object.keys(body || {}).join(', ')}`);
      return null;
    }

    console.log(`PASS  JWT obtained (${idToken.length} chars)`);
    return idToken;
  } catch (error) {
    console.error('FAIL  Cognito authentication error:', error.message);
    return null;
  }
}

async function testEndpoint1(baseUrl, apiKey, environment) {
  console.log(`\n── EP1 ${environment} — GET /admin/store/{storeId} — ApiKeyAuth ──────────`);

  if (!apiKey) {
    console.error(`FAIL  ${environment} API key is required`);
    return null;
  }

  const url = `${baseUrl}/admin/store/${STORE_ID}`;
  console.log(`→ GET ${url}`);

  try {
    const res = await makeRequest(url, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });

    const body = tryParseJson(res.body);
    const pass = res.status === 200 && body !== null && Array.isArray(body);

    console.log(`${pass ? 'PASS' : 'FAIL'}  ${environment} EP1`);
    console.log(`      Status   : ${res.status}`);
    console.log(`      Valid JSON: ${body !== null}`);
    console.log(`      Is array: ${Array.isArray(body)}`);
    console.log(`      Items: ${Array.isArray(body) ? body.length : '-'}`);

    if (Array.isArray(body) && body.length > 0) {
      console.log(`      Sample: ${JSON.stringify(body[0]).substring(0, 100)}...`);
    }

    return { status: res.status, body, passed: pass };
  } catch (error) {
    console.error(`FAIL  ${environment} EP1 error:`, error.message);
    return null;
  }
}

async function testEndpoint2(baseUrl, idToken, environment) {
  console.log(`\n── EP2 ${environment} — GET /store/{storeId}/pets — BearerAuth ───────────`);

  if (!idToken) {
    console.error(`FAIL  No JWT available for ${environment} — skipping endpoint 2`);
    return null;
  }

  const url = `${baseUrl}/store/${STORE_ID}/pets`;
  console.log(`→ GET ${url}`);

  try {
    const res = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    const body = tryParseJson(res.body);
    const isValidResponse = Array.isArray(body) || (body && typeof body === 'object' && 'pets' in body);
    const pass = res.status === 200 && body !== null && isValidResponse;

    const itemCount = Array.isArray(body) ? body.length : (body && body.pets ? body.pets.length : 0);

    console.log(`${pass ? 'PASS' : 'FAIL'}  ${environment} EP2`);
    console.log(`      Status   : ${res.status}`);
    console.log(`      Valid JSON: ${body !== null}`);
    console.log(`      Format: ${Array.isArray(body) ? 'Array' : (body && body.pets ? 'Object with pets' : 'Unknown')}`);
    console.log(`      Items: ${itemCount}`);

    // Show complete response content
    console.log(`      Full Response: ${JSON.stringify(body, null, 2)}`);

    return { status: res.status, body, passed: pass };
  } catch (error) {
    console.error(`FAIL  ${environment} EP2 error:`, error.message);
    return null;
  }
}

function formatResponseSummary(body, maxLength = 80) {
  if (!body) return 'null';

  const json = JSON.stringify(body);
  if (json.length <= maxLength) return json;

  if (Array.isArray(body)) {
    return `[${body.length} items: ${JSON.stringify(body[0] || {}).substring(0, 50)}...]`;
  }

  return json.substring(0, maxLength) + '...';
}

function printComparisonSummary(faasResults, iaasResults) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  FUNCTIONAL EQUIVALENCE SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');

  if (faasResults.ep1 && iaasResults.ep1) {
    console.log('\n  EP1 — GET /admin/store/{storeId}');
    console.log(`  ├── FaaS  : ${formatResponseSummary(faasResults.ep1.body)}`);
    console.log(`  └── IaaS  : ${formatResponseSummary(iaasResults.ep1.body)}`);
  }

  if (faasResults.ep2 && iaasResults.ep2) {
    console.log('\n  EP2 — GET /store/{storeId}/pets');
    console.log(`  ├── FaaS  : ${formatResponseSummary(faasResults.ep2.body)}`);
    console.log(`  └── IaaS  : ${formatResponseSummary(iaasResults.ep2.body)}`);
  }

  console.log('\n  EQUIVALENCE VERDICT:');

  // EP1 Analysis
  let ep1Status = '❓ UNKNOWN';
  if (faasResults.ep1 && iaasResults.ep1) {
    if (faasResults.ep1.status === 200 && iaasResults.ep1.status === 200) {
      ep1Status = '✅ EQUIVALENT (both return HTTP 200 with store data)';
    } else if (faasResults.ep1.status !== iaasResults.ep1.status) {
      ep1Status = `❌ DIFFERENT STATUS (FaaS: ${faasResults.ep1.status}, IaaS: ${iaasResults.ep1.status})`;
    } else {
      ep1Status = '⚠️  BOTH FAILED';
    }
  }

  // EP2 Analysis
  let ep2Status = '❓ UNKNOWN';
  if (faasResults.ep2 && iaasResults.ep2) {
    const faasIsArray = Array.isArray(faasResults.ep2.body);
    const iaasIsObject = iaasResults.ep2.body && typeof iaasResults.ep2.body === 'object' && 'pets' in iaasResults.ep2.body;

    if (faasResults.ep2.status === 200 && iaasResults.ep2.status === 200) {
      if (faasIsArray && iaasIsObject) {
        ep2Status = '⚠️  DIFFERENT FORMAT (FaaS=array, IaaS=object with pets array)';
      } else if (faasIsArray && Array.isArray(iaasResults.ep2.body)) {
        ep2Status = '✅ EQUIVALENT (both return arrays)';
      } else {
        ep2Status = '✅ EQUIVALENT (both return HTTP 200 with pets data)';
      }
    } else if (faasResults.ep2.status !== iaasResults.ep2.status) {
      ep2Status = `❌ DIFFERENT STATUS (FaaS: ${faasResults.ep2.status}, IaaS: ${iaasResults.ep2.status})`;
    } else {
      ep2Status = '⚠️  BOTH FAILED';
    }
  }

  console.log(`  ├── EP1: ${ep1Status}`);
  console.log(`  └── EP2: ${ep2Status}`);

  console.log('\n════════════════════════════════════════════════════════════════\n');
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  FaaS to IaaS Migration Functional Test');
  console.log('════════════════════════════════════════════════════════════════');

  // Get JWT token first
  const idToken = await getCognitoToken();
  if (!idToken) {
    console.log('Cannot proceed without authentication token');
    return;
  }

  const results = { faas: {}, iaas: {} };

  // Test FaaS Environment
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  FaaS Environment Testing  |  BASE_URL: ${BASE_URL}`);
  console.log('════════════════════════════════════════════════════════════════');

  results.faas.ep1 = await testEndpoint1(BASE_URL, API_KEY, 'FaaS');
  results.faas.ep2 = await testEndpoint2(BASE_URL, idToken, 'FaaS');

  // Test IaaS Environment
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  IaaS Environment Testing  |  IAAS_URL: ${IAAS_URL}`);
  console.log('════════════════════════════════════════════════════════════════');

  results.iaas.ep1 = await testEndpoint1(IAAS_URL, IAAS_API_KEY, 'IaaS');
  results.iaas.ep2 = await testEndpoint2(IAAS_URL, idToken, 'IaaS');

  // Print Comparison Summary
  printComparisonSummary(results.faas, results.iaas);
}

main().catch(console.error);
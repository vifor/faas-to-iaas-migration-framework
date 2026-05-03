// Environment configuration for functional tests
//
// ── FaaS (AWS) ────────────────────────────────────────────────────────────────
//   k6 run \
//     -e API_KEY=<api-key> \
//     -e COGNITO_PASSWORD=<password> \
//     scripts/functional-testing/functional-test.js
//
// ── IaaS (local) ─────────────────────────────────────────────────────────────
//   k6 run \
//     -e BASE_URL=http://localhost:3000/api/v1 \
//     -e API_KEY=<api-key> \
//     -e COGNITO_PASSWORD=<password> \
//     scripts/functional-testing/functional-test.js
//
// ── Available environment variables ──────────────────────────────────────────
//   BASE_URL             API base URL                 (default: FaaS on AWS)
//   API_KEY              x-api-key for /admin/*       (required)
//   TEST_JWT             Pre-obtained JWT token        (optional — skips Cognito auth in setup())
//   COGNITO_REGION       User Pool region              (default: sa-east-1)
//   COGNITO_CLIENT_ID    Cognito app client ID         (default: FaaS client)
//   COGNITO_USERNAME     Test user username            (default: vicky)
//   COGNITO_PASSWORD     Test user password            (required when TEST_JWT is not set)

export const BASE_URL =
  __ENV.BASE_URL || 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';

export const API_KEY  = __ENV.API_KEY  || '';
export const TEST_JWT = __ENV.TEST_JWT || '';

export const COGNITO_REGION   = __ENV.COGNITO_REGION   || 'sa-east-1';
export const COGNITO_CLIENT_ID = __ENV.COGNITO_CLIENT_ID || '34uf0bee83j3ciq8sd7durq31k';
export const COGNITO_USERNAME  = __ENV.COGNITO_USERNAME  || 'vicky';
export const COGNITO_PASSWORD  = __ENV.COGNITO_PASSWORD  || '';

export const COGNITO_ENDPOINT =
  `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

#!/usr/bin/env bash
set -euo pipefail

# ── Colores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "${BLUE}[→]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[✗] $*${NC}" >&2; exit 1; }

# ── Limpieza de archivos temporales al salir ───────────────────────────────────
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║      PetStore FaaS — Smoke Test Run      ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar dependencias ──────────────────────────────────────────────────
step "Verificando dependencias..."
for dep in curl jq k6; do
  if ! command -v "$dep" &>/dev/null; then
    die "Dependencia faltante: '$dep'. Instalalo antes de continuar."
  fi
  ok "$dep  →  $(command -v "$dep")"
done
echo ""

# ── 2. Leer configuración desde variables de entorno ──────────────────────────
step "Leyendo configuración..."

COGNITO_USERNAME="${COGNITO_USERNAME:-vicky}"
CLIENT_ID="${CLIENT_ID:-34uf0bee83j3ciq8sd7durq31k}"
COGNITO_REGION="${COGNITO_REGION:-sa-east-1}"
FAAS_BASE_URL="${FAAS_BASE_URL:-https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main}"
COGNITO_ENDPOINT="https://cognito-idp.${COGNITO_REGION}.amazonaws.com/"

if [[ -z "${COGNITO_PASSWORD:-}" ]]; then
  die "COGNITO_PASSWORD es requerido.\n\n  Uso: COGNITO_PASSWORD=xxx bash $0\n"
fi

echo "  Usuario          : $COGNITO_USERNAME"
echo "  Client ID        : $CLIENT_ID"
echo "  Región Cognito   : $COGNITO_REGION"
echo "  FAAS_BASE_URL    : $FAAS_BASE_URL"
echo "  Password         : ***"
echo ""

# ── 3. Llamar a Cognito InitiateAuth ──────────────────────────────────────────
step "Autenticando con Cognito (InitiateAuth)..."

AUTH_PAYLOAD=$(jq -n \
  --arg flow "USER_PASSWORD_AUTH" \
  --arg cid  "$CLIENT_ID" \
  --arg user "$COGNITO_USERNAME" \
  --arg pass "$COGNITO_PASSWORD" \
  '{
    AuthFlow: $flow,
    ClientId: $cid,
    AuthParameters: { USERNAME: $user, PASSWORD: $pass }
  }')

HTTP_CODE=$(curl -s -o "$TMPFILE" -w "%{http_code}" \
  -X POST "$COGNITO_ENDPOINT" \
  -H "X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth" \
  -H "Content-Type: application/x-amz-json-1.1" \
  -d "$AUTH_PAYLOAD")

BODY=$(cat "$TMPFILE")

if [[ "$HTTP_CODE" != "200" ]]; then
  ERROR_MSG=$(echo "$BODY" | jq -r '.message // .Message // "sin detalle"' 2>/dev/null || echo "$BODY")
  die "Error de autenticación (HTTP $HTTP_CODE): $ERROR_MSG"
fi

ok "Respuesta recibida (HTTP $HTTP_CODE)."

# ── 4. Manejar challenge NEW_PASSWORD_REQUIRED ────────────────────────────────
CHALLENGE=$(echo "$BODY" | jq -r '.ChallengeName // empty')

if [[ "$CHALLENGE" == "NEW_PASSWORD_REQUIRED" ]]; then
  warn "Challenge detectado: NEW_PASSWORD_REQUIRED."

  if [[ -z "${NEW_PASSWORD:-}" ]]; then
    die "Se requiere NEW_PASSWORD para responder el challenge.\n\n  Uso: COGNITO_PASSWORD=xxx NEW_PASSWORD=yyy bash $0\n"
  fi

  SESSION=$(echo "$BODY" | jq -r '.Session')
  step "Respondiendo al challenge con RespondToAuthChallenge..."

  CHALLENGE_PAYLOAD=$(jq -n \
    --arg challenge "NEW_PASSWORD_REQUIRED" \
    --arg cid       "$CLIENT_ID" \
    --arg user      "$COGNITO_USERNAME" \
    --arg newpass   "$NEW_PASSWORD" \
    --arg session   "$SESSION" \
    '{
      ChallengeName: $challenge,
      ClientId: $cid,
      ChallengeResponses: { USERNAME: $user, NEW_PASSWORD: $newpass },
      Session: $session
    }')

  HTTP_CODE=$(curl -s -o "$TMPFILE" -w "%{http_code}" \
    -X POST "$COGNITO_ENDPOINT" \
    -H "X-Amz-Target: AWSCognitoIdentityProviderService.RespondToAuthChallenge" \
    -H "Content-Type: application/x-amz-json-1.1" \
    -d "$CHALLENGE_PAYLOAD")

  BODY=$(cat "$TMPFILE")

  if [[ "$HTTP_CODE" != "200" ]]; then
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .Message // "sin detalle"' 2>/dev/null || echo "$BODY")
    die "Error respondiendo challenge (HTTP $HTTP_CODE): $ERROR_MSG"
  fi

  ok "Challenge resuelto exitosamente."
fi

# ── 5. Extraer IdToken ─────────────────────────────────────────────────────────
ID_TOKEN=$(echo "$BODY" | jq -r '.AuthenticationResult.IdToken // empty')

if [[ -z "$ID_TOKEN" ]]; then
  KEYS=$(echo "$BODY" | jq -r 'keys | join(", ")' 2>/dev/null || echo "desconocido")
  die "No se encontró IdToken en la respuesta. Claves presentes: $KEYS"
fi

TOKEN_LEN=${#ID_TOKEN}
TOKEN_PREVIEW="${ID_TOKEN:0:40}..."
ok "JWT obtenido  →  ${TOKEN_LEN} chars  |  ${TOKEN_PREVIEW}"
echo ""

# ── 6. Run k6 functional test ─────────────────────────────────────────────────
# Points to functional-test.js which validates JWT auth end-to-end.
# simple-smoke-test.js uses API Key auth and is covered by run-smoke-test-apikey.sh.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONAL_SCRIPT="$SCRIPT_DIR/../functional-testing/functional-test.js"

if [[ ! -f "$FUNCTIONAL_SCRIPT" ]]; then
  die "Script not found: $FUNCTIONAL_SCRIPT"
fi

step "Running functional test with k6..."
echo "  Script        : $FUNCTIONAL_SCRIPT"
echo "  FAAS_BASE_URL : $FAAS_BASE_URL"
echo ""

k6 run \
  -e "FAAS_BASE_URL=$FAAS_BASE_URL" \
  -e "TEST_JWT=$ID_TOKEN" \
  "$FUNCTIONAL_SCRIPT"

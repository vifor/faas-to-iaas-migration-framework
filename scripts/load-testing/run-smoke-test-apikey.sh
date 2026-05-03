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

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   PetStore FaaS — Smoke Test (API Key)  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar dependencias ──────────────────────────────────────────────────
step "Verificando dependencias..."
for dep in k6; do
  if ! command -v "$dep" &>/dev/null; then
    die "Dependencia faltante: '$dep'. Instalalo antes de continuar."
  fi
  ok "$dep  →  $(command -v "$dep")"
done
echo ""

# ── 2. Leer configuración ─────────────────────────────────────────────────────
step "Leyendo configuración..."

API_KEY="${API_KEY:-}"
FAAS_BASE_URL="${FAAS_BASE_URL:-https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main}"
AWS_REGION="${AWS_REGION:-sa-east-1}"

if [[ -z "$API_KEY" ]]; then
  die "API_KEY es requerido.\n\n  Uso: API_KEY=<tu-api-key> bash $0\n"
fi

echo "  API Key          : ${API_KEY:0:8}..."
echo "  FAAS_BASE_URL    : $FAAS_BASE_URL"
echo "  AWS Region       : $AWS_REGION"
echo ""

# ── 2.5. Obtener un franchise ID válido desde DynamoDB ─────────────────────────
step "Obteniendo franchise ID desde DynamoDB..."

if ! command -v aws &>/dev/null; then
  die "AWS CLI no encontrado. Necesario para obtener datos de DynamoDB."
fi

if ! command -v jq &>/dev/null; then
  die "jq no encontrado. Necesario para procesar respuestas JSON."
fi

FRANCHISE_ID=$(aws dynamodb scan \
  --table-name petstoreFranchise-main \
  --region "$AWS_REGION" \
  --limit 1 \
  --query 'Items[0].id.S' \
  --output text 2>/dev/null)

if [[ -z "$FRANCHISE_ID" || "$FRANCHISE_ID" == "None" ]]; then
  die "No se encontraron franchises en la base de datos. Crea al menos una franchise antes de ejecutar el smoke test."
fi

ok "Franchise ID obtenido: $FRANCHISE_ID"
echo ""

# ── 3. Ejecutar smoke test ────────────────────────────────────────────────────
step "Ejecutando smoke test con k6..."
echo "  Script        : $(dirname "$0")/simple-smoke-test.js"
echo "  FAAS_BASE_URL : $FAAS_BASE_URL"
echo "  FRANCHISE_ID  : $FRANCHISE_ID"
echo ""

TEST_API_KEY="$API_KEY" \
FAAS_BASE_URL="$FAAS_BASE_URL" \
TEST_FRANCHISE_ID="$FRANCHISE_ID" \
k6 run "$(dirname "$0")/simple-smoke-test.js"

echo ""
ok "Smoke test completado."


════════════════════════════════════════════════════════════════
  FaaS to IaaS Migration Functional Test
════════════════════════════════════════════════════════════════

── Authentication ───────────────────────────────────────────────
→ POST https://cognito-idp.sa-east-1.amazonaws.com/  (InitiateAuth for "vicky")
PASS  JWT obtained (1508 chars)

════════════════════════════════════════════════════════════════
  FaaS Environment Testing  |  BASE_URL: https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main
════════════════════════════════════════════════════════════════

── EP1 FaaS — GET /admin/store/{storeId} — ApiKeyAuth ──────────
→ GET https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/admin/store/store-001
PASS  FaaS EP1
      Status   : 200
      Valid JSON: true
      Is array: true
      Items: 1
      Sample: {"address":"123 Main St, Ciudad Principal","id":"store-001","name":"Tienda Principal","value":"main"...

── EP2 FaaS — GET /store/{storeId}/pets — BearerAuth ───────────
→ GET https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/store/store-001/pets
PASS  FaaS EP2
      Status   : 200
      Valid JSON: true
      Format: Array
      Items: 2

════════════════════════════════════════════════════════════════
  IaaS Environment Testing  |  IAAS_URL: http://[IP_REDACTED]:3000/api/v1
════════════════════════════════════════════════════════════════

── EP1 IaaS — GET /admin/store/{storeId} — ApiKeyAuth ──────────
→ GET http://[IP_REDACTED]:3000/api/v1/admin/store/store-001
PASS  IaaS EP1
      Status   : 200
      Valid JSON: true
      Is array: true
      Items: 1
      Sample: {"id":"store-001","value":"main","name":"Tienda Principal","address":"123 Main St, Ciudad Principal"...

── EP2 IaaS — GET /store/{storeId}/pets — BearerAuth ───────────
→ GET http://[IP_REDACTED]:3000/api/v1/store/store-001/pets
PASS  IaaS EP2
      Status   : 200
      Valid JSON: true
      Format: Object with pets
      Items: 0

════════════════════════════════════════════════════════════════
  FUNCTIONAL EQUIVALENCE SUMMARY
════════════════════════════════════════════════════════════════

  EP1 — GET /admin/store/{storeId}
  ├── FaaS  : [1 items: {"address":"123 Main St, Ciudad Principal","id":"s...]
  └── IaaS  : [1 items: {"id":"store-001","value":"main","name":"Tienda Pr...]

  EP2 — GET /store/{storeId}/pets
  ├── FaaS  : [2 items: {"id":"pet1","name":"Fluffy","type":"cat","storeId...]
  └── IaaS  : {"pets":[],"total":0,"storeId":"store-001"}

  EQUIVALENCE VERDICT:
  ├── EP1: ✅ EQUIVALENT (both return HTTP 200 with store data)
  └── EP2: ⚠️  DIFFERENT FORMAT (FaaS=array, IaaS=object with pets array)

════════════════════════════════════════════════════════════════


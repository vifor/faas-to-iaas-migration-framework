# OpenAPI Conformance Report
**FaaS to IaaS Migration Framework**  
**Generated**: 2026-05-10 (Updated Test Run)  
**OpenAPI Contract**: docs/output/openapi.yaml

## Executive Summary

This report verifies that the IaaS implementation replicates the behavior of the production FaaS system. **FaaS is the source of truth** - it represents the existing, working production system. The migration goal is to achieve **functional parity** between IaaS and FaaS.

**Overall Verdict**: 🔴 **MIGRATION GAPS IDENTIFIED** - IaaS behavior differs from FaaS baseline

| Endpoint | FaaS (Baseline) | IaaS (Migration) | Status |
|----------|-----------------|------------------|--------|
| `GET /admin/store/{storeId}` | ✅ Working | ❌ BLOCKED | API key config needed |
| `GET /store/{storeId}/pets` | ✅ Working | ❌ **BEHAVIORAL MISMATCH** | Different response structure |

## Test Environment

- **FaaS URL** (Production): https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main
- **IaaS URL** (Migration Target): http://[IP_REDACTED]:3000/api/v1  
- **FaaS API Key**: [API_KEY_REDACTED]
- **JWT Provider**: Amazon Cognito (User: vicky)
- **Test Date**: 2026-05-10

## Migration Philosophy

**Key Principle**: FaaS defines the contract. IaaS must replicate FaaS behavior exactly.

- **FaaS** = Source of truth (production system, always "correct")
- **OpenAPI** = Documentation of FaaS (may contain inaccuracies to be corrected)
- **IaaS** = Migration target (must match FaaS behavior)

---

## Endpoint Analysis

### 1. GET /admin/store/{storeId}

#### FaaS Behavior (Production Baseline)

**Status:** ✅ 200 OK  
**Response Structure:** Array of Store objects

```json
[
  {
    "address": "123 Main St, Ciudad Principal",
    "id": "store-001",
    "name": "Tienda Principal",
    "value": "main"
  }
]
```

**FaaS Response Schema:**
- Root type: Array
- Store object fields: `id`, `value`, `name`, `address`

#### IaaS Behavior (Migration Target)

**Status:** ❌ 401 Unauthorized  
**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key. Please check your x-api-key header value.",
  "statusCode": 401,
  "timestamp": "2026-05-11T00:19:28.479Z",
  "path": "/api/v1/admin/store/store-001"
}
```

**Root Cause:** IaaS server is not configured with the FaaS API key. The production API key (`[API_KEY_REDACTED]`) was not deployed to the IaaS environment.

#### Migration Status

| Aspect | FaaS (Baseline) | IaaS (Target) | Match? |
|--------|-----------------|---------------|--------|
| **Endpoint accessible** | ✅ Yes | ❌ No (401) | ❌ **BLOCKED** |
| **Authentication** | ✅ API key works | ❌ API key not configured | ❌ **BLOCKER** |
| **Response structure** | Array | Cannot test | ⏸️ **PENDING** |
| **Response fields** | `id`, `value`, `name`, `address` | Cannot test | ⏸️ **PENDING** |

**Migration Gap:** 🔴 **CRITICAL** - Cannot verify endpoint behavior. IaaS deployment is missing API key configuration.

**Required Action:** Configure IaaS with FaaS API key to enable testing.

#### OpenAPI Accuracy Check

**OpenAPI Documentation:** Array of Store objects with required fields `id`, `value`

**Actual FaaS Behavior:** ✅ **ACCURATE** - OpenAPI correctly documents FaaS response structure.

Optional fields documented (`geo`, `franchise`) are not present in FaaS response, which is acceptable for optional fields.

---

### 2. GET /store/{storeId}/pets

#### FaaS Behavior (Production Baseline)

**Status:** ✅ 200 OK  
**Response Structure:** Direct array of Pet objects

```json
[
  {
    "id": "pet1",
    "name": "Fluffy",
    "type": "cat",
    "storeId": "store-001"
  },
  {
    "id": "pet2",
    "name": "Rex",
    "type": "dog",
    "storeId": "store-001"
  }
]
```

**FaaS Response Schema:**
- Root type: **Array** (not an object)
- Pet fields: `id`, `name`, `type`, `storeId`
- No wrapper object
- No count/total field

#### IaaS Behavior (Migration Target)

**Status:** ✅ 200 OK  
**Response Structure:** Object with pets array and metadata

```json
{
  "pets": [],
  "total": 0,
  "storeId": "store-001"
}
```

**IaaS Response Schema:**
- Root type: **Object** (not a direct array)
- Contains `pets` array (empty in this test)
- Contains `total` count field
- Contains `storeId` metadata field

#### Migration Status - CRITICAL MISMATCH

| Aspect | FaaS (Baseline) | IaaS (Target) | Match? |
|--------|-----------------|---------------|--------|
| **Root response type** | Array | Object | ❌ **MISMATCH** |
| **Response structure** | Direct array `[]` | Wrapped object `{pets: []}` | ❌ **MISMATCH** |
| **Pet field: id** | ✅ `id` | N/A (no data) | ⚠️ **UNTESTED** |
| **Pet field: species** | ✅ `type` | N/A (no data) | ⚠️ **UNTESTED** |
| **Count/total field** | ❌ No count | ✅ `total` present | ❌ **EXTRA FIELD** |
| **StoreId in root** | ❌ No | ✅ Yes | ❌ **EXTRA FIELD** |

**Migration Gap:** 🔴 **CRITICAL BREAKING CHANGE** - IaaS returns a fundamentally different response structure than FaaS.

#### Impact Analysis

**Breaking Change for API Clients:**

```javascript
// FaaS client code (CURRENT PRODUCTION)
const pets = await fetch('/store/store-001/pets').then(r => r.json());
pets.forEach(pet => console.log(pet.name));  // ✅ Works

// IaaS behavior (MIGRATION TARGET)
const response = await fetch('/store/store-001/pets').then(r => r.json());
response.forEach(pet => console.log(pet.name));  // ❌ BREAKS - response is object, not array
// Correct IaaS code would be:
response.pets.forEach(pet => console.log(pet.name));  // ✅ Works but different
```

**Consequence:** Any client code expecting a direct array will fail when migrated to IaaS.

#### Required Corrective Actions

**Option 1: Fix IaaS to Match FaaS (RECOMMENDED)**

Change IaaS controller to return direct array:

```typescript
// Current (WRONG for migration)
return {
  pets: petsArray,
  total: petsArray.length,
  storeId: storeId
};

// Corrected (matches FaaS)
return petsArray;
```

**Option 2: Update FaaS to Match IaaS**

If the object structure is preferred, update FaaS Lambda to match IaaS. This requires:
- Updating production FaaS code
- Coordinating with all API clients to update their code
- **NOT RECOMMENDED** - requires broader production changes

#### OpenAPI Accuracy Check

**OpenAPI Documentation:** Object structure `{pets: [], count: integer}`

**Actual FaaS Behavior:** ❌ **INACCURATE** - OpenAPI documents an object structure, but FaaS actually returns a direct array.

**Required Action:** Update OpenAPI spec to reflect actual FaaS behavior:

```yaml
# Current (WRONG)
schema:
  type: object
  properties:
    pets:
      type: array
      items:
        $ref: '#/components/schemas/Pet'
    count:
      type: integer

# Corrected (matches FaaS reality)
schema:
  type: array
  items:
    $ref: '#/components/schemas/Pet'
```

---

## Migration Issues and Required Actions

### Critical Migration Gaps

#### 1. 🔴 IaaS Response Structure Doesn't Match FaaS (GET /store/{storeId}/pets)
**Severity:** CRITICAL - BREAKING CHANGE  
**Impact:** Migration failure - Different API contract

**Problem:**  
IaaS returns `{pets: [], total: 0}` but production FaaS returns direct array `[]`.

**Root Cause:**  
IaaS was implemented following the OpenAPI spec, but the OpenAPI spec does not accurately reflect FaaS production behavior.

**Consequence:**  
- **Breaks API contract compatibility**
- Client code expecting direct array will fail  
- Cannot achieve transparent migration
- This is a **migration blocker**

**Required Action:**  
Fix IaaS to match FaaS production behavior:

```typescript
// IaaS Controller - Current implementation (WRONG)
async searchPets(storeId: string) {
  const pets = await this.petService.findByStore(storeId);
  return {
    pets: pets,
    total: pets.length,
    storeId: storeId
  };
}

// Corrected implementation (matches FaaS)
async searchPets(storeId: string) {
  const pets = await this.petService.findByStore(storeId);
  return pets;  // Direct array, no wrapper
}
```

**Alternative (Not Recommended):** Update production FaaS and coordinate client updates. This defeats the purpose of IaaS migration as a drop-in replacement.

#### 2. 🔴 IaaS Authentication Configuration Missing
**Severity:** CRITICAL - BLOCKER  
**Impact:** Cannot verify endpoint parity

**Problem:**  
IaaS server returns 401 for valid FaaS API key.

**Root Cause:**  
Production API key not deployed to IaaS environment variables.

**Consequence:**  
- Cannot test admin endpoints
- Cannot verify migration completeness
- Deployment process incomplete

**Required Action:**  
Configure IaaS server with FaaS production credentials:

```bash
# On IaaS server ([IP_REDACTED])
export API_KEYS="[API_KEY_REDACTED]"
# OR
export ADMIN_API_KEY="[API_KEY_REDACTED]"

# Restart application
pm2 restart petstore-app
```

### OpenAPI Documentation Issues

#### 3. 🟡 OpenAPI Spec Inaccuracy (GET /store/{storeId}/pets)
**Severity:** MEDIUM  
**Impact:** Misleading documentation, caused IaaS implementation error

**Problem:**  
OpenAPI documents object response structure, but FaaS actually returns direct array.

**Root Cause:**  
During Phase 1 (API Discovery), the OpenAPI generation may have inferred structure incorrectly or applied REST best practices instead of documenting actual behavior.

**Consequence:**  
- IaaS was implemented following wrong spec
- Future developers will be misled
- Testing and client code based on spec will fail

**Required Action:**  
Update [docs/output/openapi.yaml](docs/output/openapi.yaml) to reflect actual FaaS behavior:

```yaml
# File: docs/output/openapi.yaml
# Path: /store/{storeId}/pets -> get -> responses -> 200

# Current (INCORRECT)
'200':
  description: List of pets in the store.
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/PetList'  # Object with {pets, count}

# Corrected (matches FaaS reality)
'200':
  description: Array of pets in the store.
  content:
    application/json:
      schema:
        type: array
        items:
          $ref: '#/components/schemas/Pet'
```

Also update Pet schema field names:
- `petId` → `id`
- `species` → `type`

Remove undocumented fields: `breed`, `age`, `price`, `status`, `description` (not present in FaaS response)

### Minor Observations

#### 4. 🟢 Field Naming Variance
**Severity:** LOW - INFORMATIONAL  
**Impact:** None (if IaaS matches FaaS)

**Observation:**  
If IaaS is corrected to return direct array like FaaS, ensure Pet object field names also match:
- FaaS uses: `id`, `name`, `type`, `storeId`
- Ensure IaaS uses same field names (not `petId`, `species`, etc.)

**Action:** Verify Pet entity/DTO field names in IaaS match FaaS exactly after fixing response structure.

---

## Migration Parity Assessment

### Endpoint Parity Status

#### GET /admin/store/{storeId}

| Assessment Criteria | Status | Notes |
|---------------------|--------|-------|
| **Endpoint reachable** | ❌ BLOCKED | IaaS returns 401 (API key not configured) |
| **Response structure match** | ⏸️ UNTESTED | Cannot verify until auth fixed |
| **Field names match** | ⏸️ UNTESTED | Cannot verify until auth fixed |
| **Data values match** | ⏸️ UNTESTED | Cannot verify until auth fixed |

**Verdict:** ⏸️ **INCOMPLETE** - Cannot assess parity due to authentication blocker

#### GET /store/{storeId}/pets

| Assessment Criteria | Status | Notes |
|---------------------|--------|-------|
| **Endpoint reachable** | ✅ PASS | Both return 200 OK |
| **Response structure match** | ❌ **FAIL** | FaaS: array, IaaS: object - **BREAKING** |
| **Field names match** | ⏸️ UNTESTED | Cannot verify (IaaS empty, FaaS uses `id`/`type`) |
| **Data values match** | ⏸️ UNTESTED | IaaS has no data to compare |

**Verdict:** ❌ **FAILED** - Critical response structure mismatch

---

## Overall Migration Status

### 🔴 MIGRATION INCOMPLETE - Critical Gaps Identified

**Migration Goal:** IaaS must replicate FaaS production behavior exactly for transparent migration.

**Current State:** IaaS has **critical deviations** from FaaS that prevent drop-in replacement.

### Gap Summary

| Category | Issue | Severity | Blocking? |
|----------|-------|----------|-----------|
| **Response Structure** | IaaS returns object, FaaS returns array | 🔴 CRITICAL | ✅ YES |
| **Authentication** | IaaS missing FaaS API key | 🔴 CRITICAL | ✅ YES |
| **OpenAPI Accuracy** | Spec doesn't match FaaS reality | 🟡 MEDIUM | ❌ NO (doc issue) |

### What Works ✅

- **JWT Authentication**: Both FaaS and IaaS successfully validate Cognito tokens
- **Endpoint routing**: Paths and HTTP methods correctly implemented
- **HTTP status codes**: Appropriate responses (200, 401)
- **Authorization model**: Cognito integration working

### What's Broken ❌

- **API Contract Compatibility**: IaaS pets endpoint has different response structure than FaaS
- **Deployment Configuration**: IaaS missing production API keys
- **Behavioral Parity**: Cannot achieve transparent migration with current gaps

### Migration Readiness

**Can IaaS replace FaaS today?** ❌ **NO**

**Blockers:**
1. Response structure mismatch will break client code
2. Missing API key configuration prevents admin operations
3. Untested data serialization (no pet data in IaaS to compare field names)

**Estimated Effort to Fix:**
- Response structure fix: ~30 minutes (1 controller change)
- API key configuration: ~5 minutes (env var + restart)
- Verification testing: ~1 hour (full endpoint comparison)

**Total:** ~2 hours to migration-ready state

---

## Required Actions (Priority Order)

### MUST FIX (Migration Blockers)

1. **🔴 P0: Fix IaaS Response Structure**
   - **File:** `src/monolith-app/src/presentation/controllers/store-pets.controller.ts` (or similar)
   - **Change:** Return direct array instead of object wrapper
   - **Verify:** Response matches FaaS exactly

2. **🔴 P0: Configure IaaS API Keys**
   - **Action:** Deploy FaaS production API key to IaaS environment
   - **Verify:** Admin endpoints accessible with same credentials as FaaS

3. **🔴 P0: Seed IaaS Test Data**
   - **Action:** Create same pets (pet1, pet2) in IaaS database
   - **Verify:** Field names match FaaS (`id`, `name`, `type`, `storeId`)

### SHOULD FIX (Documentation)

4. **🟡 P1: Correct OpenAPI Specification**
   - **File:** `docs/output/openapi.yaml`
   - **Change:** Update pets endpoint to return array, not object
   - **Change:** Update Pet schema field names (`id`, `type` not `petId`, `species`)
   - **Verify:** Spec accurately documents FaaS behavior

### NICE TO HAVE (Completeness)

5. **🟢 P2: Complete Endpoint Testing**
   - Test all endpoints documented in OpenAPI
   - Verify FaaS-IaaS parity across entire API surface
   - Document any intentional differences

---

## Revised OpenAPI Specification

The following changes should be made to `docs/output/openapi.yaml` to accurately reflect FaaS production behavior:

### Change 1: Pets Endpoint Response Type

**Location:** `/store/{storeId}/pets` → `get` → `responses` → `200`

```yaml
# BEFORE (Incorrect)
responses:
  '200':
    description: List of pets in the store.
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/PetList'

# AFTER (Matches FaaS)
responses:
  '200':
    description: Array of pets in the store.
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Pet'
```

### Change 2: Pet Schema Field Names

**Location:** `components` → `schemas` → `Pet`

```yaml
# BEFORE (Incorrect)
Pet:
  type: object
  properties:
    petId: string
    species: string
    # ... other fields

# AFTER (Matches FaaS)
Pet:
  type: object
  properties:
    id: string
    type: string
    name: string
    storeId: string
  # Remove undocumented fields: breed, age, price, status, description
```

### Change 3: Remove PetList Schema

**Location:** `components` → `schemas` → `PetList`

```yaml
# DELETE this schema (not used by FaaS)
PetList:
  type: object
  properties:
    pets:
      type: array
      items:
        $ref: '#/components/schemas/Pet'
    count:
      type: integer
```

---

## Test Details

**Test Execution:**
- **Date:** 2026-05-10
- **Method:** Manual curl + jq
- **Cognito User:** vicky
- **API Key Tested:** [API_KEY_REDACTED]
- **Test Store:** store-001
- **Test Pets:** pet1 (Fluffy, cat), pet2 (Rex, dog)

**Test Commands:**

```bash
# Get FaaS store response
curl -H "x-api-key: [API_KEY_REDACTED]" \
  https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/admin/store/store-001

# Get IaaS store response (FAILED - 401)
curl -H "x-api-key: [API_KEY_REDACTED]" \
  http://[IP_REDACTED]:3000/api/v1/admin/store/store-001

# Get Cognito token
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=vicky,PASSWORD=*** \
  --client-id [COGNITO_CLIENT_ID_REDACTED] \
  --region sa-east-1 \
  --query 'AuthenticationResult.IdToken' --output text)

# Get FaaS pets (returns array)
curl -H "Authorization: Bearer $TOKEN" \
  https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/store/store-001/pets

# Get IaaS pets (returns object)
curl -H "Authorization: Bearer $TOKEN" \
  http://[IP_REDACTED]:3000/api/v1/store/store-001/pets
```

---

## Conclusion

This conformance testing identified **critical gaps** in the FaaS-to-IaaS migration:

1. **IaaS does not replicate FaaS behavior** - Response structure differs
2. **OpenAPI spec is inaccurate** - Documents ideal state, not actual FaaS behavior  
3. **Deployment incomplete** - Missing production credentials

### Key Learning

**The migration process had a flaw:** The OpenAPI spec (Phase 1) did not accurately capture FaaS runtime behavior. IaaS was then implemented following the inaccurate spec, resulting in behavioral divergence from FaaS.

### Corrective Process

1. **Document FaaS reality first** (not idealized API design)
2. **Implement IaaS to match documented reality**
3. **Verify parity through testing** (this phase)
4. **Fix gaps** (current state)

### Next Steps

1. ✅ Fix IaaS response structure (2 hours)
2. ✅ Configure authentication (5 minutes)  
3. ✅ Update OpenAPI spec (30 minutes)
4. ✅ Re-run conformance testing
5. ✅ Achieve migration parity

**Estimated Time to Production-Ready:** 2-3 hours of focused work.

---

**Report Generated By:** GitHub Copilot (Claude Sonnet 4.5)  
**Testing Approach:** Comparative API behavior analysis (FaaS baseline vs IaaS migration)  
**Report Version:** 2.0 (Migration-focused perspective)
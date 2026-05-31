# Análisis del Código Lambda: Rate Limiting Investigation

**Función Lambda:** `petstoreAdminStoreCrud-main`  
**Fecha:** 2026-05-17  
**Endpoint:** GET /admin/store/{storeId}

## 📋 Hallazgos del Código

### ✅ **No hay Rate Limiting en la Aplicación**

**Archivo principal:** `app.js`
- ✅ Aplicación Express.js estándar
- ✅ CRUD operations básicas con DynamoDB
- ✅ Sin middleware de rate limiting
- ✅ Sin lógica que devuelva HTTP 429
- ✅ Sin menciones de "Limit Exceeded"

**Dependencias:** `package.json`
```json
{
  "dependencies": {
    "aws-serverless-express": "^3.3.5",
    "body-parser": "^1.19.1", 
    "express": "^4.17.2"
  }
}
```
- ✅ Sin bibliotecas de rate limiting (express-rate-limit, etc.)

### 📊 **Configuración de Infraestructura**

**DynamoDB Table:** `petstoreTenants-main`
- ReadCapacityUnits: 5 ⚠️ (Muy bajo pero sin throttling reportado)
- WriteCapacityUnits: 5 ⚠️ (Muy bajo pero sin throttling reportado)
- Sin throttling en métricas de CloudWatch

## 🎯 **Fuente Real del Rate Limiting**

### Análisis de Headers de Respuesta
```http
HTTP/2 429 
x-amzn-errortype: LimitExceededException
x-cache: Error from cloudfront
via: 1.1 eed7bd53ac21bb2ec20f7056a2f8ebfa.cloudfront.net (CloudFront)
```

**Conclusiones:**
1. **Error originado en AWS API Gateway** (`x-amzn-errortype: LimitExceededException`)
2. **Procesado por CloudFront** (`x-cache: Error from cloudfront`)
3. **NO es del código de la aplicación**

### Posibles Causas
1. **Service Quotas de AWS** (no verificables por permisos limitados)
2. **Account-level limits** 
3. **CloudFront rate limiting**
4. **Previous load test impact** - límites temporales activados por pruebas anteriores

## 🔧 **Soluciones Recomendadas**

### Inmediatas
1. **Esperar período de cool-down** (1-2 horas)
2. **Verificar con administrador AWS** los service quotas
3. **Probar con diferentes IP** (posible IP-based limiting)

### Configuración
1. **Aumentar DynamoDB capacity** a 25+ RCU/WCU para evitar futuros bottlenecks
2. **Implementar monitoring** de service quotas
3. **Configurar alertas** de throttling

---

## 📚 **Análisis: ¿Dónde Debería Estar el Rate Limiting?**

### 🏗️ **Mejores Prácticas por Capa**

#### **1. API Gateway (RECOMENDADO ✅)**
**Ventajas:**
- ✅ **Eficiencia:** Bloquea requests antes de que lleguen a Lambda
- ✅ **Costo:** Reduce ejecuciones innecesarias de Lambda  
- ✅ **Performance:** Respuesta inmediata sin cold start
- ✅ **Configuración declarativa:** Fácil de gestionar
- ✅ **Observabilidad:** Métricas nativas de AWS

**Casos de uso:**
- Rate limiting general por API key
- Protección DDoS básica
- Limits por stage (dev/prod)

**Implementación:**
```bash
# Usage Plans con throttling
aws apigateway put-usage-plan \
  --usage-plan-id dpfjhw \
  --throttle burstLimit=100,rateLimit=200
```

#### **2. CloudFront (Para protección global) ⚠️**
**Ventajas:**
- ✅ **Geographic distribution:** Rate limiting global
- ✅ **Edge protection:** Bloquea en el edge más cercano
- ✅ **WAF integration:** Rules complejas

**Desventajas:**
- ❌ **Menos granular:** Difícil personalizar por usuario
- ❌ **Caching conflicts:** Puede interferir con API responses

#### **3. Lambda Function (NO RECOMENDADO ❌)**
**Desventajas:**
- ❌ **Overhead:** Ejecuta función completa antes de verificar
- ❌ **Cold start penalty:** Aumenta latencia
- ❌ **Costo:** Billing por execution time
- ❌ **Complejidad:** Lógica de negocio + rate limiting mezcladas
- ❌ **State management:** Requiere external store (Redis/DynamoDB)

**Único caso válido:**
- Rate limiting específico por lógica de negocio compleja

### 🎯 **Recomendación para este Caso**

#### **Configuración Óptima:**

1. **API Gateway (Primary):**
   ```
   Usage Plan:
   - Rate: 1000 req/s (alto para load testing)
   - Burst: 2000 req/s
   - Daily quota: 100,000
   ```

2. **Lambda (Business logic only):**
   ```javascript
   // NO incluir rate limiting
   // Solo lógica de negocio pura
   app.get('/admin/store/:id', async (req, res) => {
     // Business logic only
     const data = await ddbDocClient.send(new QueryCommand(params));
     res.json(data.Items);
   });
   ```

3. **DynamoDB (Resource protection):**
   ```
   - On-demand billing (recommended)
   - O provisioned capacity alto (25+ RCU/WCU)
   ```

### 🛡️ **Circuit Breaker vs Rate Limiting**

#### **Circuit Breaker (Para resiliencia):**
- **Ubicación:** Lambda function o service mesh
- **Propósito:** Proteger downstream services
- **Cuando:** Service degradation/failures
- **Tool:** AWS X-Ray, hystrix-js

#### **Rate Limiting (Para capacity protection):**
- **Ubicación:** API Gateway
- **Propósito:** Proteger infrastructure capacity
- **Cuando:** High traffic/abuse prevention  
- **Tool:** Usage Plans, WAF

### 📊 **Comparación de Performance**

| Ubicación | Latencia Extra | Costo | Flexibility | Observabilidad |
|-----------|----------------|-------|-------------|----------------|
| **CloudFront + WAF** | ~1ms | $ | ⭐⭐ | ⭐⭐⭐ |
| **API Gateway** | ~5-10ms | $$ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Lambda App** | ~100-500ms | $$$$ | ⭐⭐⭐⭐ | ⭐⭐ |

### ✅ **Conclusión**

**El rate limiting en la función Lambda es un anti-pattern.** 

**Configuración recomendada:**
1. **API Gateway:** Rate limiting general y protección de capacity
2. **Lambda:** Solo business logic pura  
3. **DynamoDB:** Sufficient provisioned capacity
4. **CloudWatch:** Monitoring y alertas

**Current issue:** Probablemente service quotas or account limits que requieren escalación con AWS Support.

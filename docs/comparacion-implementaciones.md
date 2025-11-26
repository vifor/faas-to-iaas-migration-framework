# Comparación de Implementaciones de Autenticación: FaaS vs IaaS

## Resumen Ejecutivo

Este documento analiza las diferencias arquitecturales entre las implementaciones de autenticación y autorización en las versiones FaaS (AWS Lambda) e IaaS (NestJS Monolito) del sistema PetStore, con el objetivo de establecer una base técnica para la medición comparativa de rendimiento.

## Arquitecturas de Autenticación

### Implementación FaaS (AWS Lambda)

**Flujo de Autenticación:**

```
Usuario → API Gateway → Lambda Authorizer → Amazon Verified Permissions → Lambda Business → DynamoDB
```

**Componentes:**

- **API Gateway**: Punto de entrada HTTPS (5brhnloiod.execute-api.sa-east-1.amazonaws.com)
- **Lambda Authorizer** (`petstoreAuthorizer`): Verificación JWT + autorización AVP
- **Amazon Cognito**: User Pool (sa-east-1_LAeXR4OOV) para gestión de usuarios
- **Amazon Verified Permissions**: Políticas Cedar para autorización granular
- **Lambda Business** (`petstoreAdminStoreCrud`): Lógica de negocio
- **DynamoDB**: Base de datos (petstoreTenants)

**Características:**

- Cold start: ~800ms en primera invocación
- Escalabilidad automática por función
- Sin estado entre invocaciones
- Verificación JWT contra Cognito (AWS nativo)
- Autorización mediante políticas Cedar

### Implementación IaaS (NestJS Monolito)

**Flujo de Autenticación:**

```
Usuario → NestJS App (Puerto 3000) → JWT Guard → Controller → Service → DynamoDB
```

**Componentes:**

- **NestJS Application**: Aplicación monolítica en puerto 3000
- **AuthController**: Endpoints de autenticación (`/api/v1/auth/`)
- **JwtAuthGuard**: Validación de tokens Bearer JWT
- **AuthService**: Generación y gestión de tokens JWT
- **DynamoDB**: Base de datos (local/AWS)

**Características:**

- Sin cold start (aplicación siempre ejecutándose)
- Escalabilidad manual (contenedores/instancias)
- Estado en memoria (cache, sesiones)
- Verificación JWT local con secreto propio
- Autorización mediante decoradores NestJS

## Análisis Comparativo Detallado

### 1. Gestión de Tokens JWT

| Aspecto          | FaaS                        | IaaS                       |
| ---------------- | --------------------------- | -------------------------- |
| **Emisor**       | AWS Cognito                 | NestJS AuthService         |
| **Verificación** | Lambda Authorizer + Cognito | JwtAuthGuard local         |
| **Secreto**      | Cognito User Pool keys      | JWT_SECRET configurado     |
| **Expiración**   | Cognito configurado (15m)   | Configurable (24h default) |
| **Refresh**      | Cognito refresh tokens      | Custom refresh tokens      |

### 2. Puntos de Entrada

**FaaS:**

```
GET https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main/pets
Authorization: Bearer <cognito-jwt-token>
```

**IaaS:**

```
GET http://localhost:3000/api/v1/store/{storeId}/pets
Authorization: Bearer <nestjs-jwt-token>
```

### 3. Latencia y Rendimiento

**FaaS (Medido):**

- Total: ~2.5 segundos
- Autenticación: 800ms (cold start + JWT verificación)
- Autorización: 200ms (AVP policy evaluation)
- Lógica de negocio: 1.4s (Lambda + DynamoDB)

**IaaS (Estimado):**

- Total: ~50-200ms
- Autenticación: 5-10ms (verificación JWT local)
- Autorización: 5-10ms (guards locales)
- Lógica de negocio: 40-180ms (app + DynamoDB)

### 4. Componentes de Autorización

**FaaS - Amazon Verified Permissions:**

```javascript
// Política Cedar
permit(
    principal in MyApplication::Role::"StoreOwnerRole",
    action in [MyApplication::Action::"SearchPets"],
    resource in MyApplication::Store::*
);
```

**IaaS - Decoradores NestJS:**

```typescript
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@RequireResource('MyApplication::Store')
@RequireAction('SearchPets')
async listStorePets() { ... }
```

### 5. Configuración de Seguridad

**FaaS:**

- Middleware: API Gateway (CORS, rate limiting)
- Validación: Lambda Authorizer
- Logs: CloudWatch automático
- Secrets: AWS Systems Manager

**IaaS:**

- Middleware: NestJS (helmet, compression, CORS)
- Validación: ValidationPipe global
- Logs: NestJS Logger
- Secrets: Configuración local (.env)

## Endpoints para Comparación

### Autenticación

| Operación | FaaS            | IaaS                         |
| --------- | --------------- | ---------------------------- |
| Login     | Cognito SDK     | `POST /api/v1/auth/login`    |
| Register  | Cognito SDK     | `POST /api/v1/auth/register` |
| Refresh   | Cognito SDK     | `POST /api/v1/auth/refresh`  |
| Profile   | No implementado | `GET /api/v1/auth/profile`   |

### Operaciones de Negocio

| Operación      | FaaS             | IaaS                                      |
| -------------- | ---------------- | ----------------------------------------- |
| Listar Pets    | `GET /main/pets` | `GET /store/{storeId}/pets`               |
| Crear Pet      | No implementado  | `POST /store/{storeId}/pet/create`        |
| Obtener Pet    | No implementado  | `GET /store/{storeId}/pet/get/{petId}`    |
| Actualizar Pet | No implementado  | `PUT /store/{storeId}/pet/update/{petId}` |

## Diferencias Arquitecturales Clave

### 1. **Modelo de Ejecución**

- **FaaS**: Event-driven, stateless, pay-per-execution
- **IaaS**: Always-on, stateful, resource-based pricing

### 2. **Gestión de Estado**

- **FaaS**: Sin estado entre invocaciones, datos en DynamoDB/Cognito
- **IaaS**: Estado en memoria, cache de aplicación, sesiones persistentes

### 3. **Escalabilidad**

- **FaaS**: Automática, granular por función, límites de concurrencia
- **IaaS**: Manual, horizontal scaling, load balancers

### 4. **Cold Start Impact**

- **FaaS**: 800ms initial penalty, warm instances performance
- **IaaS**: Sin cold start, tiempo de startup inicial del contenedor

### 5. **Debugging y Monitoring**

- **FaaS**: CloudWatch logs, X-Ray tracing, distributed logging
- **IaaS**: Centralized logging, APM tools, direct debugging

## Recomendaciones para Testing

### 1. **Configuración de Tests Equivalentes**

- Usar misma funcionalidad (listar pets)
- Medir end-to-end incluyendo autenticación
- Considerar warm-up para FaaS
- Tests con diferentes cargas de trabajo

### 2. **Métricas a Medir**

- Latencia p50, p95, p99
- Throughput (requests/second)
- Error rate
- CPU/Memory utilization
- Costo por request

### 3. **Escenarios de Prueba**

- Cold start vs warm instances (FaaS)
- Concurrent users (1, 10, 100, 1000)
- Sustained load vs burst traffic
- Different payload sizes

## Conclusiones Técnicas

1. **Paradigmas Diferentes**: FaaS event-driven vs IaaS always-on requieren enfoques de testing diferentes

2. **Trade-offs de Rendimiento**: FaaS penaliza cold starts pero escala automáticamente; IaaS tiene latencia consistente pero requiere gestión manual

3. **Complejidad de Autorización**: FaaS distribuye autorización en múltiples servicios (Cognito + AVP); IaaS centraliza en la aplicación

4. **Equivalencia Funcional**: Ambas implementaciones proporcionan funcionalidad similar pero con diferentes patrones de rendimiento

## Próximos Pasos

1. Implementar tests K6 para IaaS equivalentes a FaaS
2. Configurar métricas de monitoreo para ambas arquitecturas
3. Ejecutar pruebas comparativas bajo diferentes cargas
4. Analizar costos operacionales vs rendimiento
5. Documentar recomendaciones basadas en casos de uso

---

**Fecha de Análisis**: 16 de Noviembre, 2025  
**Versión**: 1.0  
**Autores**: Equipo de Migración FaaS-to-IaaS

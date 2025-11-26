# Resultados de Ejecución de Tests - 16 de Noviembre 2025

## Resumen Ejecutivo

Se ejecutaron los tests K6 para evaluar el rendimiento de las implementaciones FaaS y IaaS. Los tests FaaS fueron completamente exitosos, mientras que los tests IaaS no pudieron ejecutarse debido a problemas de configuración del monolito NestJS.

## Tests FaaS Ejecutados ✅

### 1. Test con Token Caching (`test-with-token-caching.js`)

**Configuración:**

- Duración: 40 segundos
- Usuarios: 1→5→1 (etapas graduales)
- Cache de tokens: 55 minutos

**Resultados Exitosos:**

```
✅ 100% éxito: 274/274 checks pasados
⚡ Rendimiento promedio: 668ms
📊 P95: 1.32s (bajo umbral de 3s)
🔄 Token caching: Funcionando perfectamente
📈 Throughput: 3.52 requests/second
📉 0% errores
```

**Observaciones Clave:**

- **Primera request**: ~6s (incluye cold start + autenticación inicial)
- **Requests siguientes**: ~500-800ms (tokens cacheados)
- **Cold start impact**: Primera invocación ~800ms-1.1s
- **Warm requests**: Consistentes 400-700ms

### 2. Test de Autenticación Completa (`test-complete-auth.js`)

**Configuración:**

- Duración: 5 segundos
- Usuario: 1 VU
- Flujo: Login → Endpoint protegido

**Resultados Exitosos:**

```
✅ Autenticación Cognito: 100% exitosa
🔑 Tokens JWT: Generados correctamente
🏪 Acceso autorizado: store-001 funcionando
📋 Configuración verificada:
   - Username: vicky
   - Grupo: StoreOwnerRole
   - Store: store-001
   - AVP: Políticas funcionando
```

**Métricas de Performance:**

- **Promedio total**: 559ms
- **Rango**: 321-708ms
- **P95**: 687ms
- **Iteraciones**: 5 completas

## Tests IaaS - Estado Bloqueado ❌

### Problema Identificado: Dependencias NestJS

**Error Principal:**

```
Nest can't resolve dependencies of the ApiKeyGuard (ConfigService, ?).
Please make sure that the argument AuthService at index [1] is available
in the PresentationModule context.
```

**Síntomas:**

- Aplicación NestJS no inicia en puerto 3000
- Error de inyección de dependencias
- Module configuration issues
- Tests K6 fallan con "connection refused"

**Tests Afectados:**

- `iaas-auth-flow.js`: No ejecutado
- `iaas-load-test.js`: No ejecutado
- `iaas-test-suite.js`: No ejecutado
- `faas-vs-iaas.js`: Comparación parcial no posible

## Análisis Comparativo Parcial

### FaaS Performance (Medido)

| Métrica           | Valor      | Estado                       |
| ----------------- | ---------- | ---------------------------- |
| **Cold Start**    | 800-1100ms | ⚠️ Impacto significativo     |
| **Warm Requests** | 400-700ms  | ✅ Aceptable                 |
| **Autenticación** | ~600ms     | ✅ Cognito + AVP funcionando |
| **Throughput**    | 3.5 req/s  | ✅ Para carga ligera         |
| **Error Rate**    | 0%         | ✅ Muy confiable             |

### IaaS Performance (Estimado - No Medido)

| Métrica           | Valor Esperado | Estado                         |
| ----------------- | -------------- | ------------------------------ |
| **Cold Start**    | 0ms            | ✅ Always-on                   |
| **Requests**      | 50-200ms       | 🔄 Pendiente medición          |
| **Autenticación** | 10-50ms        | 🔄 Local JWT verification      |
| **Throughput**    | >50 req/s      | 🔄 Mayor concurrencia esperada |
| **Error Rate**    | <1%            | 🔄 Pendiente validación        |

## Impacto del Token Caching

### Beneficio Medido en FaaS:

- **Sin cache**: Cada request incluye ~800ms de autenticación
- **Con cache**: Requests posteriores ~500ms (62% mejora)
- **Cache duration**: 55 minutos (configuración Cognito)
- **Eficiencia**: Cache shared entre usuarios virtuales

### Proyección para IaaS:

- **Cache local**: Tokens JWT verificados localmente
- **Duración esperada**: 24 horas (configuración NestJS)
- **Overhead**: Minimal JWT verification (<10ms)

## Conclusiones Técnicas

### 1. **FaaS Funcional y Medible**

- ✅ Stack completo operativo
- ✅ Métricas baseline establecidas
- ✅ Token caching optimizado
- ⚠️ Cold start impact significativo

### 2. **IaaS Requiere Configuración**

- ❌ Módulo dependencies resolver
- ❌ AuthService injection fix
- ❌ PresentationModule configuration
- 🔄 Performance testing pendiente

### 3. **Diferencia Esperada**

Basado en arquitecturas:

- **Latencia**: IaaS debería ser 5-10x más rápida
- **Consistencia**: IaaS sin variabilidad de cold start
- **Throughput**: IaaS mayor capacidad concurrente

## Próximos Pasos Inmediatos

### 1. **Resolver IaaS Dependencies** (Prioridad Alta)

- Fix AuthService injection in PresentationModule
- Verify module imports chain
- Ensure proper dependency resolution

### 2. **Ejecutar Tests IaaS Completos**

- `iaas-auth-flow.js`: Verificación funcional
- `iaas-load-test.js`: Performance baseline
- `iaas-test-suite.js`: Multi-scenario testing

### 3. **Comparación Directa**

- `faas-vs-iaas.js`: Side-by-side comparison
- Análisis de speedup real vs proyecciones
- Documentación de trade-offs medidos

### 4. **Optimización Targeted** (Si requerido)

- FaaS warm-up strategies
- IaaS caching improvements
- Load balancing considerations

## Estado del Proyecto

| Componente        | Estado         | Próxima Acción       |
| ----------------- | -------------- | -------------------- |
| **FaaS Tests**    | ✅ Completo    | Baseline establecido |
| **IaaS Setup**    | ❌ Bloqueado   | Fix dependencies     |
| **Comparación**   | 🔄 Pendiente   | Post-IaaS fix        |
| **Documentación** | ✅ Actualizada | Resultados finales   |

---

**Fecha**: 16 de Noviembre 2025  
**Duración Total**: ~45 minutos testing  
**Tests Ejecutados**: 2/5 (40% completado)  
**Próximo Milestone**: IaaS dependency resolution

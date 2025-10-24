# Framework de Migración FaaS-to-IaaS

Este diagrama muestra el flujo de decisión para migrar aplicaciones FaaS a arquitectura IaaS monolítica.

## Diagrama del Framework

```mermaid
flowchart TD
    A[Inicio: Migración FaaS] --> B(Paso 1: Analizar Backend vía Prompt → openapi.yaml)
    B --> C(Paso 2: Analizar Capa de Datos vía Prompt/IaC → data-base-definition.txt)
    C --> D{¿Migración en 2 etapas viable?}

    %% Camino Unificado - Define los pasos de BD
    D -->|"No (Muchas BDs, Alta Duplicación)"| L[Diseñar Esquema BD IaaS]
    L --> M[Implementar Lógica Backend NestJS Hexagonal<br>con Adaptador BD IaaS]
    M --> N[Migrar Datos]

    %% Camino de 2 Etapas - Reutiliza pasos de BD
    D -->|"Sí (Pocas BDs, Baja Duplicación)"| E[Implementar Lógica Backend NestJS Hexagonal<br>con Adaptador BD FaaS DynamoDB]
    E --> G{¿Migrar BD ahora?<br>Opcional}
    G -->|No| H[Fin: Monolito IaaS Funcional]
    G -->|Sí| L

    %% Finalización - Todas las rutas convergen aquí
    N --> H

    %% Estilos
    classDef decisionNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef endNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:3px

    class D,G decisionNode
    class A,B,C,E,L,M,N processNode
    class H endNode
```

## Descripción del Flujo

### 🔍 **Fase de Análisis**

1. **Analizar Backend**: Generar especificación OpenAPI desde el código FaaS
2. **Analizar Datos**: Documentar estructura de base de datos desde IaC y código

### 🤔 **Punto de Decisión Estratégica**

**¿Es viable una migración en 2 etapas?**

- **Criterios para SÍ**: Pocas bases de datos, baja duplicación de datos
- **Criterios para NO**: Muchas bases de datos, alta duplicación/complejidad

### 🛤️ **Dos Caminos de Migración**

#### **Camino 1: Migración de 2 Etapas** 🟢

- **Ventajas**: Menor riesgo inicial, migración incremental
- **Proceso**:
  1. Implementar backend NestJS con adaptadores para BD existente (ej: DynamoDB)
  2. **Decisión opcional**: Migrar BD más tarde reutilizando pasos del camino unificado

#### **Camino 2: Migración Unificada** 🔴

- **Ventajas**: Arquitectura final desde el inicio, mejor para casos complejos
- **Proceso**:
  1. Diseñar esquema de BD IaaS
  2. Implementar backend NestJS con adaptadores de BD IaaS
  3. Migrar datos directamente

### 🎯 **Resultado Final**

Ambos caminos convergen en: **Monolito IaaS Funcional**

## Ejemplo de Aplicación: PetStore

El proyecto PetStore siguió el **Camino de 2 Etapas** porque:

- ✅ Solo 2 tablas DynamoDB (pocas BDs)
- ✅ Estructura simple sin duplicación compleja (baja duplicación)
- ✅ Relaciones claras (franchise → stores)
- ✅ Beneficio de entrega rápida con menor riesgo inicial

### Implementación en 2 Etapas:

**Etapa 1: Backend NestJS + DynamoDB**

- Migración inmediata del backend a NestJS con Arquitectura Hexagonal
- Adaptadores DynamoDB mantienen la BD existente funcionando
- Entrega rápida del monolito IaaS funcional
- Reducción de riesgo al no cambiar BD y backend simultáneamente

**Etapa 2: Migración de BD (Opcional/Futura)**

- Si surge la necesidad de BD IaaS (ej: consultas complejas, herramientas SQL)
- Solo requiere cambiar adaptadores de base de datos (~5-7 días trabajo)
- 85% del código se mantiene igual gracias a Arquitectura Hexagonal
- Migración controlada y predecible

## Arquitectura NestJS Hexagonal

Ambos caminos implementan la **Arquitectura Hexagonal (Ports and Adapters)**:

```
┌─────────────────────────────────────────┐
│             NestJS Application          │
│  ┌─────────────────────────────────────┐ │
│  │        Business Logic Core         │ │
│  │     (Domain Services & Entities)    │ │
│  └─────────────────────────────────────┘ │
│              ▲              ▲            │
│              │              │            │
│         ┌────────┐     ┌──────────┐      │
│         │  HTTP  │     │Database  │      │
│         │  Port  │     │   Port   │      │
│         └────────┘     └──────────┘      │
└─────────────────────────────────────────┘
              ▲              ▲
              │              │
    ┌─────────────┐    ┌─────────────┐
    │    REST     │    │  Database   │
    │   Adapter   │    │   Adapter   │
    │(Controllers)│    │(DynamoDB/SQL/│
    └─────────────┘    │  MongoDB)   │
                       └─────────────┘
```

Esta arquitectura permite cambiar fácilmente entre adaptadores de base de datos (DynamoDB ↔ PostgreSQL ↔ MongoDB) sin afectar la lógica de negocio.

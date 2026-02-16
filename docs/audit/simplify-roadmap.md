# Roadmap: Architecture Simplification

**Date:** February 16, 2026
**Branch:** feature/simplify
**Objective:** Maintain URL-First integrity and Pop-Out capabilities while drastically reducing the boilerplate overhead for standard use cases.

## Executive Summary

The current architecture, while robust, requires excessive manual configuration for standard CRUD-like features. Adding a single field often involves modifying 4-5 files (Model, Filter Config, Table Config, URL Mapper, API Adapter).

This roadmap proposes a **"Convention over Configuration"** approach. We will introduce a unified `ResourceDefinition` schema that acts as the single source of truth for a field. Generic utilities will then consume this definition to automatically generate Table Configs, Filter Definitions, URL Mappers, and API Adapters, reducing the code required for a new domain by ~70%.

---

## Phase 1: Unified Resource Definition
**Goal:** Define a field *once* and derive all other configurations from it.

### 1.1 Create `ResourceDefinition` Schema
Create a new interface that combines metadata for Data Models, Filters, and Table Columns.

```typescript
// Proposed Structure
export interface ResourceField {
  name: string;             // Property name (e.g., 'year')
  label: string;            // Display label (e.g., 'Model Year')
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  
  // Capability Flags (Convention: true by default where applicable)
  filterable?: boolean;     // Generates FilterDefinition
  sortable?: boolean;       // Adds sort support in Table & API
  visible?: boolean;        // default column in Table
  
  // Overrides (Optional)
  urlParam?: string;        // defaults to 'name'
  apiParam?: string;        // defaults to 'name'
}

export interface ResourceDefinition {
  name: string;             // Domain name
  fields: ResourceField[];
  endpoints: {
    search: string;
    stats?: string;
  };
}
```

### 1.2 Refactor Automobile Config
Create `src/app/domain-config/automobile/automobile.resource.ts` using the new schema. This will replace the disparate config files eventually.

---

## Phase 2: Automation (Generic Utilities)
**Goal:** Eliminate manual Mappers, Adapters, and Config generators for standard cases.

### 2.1 Generic URL Mapper (`GenericUrlMapper<T>`)
Implement a mapper that reads the `ResourceDefinition` to parse and serialize URLs.
*   **Logic:** Iterate over `fields`. If `type` is number, parse as number. If `type` is date, parse as date.
*   **Benefit:** Deletes `AutomobileUrlMapper` (approx. 200 lines of boilerplate).

### 2.2 Generic API Adapter (`GenericApiAdapter<T>`)
Implement an adapter that converts the unified `ResourceDefinition` into standard REST query parameters.
*   **Logic:** Map `filters` to `apiParam` (or `name`). Handle standard pagination (`page`, `size`) and sorting automatically.
*   **Benefit:** Deletes manual parameter mapping logic in `AutomobileApiAdapter`.

### 2.3 Config Generators
Create utility functions to generate the specific configs required by the UI components from the master definition.
*   `generateTableConfig(def: ResourceDefinition)` -> Returns `TableConfig`
*   `generateFilterDefinitions(def: ResourceDefinition)` -> Returns `FilterDefinition[]`

---

## Phase 3: Component Abstraction
**Goal:** Reduce component wiring overhead.

### 3.1 `AbstractResourceComponent`
Create a base class (or mixin) for feature components like `AutomobileComponent` and `DiscoverComponent`.
*   **Responsibility:**
    *   Injects `ResourceManagementService`.
    *   Exposes standard streams (`results$`, `loading$`, `filters$`) to the template.
    *   Handles common actions (`onPageChange`, `onSort`, `onFilter`).
*   **Benefit:** Reduces `AutomobileComponent` to essentially just an HTML template and a constructor.

### 3.2 Pop-Out Manager Service
Refine `PopOutManagerService` to encapsulate the window opening/tracking logic found in `DiscoverComponent`.
*   **Current State:** `DiscoverComponent` manually manages `window.open`, `BroadcastChannel`, and message handling.
*   **Target State:** `this.popOutManager.openPanel('id')` should handle everything.

---

## Phase 4: Implementation Plan

1.  **Prototype:** Create `GenericUrlMapper` and test it with a subset of Automobile fields.
2.  **Migration:**
    *   Define `AutomobileResource` (Phase 1).
    *   Replace `AutomobileUrlMapper` with `GenericUrlMapper` (Phase 2.1).
    *   Replace manual Table/Filter configs with Generators (Phase 2.3).
3.  **Cleanup:** Delete the legacy manual files (`automobile.table-config.ts`, `automobile.url-mapper.ts`, etc.).

## Risk Assessment
*   **Custom logic:** Some fields (like `modelCombos`) have complex custom logic. The Generic Mapper must support "Custom Strategies" or overrides to handle edge cases without reverting to full manual control.
*   **Refactoring Regression:** Changing the URL mapper might break existing deep links if parameter parsing logic changes slightly. Strict regression testing is required.

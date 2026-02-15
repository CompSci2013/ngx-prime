# Errata: Domain Config Interface

**Source Files:** `textbook-pages/201-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Barrel Export Pattern Differs from Textbook
**Location:** 201-p05.md, Section "Step 201.2"
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
// src/app/framework/models/index.ts

// This barrel file exports all framework model interfaces.
// Import from '@app/framework/models' instead of individual files.

export * from './domain-config.interface';
export * from './resource-management.interface';
```

**Actual Code:**
```typescript
/**
 * Framework Models - Barrel Exports
 */
export * from './ai.models';
export * from './api-response.interface';
export * from './domain-config.interface';
export * from './error-notification.interface';
// filter-definition.interface exports FilterDefinition<T> which is re-exported
// via domain-config.interface as QueryFilterDefinition - skip to avoid duplicate
export { FilterDefinition as QueryFilterDefinition, FilterOption as QueryFilterOption } from './filter-definition.interface';
export * from './pagination.interface';
export * from './picker-config.interface';
export * from './popout.interface';
export * from './resource-management.interface';
export * from './table-config.interface';
```

The actual barrel file:
1. Includes `ai.models.ts` which is not mentioned in the textbook
2. Uses selective re-exports for `filter-definition.interface` to avoid naming collisions (exports as `QueryFilterDefinition` and `QueryFilterOption`)
3. Has more comprehensive comments about the re-export pattern

**Recommended Fix:**
Update the textbook to reflect the actual barrel export pattern, especially noting:
- The existence of `ai.models.ts`
- The naming collision avoidance pattern where `FilterDefinition` is re-exported as `QueryFilterDefinition`

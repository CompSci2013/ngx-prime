# Errata: Filter Options Service

**Source Files:** `textbook-pages/310-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: FilterOption Interface Location
**Location:** 310-p03.md, Line 13-22 / FilterOption interface
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// In filter-options.service.ts
export interface FilterOption {
  /** Option value (sent to API) */
  value: any;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
}
```

**Actual Code:**
```typescript
// src/app/framework/services/filter-options.service.ts, line 16
import { FilterOption } from '../models/filter-definition.interface';
```

The actual implementation imports `FilterOption` from `filter-definition.interface.ts`, not defines it locally.

**Actual FilterOption definition (from filter-definition.interface.ts):**
```typescript
export interface FilterOption {
  value: string | number;
  label: string;
  count?: number;
}
```

Notable differences:
- `value` type is `string | number` not `any`
- Has `count?: number` instead of `icon?: string` and `disabled?: boolean`

**Recommended Fix:**
Update textbook to import FilterOption from filter-definition.interface.ts and use the correct interface definition.

---

### Issue 2: Missing Methods in Actual Implementation
**Location:** 310-p03.md, Lines 248-319 / getCachedOptions, invalidate, preload methods
**Severity:** Outdated
**Type:** API Change

**Textbook Says (has these methods):**
- `getCachedOptions(endpoint: string): FilterOption[] | null`
- `invalidate(endpoint: string): void`
- `preload(endpoints: Array<...>): Observable<void>`

**Actual Code:**
The actual implementation in `filter-options.service.ts` is missing:
- `getCachedOptions()` method
- `invalidate()` method
- `preload()` method

**Recommended Fix:**
Either add these methods to the actual implementation or remove them from the textbook.

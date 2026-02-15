# Errata: Picker Config Interface

**Source Files:** `textbook-pages/205-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 0

## Issues

### Issue 1: Missing `getDefaultPaginationConfig` Utility Function
**Location:** 205-p03.md, Section "Step 205.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
/**
 * Create default picker pagination config
 *
 * @returns Default PickerPaginationConfig
 */
export function getDefaultPaginationConfig(): PickerPaginationConfig {
  return {
    mode: 'server',
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  };
}
```

**Actual Code:**
The `getDefaultPaginationConfig` function does not exist in `src/app/framework/models/picker-config.interface.ts`. Only `getDefaultPickerState` is present.

**Recommended Fix:**
Add the `getDefaultPaginationConfig` utility function to the actual implementation.

---

### Issue 2: Missing `getDefaultCachingConfig` Utility Function
**Location:** 205-p03.md, Section "Step 205.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
/**
 * Create default picker caching config
 *
 * @param enabled - Whether caching is enabled
 * @returns Default PickerCachingConfig
 */
export function getDefaultCachingConfig(enabled: boolean = false): PickerCachingConfig {
  return {
    enabled,
    ttl: 300000 // 5 minutes
  };
}
```

**Actual Code:**
The `getDefaultCachingConfig` function does not exist in `src/app/framework/models/picker-config.interface.ts`.

**Recommended Fix:**
Add the `getDefaultCachingConfig` utility function to the actual implementation.

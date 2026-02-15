# Errata: Table Config Interface

**Source Files:** `textbook-pages/204-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 0

## Issues

### Issue 1: Missing `getDefaultTableState` Utility Function
**Location:** 204-p03.md, Section "Step 204.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
/**
 * Create default table state
 *
 * @template T - The data model type
 * @param rows - Initial rows per page
 * @returns Default TableState
 */
export function getDefaultTableState<T>(rows: number = 20): TableState<T> {
  return {
    selection: [],
    expandedRowKeys: {},
    first: 0,
    rows,
    totalRecords: 0,
    sortField: undefined,
    sortOrder: undefined,
    filters: undefined
  };
}
```

**Actual Code:**
The `getDefaultTableState` function does not exist in `src/app/framework/models/table-config.interface.ts`. Only `getDefaultTableConfig`, `getVisibleColumns`, and `getTableBindings` are present.

**Recommended Fix:**
Add the `getDefaultTableState` utility function to the actual implementation.

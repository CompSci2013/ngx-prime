# Errata: Basic Results Table Component

**Source Files:** `textbook-pages/803-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 3
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Observable streams vs synchronous getters
**Location:** 803-p02.md, Lines 86-104
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// Observable Streams
get filters$(): Observable<TFilters> {
  return this.resourceService.filters$;
}

get results$(): Observable<TData[]> {
  return this.resourceService.results$;
}

get totalResults$(): Observable<number> {
  return this.resourceService.totalResults$;
}

get loading$(): Observable<boolean> {
  return this.resourceService.loading$;
}
```

**Actual Code:**
```typescript
// State Getters (from ResourceManagementService)
get filters(): TFilters {
  return this.resourceService.filters;
}

get results(): TData[] {
  return this.resourceService.results;
}

get totalResults(): number {
  return this.resourceService.totalResults;
}

get loading(): boolean {
  return this.resourceService.loading;
}
```

**Recommended Fix:**
Update textbook to reflect that BasicResultsTableComponent uses synchronous getters (not Observable streams) for simplicity. Note: DynamicResultsTableComponent uses Observable streams with async pipe for OnPush change detection.

---

### Issue 2: Console logging in onSort handler
**Location:** 803-p02.md, Lines 199-217
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
onSort(event: any): void {
  const sort = event.field;
  const sortDirection = event.order === 1 ? 'asc' : 'desc';

  if (this.popOutContext.isInPopOut()) {
    this.urlParamsChange.emit({ sort, sortDirection });
  } else {
    // ... update filters
  }
}
```

**Actual Code:**
```typescript
onSort(event: any): void {
  const sort = event.field;
  const sortDirection = event.order === 1 ? 'asc' : 'desc';
  const isPopOut = this.popOutContext.isInPopOut();

  console.log('[BasicResultsTable] onSort called', { sort, sortDirection, isPopOut });

  if (isPopOut) {
    console.log('[BasicResultsTable] Emitting urlParamsChange', { sort, sortDirection });
    this.urlParamsChange.emit({ sort, sortDirection });
  } else {
    console.log('[BasicResultsTable] Calling updateFilters directly');
    // ... update filters
  }
}
```

**Recommended Fix:**
The actual code includes debug console.log statements. These may be intentional for development but should be noted as development-only logging that can be removed in production.

---

### Issue 3: Environment property and getObjectKeys helper missing from textbook
**Location:** 803-p02.md
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
The textbook does not include the `environment` property.

**Actual Code:**
```typescript
readonly environment = environment;
```

And the textbook shows `getObjectKeys` helper but this is present in actual code too, so this is consistent.

**Recommended Fix:**
Add documentation about the `environment` property used for conditional test-id rendering.

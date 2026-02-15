# Errata: 403 Domain Filter and Statistics Models

**Source Files:** `textbook-pages/403-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Directory Path Discrepancy
**Location:** 403-p02.md, Line 7 / Section "Step 403.1: Create the Filter Models"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```typescript
// src/app/domains/automobile/models/automobile.filters.ts
```

**Actual Code:**
```
src/app/domain-config/automobile/models/automobile.filters.ts
```

**Recommended Fix:**
Update all path references in 403-p02.md through 403-p06.md from:
- `src/app/domains/automobile/models/`

To:
- `src/app/domain-config/automobile/models/`

---

### Issue 2: AutoSearchFilters.isEmpty() Implementation Mismatch
**Location:** 403-p03.md, Lines 219-235 / Section "AutoSearchFilters class"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
isEmpty(): boolean {
  const hasBodyClass = Array.isArray(this.bodyClass)
    ? this.bodyClass.length > 0
    : !!this.bodyClass;

  return (
    !this.manufacturer &&
    !this.model &&
    !this.yearMin &&
    !this.yearMax &&
    !hasBodyClass &&
    !this.instanceCountMin &&
    !this.instanceCountMax &&
    !this.search &&
    !this.modelCombos  // <-- Textbook includes modelCombos
  );
}
```

**Actual Code:**
```typescript
isEmpty(): boolean {
  // Handle bodyClass as potentially array
  const hasBodyClass = Array.isArray(this.bodyClass)
    ? this.bodyClass.length > 0
    : !!this.bodyClass;

  return (
    !this.manufacturer &&
    !this.model &&
    !this.yearMin &&
    !this.yearMax &&
    !hasBodyClass &&
    !this.instanceCountMin &&
    !this.instanceCountMax &&
    !this.search
    // modelCombos is NOT checked in actual implementation
  );
}
```

**Recommended Fix:**
Either:
1. Update textbook to remove `!this.modelCombos` from isEmpty() to match actual code, OR
2. Update actual code to include `!this.modelCombos` check if modelCombos should be considered a filter

Note: The textbook also shows a `getActiveFilterCount()` method that does not exist in the actual implementation. This appears to be an intentional simplification - the actual codebase may not need this method, so this is not flagged as an issue.

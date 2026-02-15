# Errata: Error Notification Interface

**Source Files:** `textbook-pages/209-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 4
- Critical (code mismatch): 4
- Minor (formatting/typo): 0
- Outdated (needs update): 0

## Issues

### Issue 1: Missing `getSummaryForCategory` Export
**Location:** 209-p02.md, Section "Step 209.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export function getSummaryForCategory(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection Error';
    // ... etc
  }
}
```

**Actual Code:**
```typescript
function getSummaryForCategory(category: ErrorCategory): string {
  // ...
}
```

The function exists but is NOT exported (missing `export` keyword). It's a private helper function.

**Recommended Fix:**
Either export the function in the implementation if it should be public API, or remove it from the textbook's export list to reflect that it's an internal helper.

---

### Issue 2: Missing `createCustomErrorNotification` Function
**Location:** 209-p02.md, Section "Step 209.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export function createCustomErrorNotification(
  summary: string,
  detail: string,
  category: ErrorCategory = ErrorCategory.APPLICATION
): ErrorNotification {
  const severity = ERROR_CATEGORY_SEVERITY_MAP[category];

  return {
    category,
    severity,
    summary,
    detail,
    timestamp: new Date().toISOString()
  };
}
```

**Actual Code:**
The `createCustomErrorNotification` function does not exist in `src/app/framework/models/error-notification.interface.ts`.

**Recommended Fix:**
Add the `createCustomErrorNotification` utility function to the actual implementation.

---

### Issue 3: Missing `CATEGORY_DISPLAY_OPTIONS` Constant
**Location:** 209-p02.md, Section "Step 209.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export const CATEGORY_DISPLAY_OPTIONS: Record<ErrorCategory, Partial<ErrorDisplayOptions>> = {
  [ErrorCategory.NETWORK]: { life: 8000 },
  [ErrorCategory.VALIDATION]: { life: 4000 },
  [ErrorCategory.AUTHORIZATION]: { sticky: true, closable: true },
  [ErrorCategory.SERVER]: { life: 6000 },
  [ErrorCategory.CLIENT]: { life: 5000 },
  [ErrorCategory.APPLICATION]: { life: 5000 },
  [ErrorCategory.UNKNOWN]: { life: 5000 }
};
```

**Actual Code:**
The `CATEGORY_DISPLAY_OPTIONS` constant does not exist in `src/app/framework/models/error-notification.interface.ts`.

**Recommended Fix:**
Add the `CATEGORY_DISPLAY_OPTIONS` constant to the actual implementation.

---

### Issue 4: Missing `mergeDisplayOptions` Utility Function
**Location:** 209-p02.md, Section "Step 209.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export function mergeDisplayOptions(
  category: ErrorCategory,
  options?: Partial<ErrorDisplayOptions>
): ErrorDisplayOptions {
  return {
    ...DEFAULT_ERROR_DISPLAY_OPTIONS,
    ...CATEGORY_DISPLAY_OPTIONS[category],
    ...options
  };
}
```

**Actual Code:**
The `mergeDisplayOptions` function does not exist in `src/app/framework/models/error-notification.interface.ts`.

**Recommended Fix:**
Add the `mergeDisplayOptions` utility function to the actual implementation.

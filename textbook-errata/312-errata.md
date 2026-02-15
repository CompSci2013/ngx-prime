# Errata: Error Notification Service

**Source Files:** `textbook-pages/312-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Missing Exported Function
**Location:** 312-p03.md, Lines 240-259 / getSummaryForCategory function
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
// Exported function in error-notification.interface.ts
export function getSummaryForCategory(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection Error';
    // ...
  }
}
```

**Actual Code:**
```typescript
// src/app/framework/models/error-notification.interface.ts, lines 293-310
// Function is NOT exported (private function)
function getSummaryForCategory(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection Error';
    // ...
  }
}
```

**Recommended Fix:**
Update textbook to show the function without the `export` keyword, as it's a private utility function.

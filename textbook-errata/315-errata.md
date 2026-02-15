# Errata: Pop-Out Token

**Source Files:** `textbook-pages/315-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Missing Factory Function and Provider
**Location:** 315-p03.md, Lines 28-69 / isPopOutFactory and IS_POPOUT_PROVIDER
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// src/app/framework/tokens/popout.token.ts
// VERSION 2 (Section 315) - Added factory function

import { InjectionToken } from '@angular/core';

export const IS_POPOUT_TOKEN = new InjectionToken<boolean>('IS_POPOUT_TOKEN');

export function isPopOutFactory(): boolean {
  return window.location.pathname.includes('/popout/');
}

export const IS_POPOUT_PROVIDER = {
  provide: IS_POPOUT_TOKEN,
  useFactory: isPopOutFactory
};
```

**Actual Code:**
```typescript
// src/app/framework/tokens/popout.token.ts
import { InjectionToken } from '@angular/core';

/**
 * Injection token to signal that the current component context is a pop-out window.
 * Used by services (like ResourceManagementService) to adjust behavior when provided
 * by a pop-out component (e.g., disabling auto-fetch).
 */
export const IS_POPOUT_TOKEN = new InjectionToken<boolean>('IS_POPOUT_TOKEN');
```

The actual implementation:
- Does NOT include `isPopOutFactory()` function
- Does NOT include `IS_POPOUT_PROVIDER` constant
- Uses a different pattern - token is provided at component level, not via factory

**Recommended Fix:**
Either update the actual implementation to include the factory function and provider, or update the textbook to reflect that the token is provided at component level without a factory.

---

### Issue 2: URL Pattern Mismatch in Factory
**Location:** 315-p03.md, Line 48 / isPopOutFactory function
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export function isPopOutFactory(): boolean {
  return window.location.pathname.includes('/popout/');
}
```

Based on other services (popout-context.service.ts, popout-manager.service.ts), the actual URL pattern used is `/panel/`, not `/popout/`.

**Recommended Fix:**
If the factory is added, use `/panel/` instead of `/popout/`:
```typescript
export function isPopOutFactory(): boolean {
  return window.location.pathname.includes('/panel/');
}
```

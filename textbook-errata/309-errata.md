# Errata: User Preferences Service

**Source Files:** `textbook-pages/309-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 4
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Default Panel Order Mismatch
**Location:** 309-p02.md, Line 49-53 / DEFAULT_PANEL_ORDER property
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
private readonly DEFAULT_PANEL_ORDER = [
  'query-control',
  'statistics-panel-2',
  'results-table'
];
```

**Actual Code:**
```typescript
// src/app/framework/services/user-preferences.service.ts, lines 54-60
private readonly DEFAULT_PANEL_ORDER = [
  'query-control',
  'query-panel',
  'manufacturer-model-picker',
  'statistics-panel-2',
  'basic-results-table'
];
```

**Recommended Fix:**
Update the textbook to reflect the actual default panel order.

---

### Issue 2: Missing Constructor Dependency
**Location:** 309-p02.md / Constructor section
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
No constructor with HttpClient dependency is shown. The textbook version does not include backend API integration.

**Actual Code:**
```typescript
// src/app/framework/services/user-preferences.service.ts, line 116
constructor(private http: HttpClient) {
  // Try loading from backend API first, fall back to localStorage
  this.loadFromBackendApi().pipe(
    timeout(5000), // 5 second timeout
    catchError(() => {
      // Fall back to localStorage
      return of(this.loadFromLocalStorage());
    })
  ).subscribe(prefs => {
    this.fullPreferences = prefs || {};
    this.initializeFromPreferences(this.fullPreferences);
  });
}
```

**Recommended Fix:**
Update textbook to include HttpClient dependency and backend API integration, or note that the implementation has been extended beyond the original textbook version.

---

### Issue 3: Missing Methods for Backend API
**Location:** 309-p02.md
**Severity:** Outdated
**Type:** API Change

**Textbook does not include:**
- `loadFromBackendApi()` method
- `savePreferencesToBackend()` method
- `loadFromLocalStorage()` method (full version)
- `initializeFromPreferences()` method

**Actual Code includes these additional methods for backend API support.**

**Recommended Fix:**
Either update textbook to include these methods or add a note that the actual implementation extends the textbook with backend API support.

---

### Issue 4: Domain Extraction Pattern Difference
**Location:** 309-p02.md, Line 374-383 / extractCurrentDomain method
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
private extractCurrentDomain(): string {
  const path = window.location.pathname;
  const match = path.match(/^\/([a-z-]+)/);

  if (match && match[1] && match[1] !== 'popout') {
    return match[1];
  }

  return 'automobile'; // Default domain
}
```

**Actual Code:**
```typescript
// src/app/framework/services/user-preferences.service.ts, lines 508-520
private extractCurrentDomain(): string {
  // Get domain from current URL path
  const path = window.location.pathname;

  // Match patterns like /automobiles/, /physics/, etc.
  const match = path.match(/\/([a-z]+)\//);
  if (match && match[1]) {
    return match[1];
  }

  // Default to 'automobiles' if extraction fails
  return 'automobiles';
}
```

- Different regex pattern: `/^\/([a-z-]+)/` vs `/\/([a-z]+)\//`
- Different default domain: 'automobile' vs 'automobiles'
- No check for 'popout' in actual code

**Recommended Fix:**
Update textbook to use the actual implementation's regex and default domain.

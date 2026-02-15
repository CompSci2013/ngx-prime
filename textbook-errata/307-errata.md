# Errata: PopOut Context Service

**Source Files:** `textbook-pages/307-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: URL Route Pattern Mismatch
**Location:** 307-p02.md, Section "Route-Based Detection"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```
/popout/:gridId/:panelId/:panelType
```

**Actual Code:**
```typescript
// src/app/framework/models/popout.interface.ts (parsePopOutRoute)
const match = url.match(/^\/panel\/([^/]+)\/([^/]+)\/([^/]+)/);
```

The actual implementation uses `/panel/` prefix, not `/popout/` prefix.

**Recommended Fix:**
Update textbook 307-p02.md to use `/panel/` prefix instead of `/popout/`:
```
/panel/:gridId/:panelId/:panelType
```

---

### Issue 2: PopOutContextService Detection Comment Mismatch
**Location:** 307-p03.md, Line 105-107 / Section "isInPopOut()"
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
/**
 * Check if current window is a pop-out
 *
 * Determined by URL pattern: /popout/:gridId/:panelId/:panelType
```

**Actual Code:**
```typescript
// src/app/framework/services/popout-context.service.ts, line 127-128
/**
 * Check if current window is a pop-out
 *
 * Detection: Checks if router.url starts with '/panel/'
```

**Recommended Fix:**
Update the JSDoc comment in the textbook to match the actual implementation pattern.

# Errata: 502 URL Mapper Adapter

**Source Files:** `textbook-pages/502-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Directory Path Discrepancy
**Location:** 502-p02.md, Line 30 / Section "Step 502.1: Create the URL Mapper"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```typescript
// src/app/domains/automobile/adapters/automobile-url-mapper.ts
```

**Actual Code:**
The URL mapper is located at:
```
src/app/domain-config/automobile/adapters/automobile-url-mapper.ts
```

**Recommended Fix:**
Update all path references in 502-p02.md through 502-p04.md from:
- `src/app/domains/automobile/adapters/`

To:
- `src/app/domain-config/automobile/adapters/`

Note: The actual code has additional helper methods (`getUrlParamName()`, `sanitizeUrlParams()`) beyond what the textbook shows. These are enhancements and do not constitute an error - the textbook shows the core required functionality, and the actual implementation includes additional convenience methods.

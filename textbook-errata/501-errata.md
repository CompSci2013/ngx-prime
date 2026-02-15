# Errata: 501 Domain Adapter Pattern

**Source Files:** `textbook-pages/501-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Directory Path Discrepancy
**Location:** 501-p03.md, Lines 7-9 / Section "Step 501.2: Create the Adapters Directory"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```bash
$ mkdir -p src/app/domains/automobile/adapters
$ touch src/app/domains/automobile/adapters/index.ts
```

And:
```typescript
// src/app/domains/automobile/adapters/index.ts
```

**Actual Code:**
The adapters directory is located at:
```
src/app/domain-config/automobile/adapters/
```

Not at:
```
src/app/domains/automobile/adapters/
```

**Recommended Fix:**
Update all path references in 501-p03.md from:
- `src/app/domains/automobile/adapters/`

To:
- `src/app/domain-config/automobile/adapters/`

Note: The adapter interface documentation in the textbook correctly matches the actual interfaces in `src/app/framework/models/resource-management.interface.ts`.

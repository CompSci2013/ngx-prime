# Errata: 401 Base Model Interface

**Source Files:** `textbook-pages/401-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Directory Path Discrepancy
**Location:** 401-p03.md, Lines 7-12 / Section "Step 401.2: Create the Domain Models Directory"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```bash
$ mkdir -p src/app/domains/automobile/models
$ touch src/app/domains/automobile/models/index.ts
```

And:
```typescript
// src/app/domains/automobile/models/index.ts
```

**Actual Code:**
The models directory is located at:
```
src/app/domain-config/automobile/models/
```

Not at:
```
src/app/domains/automobile/models/
```

**Recommended Fix:**
Update all path references in 401-p03.md and 401-p04.md from:
- `src/app/domains/automobile/models/`

To:
- `src/app/domain-config/automobile/models/`

The barrel file content matches, but the path is different. The actual codebase uses `domain-config` instead of `domains`.

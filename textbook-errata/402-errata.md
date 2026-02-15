# Errata: 402 Domain Data Models

**Source Files:** `textbook-pages/402-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Directory Path Discrepancy
**Location:** 402-p02.md, Line 7 / Section "Step 402.1: Create the Vehicle Result Model"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```typescript
// src/app/domains/automobile/models/automobile.data.ts
```

And in 402-p04.md:
```typescript
// src/app/domains/automobile/models/index.ts
```

**Actual Code:**
The models are located at:
```
src/app/domain-config/automobile/models/automobile.data.ts
src/app/domain-config/automobile/models/index.ts
```

**Recommended Fix:**
Update all path references in 402-p02.md, 402-p03.md, and 402-p04.md from:
- `src/app/domains/automobile/models/`

To:
- `src/app/domain-config/automobile/models/`

Note: The code content (VehicleResult and VinInstance classes) matches exactly between textbook and actual implementation. Only the directory path differs.

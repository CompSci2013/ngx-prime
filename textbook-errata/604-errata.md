# Errata: Query Control Filters

**Source Files:** `textbook-pages/604-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 0

## Issues

### Issue 1: Incorrect Import Path for Environment
**Location:** 604-p03.md, Line 15 / Section "Step 604.1"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```typescript
import { environment } from '../../../environments/environment';
```

**Actual Code:**
```typescript
import { environment } from '../../../../environments/environment';
```

**Recommended Fix:**
Update the import path to use four levels up (`../../../../environments/environment`) instead of three. The configs folder is at `src/app/domain-config/automobile/configs/`, which requires four directory levels to reach `src/environments/`.

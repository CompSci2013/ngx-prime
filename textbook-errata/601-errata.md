# Errata: Filter Definitions

**Source Files:** `textbook-pages/601-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 0

## Issues

### Issue 1: Incorrect Import Path for FilterDefinition
**Location:** 601-p03.md, Line 13 / Section "Step 601.1"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```typescript
import { FilterDefinition } from '../../../framework/models/filter-definition.interface';
```

**Actual Code:**
```typescript
import { FilterDefinition } from '../../../framework/models/domain-config.interface';
```

**Recommended Fix:**
Update the import path in the textbook to use `domain-config.interface` instead of `filter-definition.interface`. The `FilterDefinition` type is exported from `domain-config.interface.ts`, not from a separate `filter-definition.interface.ts` file.

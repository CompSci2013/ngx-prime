# Errata: 503 API Adapter

**Source Files:** `textbook-pages/503-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 3
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Directory Path Discrepancy
**Location:** 503-p02.md, Line 35 / Section "Step 503.1: Create the API Adapter"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```typescript
// src/app/domains/automobile/adapters/automobile-api.adapter.ts
// src/app/domains/automobile/adapters/automobile-cache-key.builder.ts
```

**Actual Code:**
The adapters are located at:
```
src/app/domain-config/automobile/adapters/automobile-api.adapter.ts
src/app/domain-config/automobile/adapters/automobile-cache-key-builder.ts
```

**Recommended Fix:**
Update all path references in 503-p02.md through 503-p06.md from:
- `src/app/domains/automobile/adapters/`

To:
- `src/app/domain-config/automobile/adapters/`

---

### Issue 2: Cache Key Builder Filename Mismatch
**Location:** 503-p04.md, Lines 1-4 / Section "Step 503.2: Create the Cache Key Builder"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```typescript
// src/app/domains/automobile/adapters/automobile-cache-key.builder.ts
```

**Actual Code:**
The filename uses hyphens throughout, not a dot:
```
src/app/domain-config/automobile/adapters/automobile-cache-key-builder.ts
```

**Recommended Fix:**
Update the filename from:
- `automobile-cache-key.builder.ts`

To:
- `automobile-cache-key-builder.ts`

Also update the barrel file export in 503-p06.md from:
```typescript
export * from './automobile-cache-key.builder';
```

To:
```typescript
export * from './automobile-cache-key-builder';
```

---

### Issue 3: Cache Key Builder Implementation Differences
**Location:** 503-p05.md, Lines 30-133 / Section "AutomobileCacheKeyBuilder class"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export class AutomobileCacheKeyBuilder
  implements ICacheKeyBuilder<AutoSearchFilters>
{
  private readonly PREFIX = 'vehicles';

  buildKey(filters: AutoSearchFilters, highlights?: any): string {
    const parts: string[] = [];
    // ... adds filter parts
    return parts.length > 0
      ? `${this.PREFIX}:${parts.join('|')}`  // Uses '|' as separator
      : this.PREFIX;
  }
}
```

**Actual Code:**
```typescript
export class AutomobileCacheKeyBuilder
  implements ICacheKeyBuilder<AutoSearchFilters>
{
  private readonly PREFIX = 'auto';  // Different prefix

  buildKey(filters: AutoSearchFilters, highlights?: any): string {
    const parts: string[] = [this.PREFIX];  // Prefix in parts array
    // ... adds filter parts
    entries.forEach(([key, value]) => {
      parts.push(`${key}=${this.serializeValue(value)}`);
    });
    return parts.join(':');  // Uses ':' as separator, not '|'
  }
}
```

Key differences:
1. **PREFIX**: Textbook uses `'vehicles'`, actual uses `'auto'`
2. **Separator**: Textbook uses `'|'`, actual uses `':'`
3. **Key format**: Textbook: `vehicles:key=val|key=val`, Actual: `auto:key=val:key=val`
4. **Implementation**: Actual code uses a `getFilterEntries()` helper and `serializeValue()` method that textbook does not show

**Recommended Fix:**
Update the textbook cache key builder to match actual implementation:
1. Change PREFIX from `'vehicles'` to `'auto'`
2. Change separator from `'|'` to `':'`
3. Optionally add the helper methods for completeness

Or update the codebase to match the textbook if the textbook pattern is preferred.

Note: The actual codebase also includes a `DefaultCacheKeyBuilder<TFilters>` generic class that is not mentioned in the textbook. This is an enhancement, not an error.

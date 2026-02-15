# Errata: Picker Config Registry

**Source Files:** `textbook-pages/311-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Missing tryGet Method
**Location:** 311-p03.md, Lines 130-132 / tryGet method
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
tryGet<T>(id: string): PickerConfig<T> | null {
  return (this.configs.get(id) as PickerConfig<T>) ?? null;
}
```

**Actual Code:**
The actual implementation in `picker-config-registry.service.ts` does not include the `tryGet()` method.

**Recommended Fix:**
Either add the `tryGet()` method to the actual implementation or remove it from the textbook.

---

### Issue 2: Missing getByCategory Method
**Location:** 311-p03.md, Lines 189-196 / getByCategory method
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
getByCategory(category: string): PickerConfig<any>[] {
  return this.getAll().filter(config => config.category === category);
}
```

**Actual Code:**
The actual implementation in `picker-config-registry.service.ts` does not include the `getByCategory()` method.

**Recommended Fix:**
Either add the `getByCategory()` method to the actual implementation (requires adding `category` property to PickerConfig interface) or remove it from the textbook.

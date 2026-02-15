# Errata: Picker Configurations

**Source Files:** `textbook-pages/603-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 3
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Incorrect Import Path for Environment
**Location:** 603-p03.md, Line 16 / Section "Step 603.1"
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

---

### Issue 2: Function Signature Mismatch - createManufacturerModelPickerConfig
**Location:** 603-p03.md, Lines 42-48 / Section "Step 603.1"
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
export function createManufacturerModelPickerConfig(
  apiService: ApiService,
  configId: string = 'manufacturer-model-picker'
): PickerConfig<ManufacturerModelRow> {
```

**Actual Code:**
```typescript
export function createManufacturerModelPickerConfig(
  apiService: ApiService
): PickerConfig<ManufacturerModelRow> {
```

**Recommended Fix:**
Remove the optional `configId` parameter from the textbook. The actual implementation does not use this parameter - the picker ID is hardcoded as `'manufacturer-model-picker'` inside the function.

---

### Issue 3: Function Signature Mismatch - createAutomobilePickerConfigs
**Location:** 603-p03.md (implied by Step 603.5 pattern)
**Severity:** Critical
**Type:** API Change

**Textbook Says:**
```typescript
export function createAutomobilePickerConfigs(
  injector: Injector,
  configIdPrefix?: string
): PickerConfig<any>[] {
```

**Actual Code:**
```typescript
export function createAutomobilePickerConfigs(injector: Injector): PickerConfig<any>[] {
```

**Recommended Fix:**
Remove the optional `configIdPrefix` parameter from the textbook. The actual implementation does not support this parameter.

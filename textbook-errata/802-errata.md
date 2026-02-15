# Errata: Base Picker Component

**Source Files:** `textbook-pages/802-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 3
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: ResourceManagementService injection pattern
**Location:** 802-p03.md, Lines 98-104
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
constructor(
  private registry: PickerConfigRegistry,
  private urlState: UrlStateService,
  private cdr: ChangeDetectorRef,
  private elementRef: ElementRef,
  private resourceService: ResourceManagementService<any, any, any>
) {}
```

**Actual Code:**
```typescript
constructor(
  private registry: PickerConfigRegistry,
  private urlState: UrlStateService,
  private cdr: ChangeDetectorRef,
  private elementRef: ElementRef,
  @Optional() private resourceService?: ResourceManagementService<any, any, any>
) {}
```

**Recommended Fix:**
Update textbook to show `@Optional()` decorator since the component can work with or without ResourceManagementService (falls back to URL watching).

---

### Issue 2: Environment property not documented
**Location:** 802-p03.md
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
The textbook does not include the `environment` property.

**Actual Code:**
```typescript
/**
 * Environment configuration for conditional test-id rendering
 */
readonly environment = environment;
```

**Recommended Fix:**
Add documentation about the `environment` property used for conditional test-id rendering in development mode.

---

### Issue 3: PickerState interface location
**Location:** 802-p02.md, Section "Step 802.1: Create the Picker State Interface"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```typescript
// src/app/framework/components/base-picker/picker-state.interface.ts
```

**Actual Code:**
The `PickerState` interface and `getDefaultPickerState` function are imported from `../../models/picker-config.interface` rather than a local `picker-state.interface.ts` file:

```typescript
import {
  getDefaultPickerState,
  PickerApiParams,
  PickerConfig,
  PickerSelectionEvent,
  PickerState
} from '../../models/picker-config.interface';
```

**Recommended Fix:**
Update textbook to reflect that `PickerState` is co-located in the `picker-config.interface.ts` model file, not a separate component-local file.

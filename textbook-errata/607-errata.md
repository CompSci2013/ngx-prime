# Errata: Domain Config Assembly

**Source Files:** `textbook-pages/607-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 5
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 3

## Issues

### Issue 1: Incorrect Import Path for Environment
**Location:** 607-p03.md, Line 14 / Section "Step 607.1"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```typescript
import { environment } from '../../environments/environment';
```

**Actual Code:**
```typescript
import { environment } from '../../../environments/environment';
```

**Recommended Fix:**
Update the import path to use three levels up (`../../../environments/environment`) instead of two. The domain config file is at `src/app/domain-config/automobile/automobile.domain-config.ts`, which requires three directory levels to reach `src/environments/`.

---

### Issue 2: Pickers Configuration Method
**Location:** 607-p03.md, Lines 31-32 and Line 87 / Section "Step 607.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
import {
  // ...
  createAutomobilePickerConfigs
} from './configs';

// ... later in the config:
pickers: createAutomobilePickerConfigs(injector),
```

**Actual Code:**
```typescript
import {
  // ...
  AUTOMOBILE_PICKER_CONFIGS
} from './configs';

// ... later in the config:
pickers: AUTOMOBILE_PICKER_CONFIGS,
```

**Recommended Fix:**
The actual code imports the static `AUTOMOBILE_PICKER_CONFIGS` constant and uses it directly, rather than calling the `createAutomobilePickerConfigs(injector)` factory function. Update the textbook to show this pattern, or update the actual code to use the factory pattern if dynamic configuration is desired.

---

### Issue 3: domainLabel Value Mismatch
**Location:** 607-p03.md, Line 72 / Section "Step 607.1"
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
domainLabel: 'Automobile Discovery',
```

**Actual Code:**
```typescript
domainLabel: 'Vvroom Discovery',
```

**Recommended Fix:**
Update the textbook to use `'Vvroom Discovery'` to match the actual project branding.

---

### Issue 4: Metadata Author Value Mismatch
**Location:** 607-p03.md, Line 117 / Section "Step 607.1"
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
author: 'Vvroom Development Team',
```

**Actual Code:**
```typescript
author: 'Generic Discovery Framework Team',
```

**Recommended Fix:**
Update the textbook to use `'Generic Discovery Framework Team'` to match the actual code.

---

### Issue 5: Metadata Dates Value Mismatch
**Location:** 607-p03.md, Lines 118-119 / Section "Step 607.1"
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
createdAt: '2026-02-09',
updatedAt: '2026-02-09'
```

**Actual Code:**
```typescript
createdAt: '2025-11-20',
updatedAt: '2025-11-20'
```

**Recommended Fix:**
Update the textbook to use the actual dates `'2025-11-20'`, or note that these dates are placeholder values that should reflect the actual creation date.

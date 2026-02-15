# Errata: PopOut Manager Service

**Source Files:** `textbook-pages/308-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: URL Route Pattern Mismatch
**Location:** 308-p03.md, Line 188-189 / openPopOut method
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// Construct URL: /popout/:gridId/:panelId/:panelType
const url = `/popout/${this.gridId}/${panelId}/${panelType}`;
```

**Actual Code:**
```typescript
// src/app/framework/services/popout-manager.service.ts, line 78-79
// URL structure: /panel/:gridId/:panelId/:type (vvroom uses /panel prefix)
const url = `/panel/${this.gridId}/${panelId}/${panelType}`;
```

**Recommended Fix:**
Update textbook 308-p03.md to use `/panel/` prefix:
```typescript
// Construct URL: /panel/:gridId/:panelId/:panelType
const url = `/panel/${this.gridId}/${panelId}/${panelType}`;
```

---

### Issue 2: Missing Import
**Location:** 308-p03.md, Line 7-14 / imports section
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import {
  buildWindowFeatures,
  PopOutMessage,
  PopOutMessageType,
  PopOutWindowFeatures,
  PopOutWindowRef
} from '../models/popout.interface';
import { PopOutContextService } from './popout-context.service';
```

**Actual Code:**
```typescript
// src/app/framework/services/popout-manager.service.ts, lines 13-24
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import {
  buildWindowFeatures,
  PopOutMessage,
  PopOutMessageType,
  PopOutWindowFeatures,
  PopOutWindowRef
} from '../models/popout.interface';
import { PopOutContextService } from './popout-context.service';
import { FilterOptionsCache } from './filter-options.service';
```

The actual implementation imports `FilterOptionsCache` from filter-options.service, which is missing from textbook.

**Recommended Fix:**
Add the missing import to the textbook:
```typescript
import { FilterOptionsCache } from './filter-options.service';
```

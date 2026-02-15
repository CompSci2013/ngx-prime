# Errata: 904 Popout Component

**Source Files:** `textbook-pages/904-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 5
- Critical (code mismatch): 3
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Component Name and Location Mismatch
**Location:** 904-p02.md, Section "Step 904.2"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```
src/app/features/popout/popout.component.ts
selector: 'app-popout'
class: PopoutComponent
URL: /popout/:gridId/:componentId/:type
```

**Actual Code:**
```
src/app/features/panel-popout/panel-popout.component.ts
selector: 'app-panel-popout'
class: PanelPopoutComponent
URL: /panel/:gridId/:panelId/:type
```

**Recommended Fix:**
Update textbook to reflect:
1. Component is named `PanelPopoutComponent`
2. Located in `features/panel-popout/` directory
3. Route uses `/panel/` prefix (not `/popout/`)
4. Parameter is `panelId` (not `componentId`)

---

### Issue 2: Route Path Prefix Mismatch
**Location:** 904-p03.md, 904-p05.md
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// URL structure: /popout/:gridId/:componentId/:type
const url = `/popout/${gridId}/${panelId}/${panelType}`;
```

**Actual Code:**
```typescript
// URL structure: /panel/:gridId/:panelId/:type
const url = `/panel/${this.gridId}/${panelId}/${panelType}`;
```

**Recommended Fix:**
Update all references from `/popout/` to `/panel/` throughout the textbook.

---

### Issue 3: IS_POPOUT_TOKEN Usage
**Location:** 904-p03.md, Component providers
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
@Component({
  providers: [
    ResourceManagementService,
    { provide: IS_POPOUT_TOKEN, useValue: true }
  ]
})
```

**Actual Code:**
The `IS_POPOUT_TOKEN` exists in `src/app/framework/tokens/popout.token.ts` but the actual PanelPopoutComponent implementation differs. The component file `src/app/features/popout/popout.component.ts` exists but is a minimal stub.

**Recommended Fix:**
Review actual `PanelPopoutComponent` implementation and update textbook to match.

---

### Issue 4: Lazy Loading Routes Not Used
**Location:** 904-p05.md, Section "Step 904.5" / popout.routes.ts
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export const POPOUT_ROUTES: Routes = [
  {
    path: 'query-control',
    loadChildren: () => import('../../../framework/components/query-control/query-control.module')
      .then(m => m.QueryControlModule)
  },
  // ... more lazy loaded routes
];
```

**Actual Code:**
The actual routing in `app-routing.module.ts` uses a direct component reference:
```typescript
{ path: 'panel/:gridId/:panelId/:type', component: PanelPopoutComponent }
```

No lazy-loaded child routes - the PanelPopoutComponent handles dynamic component rendering internally.

**Recommended Fix:**
Update textbook to reflect that:
1. No separate popout.routes.ts file exists
2. PanelPopoutComponent handles all panel types dynamically
3. Child route lazy loading is not used

---

### Issue 5: PopoutModule Does Not Exist
**Location:** 904-p05.md, Section "Step 904.6"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```
src/app/features/popout/popout.module.ts
src/app/features/popout/popout.routes.ts
src/app/features/popout/index.ts
```

**Actual Code:**
Only `src/app/features/popout/popout.component.ts` exists as a stub file. The actual panel-popout component is at `src/app/features/panel-popout/panel-popout.component.ts` and is declared directly in `AppModule`.

**Recommended Fix:**
Update textbook to show the actual file structure without separate modules.

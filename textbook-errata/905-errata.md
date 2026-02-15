# Errata: 905 App Routing Module

**Source Files:** `textbook-pages/905-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 5
- Critical (code mismatch): 3
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Route Structure Mismatch
**Location:** 905-p01.md, Section "Step 905.1" / routes array
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule) },
  { path: 'automobiles', loadChildren: () => import('./features/automobile/automobile.module').then(m => m.AutomobileModule) },
  { path: 'popout/:gridId/:componentId', children: POPOUT_ROUTES },
  { path: '**', redirectTo: 'home' }
];
```

**Actual Code:**
```typescript
const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'discover', component: DiscoverComponent },
  { path: 'panel/:gridId/:panelId/:type', component: PanelPopoutComponent },
  { path: '**', redirectTo: 'home' }
];
```

**Recommended Fix:**
Update textbook to reflect:
1. No lazy loading - direct component references
2. No `/automobiles` route - use `/discover` instead
3. Panel route uses `/panel/` prefix with `PanelPopoutComponent`
4. No separate `POPOUT_ROUTES` or child routes

---

### Issue 2: Lazy Loading Not Implemented
**Location:** 905-p01.md, 905-p02.md, 905-p03.md
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule)
```

**Actual Code:**
All feature components are eagerly loaded via direct component references:
```typescript
import { HomeComponent } from './features/home/home.component';
{ path: 'home', component: HomeComponent }
```

**Recommended Fix:**
Either:
1. Update textbook to show eager loading pattern (current implementation)
2. Or implement lazy loading in codebase (create feature modules)

---

### Issue 3: No Feature Modules Exist
**Location:** 905-p03.md, Section "Step 905.2"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
Files to create/update:
- `src/app/features/home/home.module.ts`
- `src/app/features/automobile/automobile.module.ts`

**Actual Code:**
No feature modules exist. All components are declared in `AppModule`:
```typescript
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DiscoverComponent,
    PopoutComponent,
    PanelPopoutComponent,
    AutomobileComponent
  ],
  // ...
})
export class AppModule {}
```

**Recommended Fix:**
Update textbook to reflect the non-modular structure or create the feature modules in the codebase.

---

### Issue 4: RouterModule.forRoot Options
**Location:** 905-p06.md, Section "Step 905.5"
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
RouterModule.forRoot(routes, {
  anchorScrolling: 'enabled',
  scrollPositionRestoration: 'enabled',
  paramsInheritanceStrategy: 'always'
})
```

**Actual Code:**
```typescript
RouterModule.forRoot(routes)
// No options configured
```

**Recommended Fix:**
Either:
1. Update textbook to remove router options
2. Or add the recommended options to the actual code for better URL-First support

---

### Issue 5: Pop-out Route Parameter Name
**Location:** 905-p04.md, Section "Step 905.3"
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```
/popout/:gridId/:componentId/:type
```

**Actual Code:**
```
/panel/:gridId/:panelId/:type
```

**Recommended Fix:**
Update textbook to use:
1. `/panel/` prefix instead of `/popout/`
2. `:panelId` parameter instead of `:componentId`

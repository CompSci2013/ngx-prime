# Errata: 903 Discover Page Component

**Source Files:** `textbook-pages/903-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 6
- Critical (code mismatch): 4
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Component Name and Location Mismatch
**Location:** 903-p02.md, Section "Step 903.2"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```
src/app/features/automobile/automobile-discover/automobile-discover.component.ts
selector: 'app-automobile-discover'
class: AutomobileDiscoverComponent
```

**Actual Code:**
```
src/app/features/discover/discover.component.ts
selector: 'app-discover'
class: DiscoverComponent
```

**Recommended Fix:**
Update textbook to reflect that:
1. The Discover component is domain-agnostic, located in `features/discover/`
2. Component is named `DiscoverComponent` (not `AutomobileDiscoverComponent`)
3. It is a generic component that works with any domain via `DOMAIN_CONFIG` injection

---

### Issue 2: Provider Configuration Mismatch
**Location:** 903-p03.md, Component decorator
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
@Component({
  providers: [ResourceManagementService, PopOutManagerService]
})
export class AutomobileDiscoverComponent
```

**Actual Code:**
```typescript
@Component({
  providers: [ResourceManagementService]
  // Note: No PopOutManagerService - pop-out management is built into component
})
export class DiscoverComponent<TFilters = any, TData = any, TStatistics = any>
```

**Recommended Fix:**
1. Update to show generic type parameters on the component
2. Remove PopOutManagerService from providers (functionality is integrated differently)

---

### Issue 3: PopOutManagerService Does Not Exist
**Location:** 903-p03.md, Section "Step 903.2"
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```typescript
import { PopOutManagerService } from '../../../../framework/services/popout-manager.service';
// ... uses this.popOutManager throughout
```

**Actual Code:**
There is no `PopOutManagerService`. Pop-out functionality is implemented directly in `DiscoverComponent` using:
- `PopOutContextService` for BroadcastChannel communication
- Direct `window.open()` calls
- Internal `popoutWindows` Map for window tracking

**Recommended Fix:**
Update textbook to show the actual pop-out implementation pattern used in DiscoverComponent, which handles pop-outs internally rather than delegating to a service.

---

### Issue 4: Panel Configuration Differences
**Location:** 903-p03.md, panelOrder array
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
panelOrder: string[] = [
  'query-control',
  'statistics-1',
  'chart-body-class',
  'chart-year',
  'manufacturer-model-picker',
  'results-table'
];
```

**Actual Code:**
```typescript
panelOrder: string[] = [
  'query-control',
  'query-panel',
  'manufacturer-model-picker',
  'statistics-panel-2',
  'basic-results-table'
];
```

**Recommended Fix:**
Update textbook to match actual panel IDs and order.

---

### Issue 5: Missing FilterOptionsService Integration
**Location:** 903-p03.md, Constructor
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
constructor(
  @Inject(DOMAIN_CONFIG) domainConfig: DomainConfig<any, any, any>,
  public resourceService: ResourceManagementService<any, any, any>,
  private pickerRegistry: PickerConfigRegistry,
  private injector: Injector,
  private popOutManager: PopOutManagerService,
  private cdr: ChangeDetectorRef,
  private urlStateService: UrlStateService,
  private userPreferences: UserPreferencesService,
  private filterOptionsService: FilterOptionsService
)
```

**Actual Code:**
The actual code does not use `FilterOptionsService` (as textbook suggests) - filter options are handled differently. Also includes additional services like `MessageService`, `NgZone`.

**Recommended Fix:**
Update constructor dependencies to match actual implementation.

---

### Issue 6: Template Template Reference Differences
**Location:** 903-p05.md, Template
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
- Uses plain HTML/Unicode characters for icons (e.g., `>` for expand, `>` for popout)
- Uses `*ngIf...else` with `ng-template` references

**Actual Code:**
- Uses PrimeNG icons (`pi pi-chevron-right`, `pi pi-external-link`)
- Uses PrimeNG button components with tooltips
- Has CDK drag-drop with `cdkDrag`, `cdkDragHandle`, `cdkDropList`

**Recommended Fix:**
Update textbook template to use PrimeNG components and CDK directives as implemented in actual code.

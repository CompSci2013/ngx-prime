# Errata: Statistics Panel 2 Component

**Source Files:** `textbook-pages/808-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 4
- Critical (code mismatch): 3
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Import structure differs significantly
**Location:** 808-p03.md, Lines 1-30
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { DomainConfig } from '../../models/domain-config.interface';
import { PopOutMessageType } from '../../models/popout.interface';
import { PopOutContextService } from '../../services/popout-context.service';
import { ResourceManagementService } from '../../services/resource-management.service';
import { UrlStateService } from '../../services/url-state.service';
import { DomainConfigRegistry } from '../../services/domain-config-registry.service';
import { ChartDataSource } from '../base-chart/chart-data.interface';
import { IS_POPOUT_TOKEN } from '../../tokens/popout.token';
```

**Actual Code:**
```typescript
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ChartConfig, DomainConfig } from '../../models/domain-config.interface';
import { PopOutMessageType } from '../../models/popout.interface';
import { PopOutContextService } from '../../services/popout-context.service';
import { ResourceManagementService } from '../../services/resource-management.service';
import { UrlStateService } from '../../services/url-state.service';
import { ChartDataSource, BaseChartComponent } from '../base-chart/base-chart.component';
```

**Recommended Fix:**
Update textbook to reflect:
1. No `@Inject`, `@Optional`, or `ActivatedRoute` imports needed
2. `ChartDataSource` is imported from `base-chart.component.ts`, not `chart-data.interface.ts`
3. No `Observable` import needed
4. `environment` import added
5. No `DomainConfigRegistry` or `IS_POPOUT_TOKEN` imports

---

### Issue 2: Constructor injection differs
**Location:** 808-p03.md, Lines 104-112
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
constructor(
  private readonly resourceService: ResourceManagementService<any, any, any>,
  private readonly urlState: UrlStateService,
  private readonly popOutContext: PopOutContextService,
  private readonly cdr: ChangeDetectorRef,
  private readonly domainRegistry: DomainConfigRegistry,
  @Optional() private readonly route: ActivatedRoute,
  @Optional() @Inject(IS_POPOUT_TOKEN) private readonly isPopout: boolean
) {}
```

**Actual Code:**
```typescript
constructor(
  private resourceService: ResourceManagementService<any, any, any>,
  private urlState: UrlStateService,
  private popOutContext: PopOutContextService,
  private cdr: ChangeDetectorRef
) {}
```

**Recommended Fix:**
Update textbook to remove the complex injection patterns (`DomainConfigRegistry`, `ActivatedRoute`, `IS_POPOUT_TOKEN`) that are not used in the actual implementation.

---

### Issue 3: Observable streams vs synchronous getters
**Location:** 808-p03.md, Lines 115-124
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
get statistics$(): Observable<any | undefined> {
  return this.resourceService.statistics$;
}

get highlights$(): Observable<any> {
  return this.resourceService.highlights$;
}
```

**Actual Code:**
```typescript
get statistics(): any | undefined {
  return this.resourceService.statistics;
}

get highlights(): any {
  return this.resourceService.highlights;
}
```

**Recommended Fix:**
Update textbook to show synchronous getters instead of Observable streams.

---

### Issue 4: chartIds input and ngOnInit logic
**Location:** 808-p03.md, Lines 67-70 and 137-153
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
@Input() chartIds?: string[];

ngOnInit(): void {
  // If domainConfig not provided via @Input (e.g., in popout), get from registry
  if (!this.domainConfig) {
    this.domainConfig = this.domainRegistry.getActive();
  }

  // Initialize chart order from chartIds input or domain config
  if (this.chartIds && this.chartIds.length > 0) {
    this.chartOrder = this.chartIds;
  } else if (this.isPopout && this.route) {
    // In popout: extract componentId from URL and map to chart IDs
    const componentId = this.route.parent?.snapshot.paramMap.get('componentId') ?? null;
    this.chartOrder = this.getChartIdsForStatisticsPanel(componentId);
  } else if (this.domainConfig.chartDataSources) {
    this.chartOrder = Object.keys(this.domainConfig.chartDataSources);
  }
}
```

**Actual Code:**
```typescript
// No chartIds input

ngOnInit(): void {
  if (!this.domainConfig) {
    console.error('StatisticsPanel2Component: domainConfig is required');
    return;
  }

  // Initialize chart order from domain config
  if (this.domainConfig.chartDataSources) {
    this.chartOrder = Object.keys(this.domainConfig.chartDataSources);
  }

  // Subscribe to statistics changes to trigger change detection
  this.resourceService.statistics$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.cdr.markForCheck();
    });
}
```

**Recommended Fix:**
Update textbook to show the simpler initialization that doesn't support pop-out panel ID mapping directly in the component. The actual implementation relies on the parent component to provide appropriate configuration.

# Errata: Base Chart Component

**Source Files:** `textbook-pages/801-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 3
- Critical (code mismatch): 2
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: ChartDataSource and ChartData interfaces location
**Location:** 801-p02.md, Section "Step 801.2: Create the Chart Data Interface"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// src/app/framework/components/base-chart/chart-data.interface.ts
// VERSION 1 (Section 801) - Chart data structures

export interface ChartData { ... }
export abstract class ChartDataSource<TStatistics = any> { ... }
```

**Actual Code:**
The interfaces are defined inline in `base-chart.component.ts` rather than in a separate `chart-data.interface.ts` file. The `ChartData` interface and `ChartDataSource` abstract class are exported directly from the component file.

```typescript
// src/app/framework/components/base-chart/base-chart.component.ts
export interface ChartData { ... }
export abstract class ChartDataSource<TStatistics = any> { ... }
```

**Recommended Fix:**
Update textbook to reflect that interfaces are co-located in the component file, or note this as an intentional simplification for teaching purposes.

---

### Issue 2: onWindowResize implementation enhanced
**Location:** 801-p04.md, Lines 180-185
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
```typescript
@HostListener('window:resize')
onWindowResize(): void {
  if (this.plotlyElement) {
    Plotly.Plots.resize(this.plotlyElement);
  }
}
```

**Actual Code:**
```typescript
@HostListener('window:resize')
onWindowResize(): void {
  if (this.plotlyElement) {
    Plotly.Plots.resize(this.plotlyElement);

    // Extra resize with delay for pop-out windows
    setTimeout(() => {
      if (this.plotlyElement) {
        Plotly.Plots.resize(this.plotlyElement);
      }
    }, 100);
  }
}
```

**Recommended Fix:**
Update textbook to include the delayed double-resize pattern for pop-out window support.

---

### Issue 3: Pop-out button in mode bar configuration
**Location:** 801-p04.md, Lines 269-275
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
const config: Partial<any> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  scrollZoom: false,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d']
};
```

**Actual Code:**
```typescript
const config: Partial<any> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  scrollZoom: false,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d'],
  modeBarButtonsToAdd: this.canPopOut ? [{
    name: 'popout',
    title: 'Pop out to separate window',
    icon: {
      width: 1024,
      height: 1024,
      path: 'M896 0H640c-35.3 0-64 28.7-64 64s28.7 64 64 64h146.7L544 370.7c-25 25-25 65.5 0 90.5s65.5 25 90.5 0L877.3 218.3V384c0 35.3 28.7 64 64 64s64-28.7 64-64V128c0-70.7-57.3-128-128-128zM128 128c-70.7 0-128 57.3-128 128v640c0 70.7 57.3 128 128 128h640c70.7 0 128-57.3 128-128V640c0-35.3-28.7-64-64-64s-64 28.7-64 64v256H128V256h256c35.3 0 64-28.7 64-64s-28.7-64-64-64H128z',
      transform: 'matrix(1 0 0 -1 0 1024)'
    },
    click: () => this.popOutClick.emit()
  }] : []
};
```

**Recommended Fix:**
Update textbook to include the `modeBarButtonsToAdd` configuration for the pop-out button feature.

# Errata: Statistics Panel Component

**Source Files:** `textbook-pages/804-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 1
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Component not implemented - directory is empty placeholder
**Location:** 804-p01.md through 804-p08.md
**Severity:** Outdated
**Type:** Implementation Missing

**Textbook Says:**
The textbook describes a `StatisticsPanelComponent` that should exist at:
```
src/app/framework/components/statistics-panel/statistics-panel.component.ts
```

**Actual Code:**
The directory `/home/odin/projects/vvroom/src/app/framework/components/statistics-panel/` exists but is empty. No component files are present.

The application uses `StatisticsPanel2Component` (`statistics-panel-2/`) instead, which has a different architecture (CDK mixed orientation grid with drag-drop).

**Recommended Fix:**
Either:
1. Implement the original StatisticsPanelComponent as described in textbook (simpler version)
2. Update textbook section 804 to document the StatisticsPanel2Component instead
3. Mark section 804 as deprecated/superseded by 808 (StatisticsPanel2)

**Note:** The textbook may be describing an earlier design that was replaced by StatisticsPanel2. This appears to be intentional architectural evolution rather than an oversight.

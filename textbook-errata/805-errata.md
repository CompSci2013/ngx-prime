# Errata: Query Control Component (formerly Inline Filters)

**Source Files:** `textbook-pages/805-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 1

## Issues

### Issue 1: Component renamed and significantly expanded
**Location:** 805-p01.md
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
The textbook describes an `InlineFiltersComponent` at:
```
src/app/framework/components/inline-filters/inline-filters.component.ts
```

The described functionality is:
- Display active filters as chips
- Click to edit, click to remove
- Sync with URL state

**Actual Code:**
The directory `inline-filters/` exists but is empty. Instead, there is a `QueryControlComponent` at:
```
src/app/framework/components/query-control/query-control.component.ts
```

This component provides expanded functionality:
- Filter field dropdown for selecting filterable fields
- Multiselect dialog for multi-value filters
- Range dialog for min/max filters
- Active filter chips (the original inline filters functionality)
- Active highlight chips
- Full PrimeNG Dialog integration
- Keyboard navigation and accessibility features

**Recommended Fix:**
Update textbook section 805 to document `QueryControlComponent` instead of `InlineFiltersComponent`. The query control component encompasses the original inline filters concept plus much more.

---

### Issue 2: Additional outputs and complex state management
**Location:** 805-p02.md onwards
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
Simple chip display with remove functionality.

**Actual Code:**
The `QueryControlComponent` has extensive state management:
- `@Output() urlParamsChange` - Emits filter changes
- `@Output() clearAllFilters` - Emits clear all request
- `filterFieldOptions` - Dropdown options
- `activeFilters` / `activeHighlights` - Separate tracking
- `showMultiselectDialog` / `showRangeDialog` - Dialog visibility
- Multiple bug fix implementations (BUG-001, BUG-004, BUG-006, etc.)

The component is ~970 lines of TypeScript with comprehensive documentation and bug fix comments.

**Recommended Fix:**
Significantly expand textbook section 805 to cover the full QueryControlComponent implementation, or split into multiple sections.

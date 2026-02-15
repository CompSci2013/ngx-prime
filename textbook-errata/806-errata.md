# Errata: Query Panel Component

**Source Files:** `textbook-pages/806-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Additional methods in actual implementation
**Location:** 806-p03.md, after line 318
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
The textbook shows autocomplete methods ending at `onAutocompleteFocus()`.

**Actual Code:**
The actual implementation includes additional autocomplete handling methods:

```typescript
/**
 * Handle autocomplete keyboard events
 * Allows Space key to select highlighted item (standard UX)
 */
onAutocompleteKeyUp(event: KeyboardEvent, autocomplete: any, filterId: string): void {
  if (event.key === ' ' || event.code === 'Space') {
    const highlightedOption = autocomplete.highlightOption;
    if (highlightedOption) {
      event.preventDefault();
      autocomplete.selectItem(event, highlightedOption);
      this.onFilterChange(filterId, highlightedOption);
    }
  }
}

/**
 * Handle autocomplete blur event
 * Ensures the current text value is applied as a filter even if not selected from dropdown
 */
handleAutocompleteBlur(event: any, filterId: string, autocomplete: any): void {
  const inputValue = autocomplete.inputEL.nativeElement.value;
  if (inputValue && inputValue !== this.currentFilters[filterId]) {
    this.onFilterChange(filterId, inputValue);
  }
}
```

**Recommended Fix:**
Add documentation for `onAutocompleteKeyUp()` and `handleAutocompleteBlur()` methods that handle keyboard accessibility and blur-to-apply behavior.

---

### Issue 2: Environment property for test-id rendering
**Location:** 806-p03.md
**Severity:** Outdated
**Type:** API Change

**Textbook Says:**
No `environment` property documented.

**Actual Code:**
```typescript
readonly environment = environment;
```

This property is used for conditional test-id rendering in templates (development mode only).

**Recommended Fix:**
Add documentation about the `environment` property used for conditional test-id rendering.

---

## Notes

The QueryPanelComponent implementation is largely consistent with the textbook. The actual code includes additional accessibility features (keyboard navigation, blur handling) and test-id support that enhance the component beyond the textbook's scope. These are considered enhancements rather than breaking changes.

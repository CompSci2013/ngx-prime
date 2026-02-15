# Errata: A01 Styling and Branding

**Source Files:** `textbook-pages/A01-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 2
- Critical (code mismatch): 0
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Domain Label Path
**Location:** A01-p01.md, Section "Branding Configuration" / Domain Label
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```
**File**: `src/app/domain-config/automobile/automobile.domain-config.ts`
```

**Actual Code:**
The domain configuration is in:
`src/app/domain-config/automobile/index.ts` (factory function)

The actual domain config structure may be spread across multiple files in the `domain-config/automobile/` directory with a barrel export.

**Recommended Fix:**
Update the file path reference to match actual location, or clarify that the config is composed from multiple files.

---

### Issue 2: Component Style File Paths
**Location:** A01-p02.md, Section "Component Style Files"
**Severity:** Outdated
**Type:** Path Error

**Textbook Says:**
```
| Discover | `features/discover/discover.component.scss` |
| Results Table | `framework/components/results-table/results-table.component.scss` |
```

**Actual Code:**
The discover component exists at the specified location, but the table component is named `basic-results-table`:
```
framework/components/basic-results-table/basic-results-table.component.scss
```

Also, there is a `results-table` component that is separate from `basic-results-table`.

**Recommended Fix:**
Update the table to include both:
- `basic-results-table` component (simplified table)
- `results-table` component (full-featured table)

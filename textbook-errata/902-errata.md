# Errata: 902 Automobile Landing Component

**Source Files:** `textbook-pages/902-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 4
- Critical (code mismatch): 1
- Minor (formatting/typo): 1
- Outdated (needs update): 2

## Issues

### Issue 1: RouterLink Target Mismatch
**Location:** 902-p02.md, Section "Step 902.3" / automobile.component.html
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```html
<a routerLink="/automobiles/discover" class="feature-card feature-card-primary">
  <!-- ... -->
  <span class="card-action">Start Exploring ></span>
</a>
```

**Actual Code:**
```html
<a routerLink="/automobiles/discover" class="feature-card feature-card-link">
  <!-- No card-action span -->
</a>
```

**Recommended Fix:**
1. Update CSS class from `feature-card-primary` to `feature-card-link` in textbook
2. Remove the `<span class="card-action">` element from the textbook template (not present in actual code)

---

### Issue 2: Info Card Content Differences
**Location:** 902-p02.md, Section "Step 902.3" / Info Section
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```html
<div class="info-card info-card-highlight">
  <h3>Ready to Explore?</h3>
  <p>Click "Advanced Search" above...</p>
</div>
```

**Actual Code:**
```html
<div class="info-card info-card-coming-soon">
  <h3>Coming Soon</h3>
  <p>New features and capabilities are on the way</p>
</div>
```

**Recommended Fix:**
Update the textbook to show `info-card-coming-soon` class and "Coming Soon" content instead of "Ready to Explore?" call-to-action.

---

### Issue 3: Dark Theme Styling
**Location:** 902-p03.md, Section "Step 902.4" / automobile.component.scss
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
- Light theme with white backgrounds
- `background: white` for feature cards
- Blue `#1976d2` accent color

**Actual Code:**
- Dark theme with gradient backgrounds
- `background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`
- Cyan `#64c8ff` / `#4ba3d9` accent colors
- Extensive hover animations with `::before` pseudo-elements

**Recommended Fix:**
Update the SCSS in textbook to match the dark theme implementation.

---

### Issue 4: No AutomobileModule in Actual Code
**Location:** 902-p04.md, Section "Step 902.5" / automobile.module.ts
**Severity:** Minor
**Type:** Path Error

**Textbook Says:**
```
src/app/features/automobile/automobile.module.ts
src/app/features/automobile/index.ts (barrel export)
```

**Actual Code:**
Only component files exist. `AutomobileComponent` is declared directly in `AppModule`, not in a separate feature module.

**Recommended Fix:**
Update textbook to reflect that AutomobileComponent is declared in AppModule (not lazy-loaded via separate module).

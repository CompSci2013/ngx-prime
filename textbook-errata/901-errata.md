# Errata: 901 Home Component

**Source Files:** `textbook-pages/901-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 5
- Critical (code mismatch): 3
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Application Name Mismatch
**Location:** 901-p01.md, Section "Step 901.2" / HomeComponent
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
/**
 * Home Component - Landing Page
 *
 * Serves as the main entry point for the vvroom application.
 * Provides navigation to the automobile discovery features.
 */
```

**Actual Code:**
```typescript
/**
 * Home Component - Landing Page
 *
 * Serves as the main entry point and domain selector for the Generic-Prime application.
 * This component provides navigation to various domain-specific modules including
 * Automobile, Physics, Agriculture, Chemistry, and Mathematics.
 */
```

**Recommended Fix:**
Update textbook to reflect that the application is "Generic-Prime" (multi-domain framework) rather than "vvroom" (automobile-only). Alternatively, update the codebase comments to use "vvroom" branding consistently.

---

### Issue 2: Home Template Content Mismatch
**Location:** 901-p02.md, Section "Step 901.3" / home.component.html
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```html
<div class="home-container">
  <div class="header">
    <h1>Vvroom</h1>
    <p class="subtitle">Automobile Discovery Platform</p>
  </div>
  <div class="domains-section">
    <h2>Explore Data</h2>
    <div class="domain-grid">
      <a routerLink="/automobiles" class="domain-card">
        <!-- Single automobile domain card -->
      </a>
    </div>
  </div>
  <!-- Quick start section with 3 steps -->
</div>
```

**Actual Code:**
```html
<div class="home-container">
  <div class="header">
    <h1>Generic Prime Discovery Framework</h1>
    <p class="subtitle">Explore data across multiple domains</p>
  </div>
  <div class="domains-section">
    <div class="domain-grid">
      <a routerLink="/discover" class="domain-card"><!-- Automobiles --></a>
      <a class="domain-card disabled"><!-- Agriculture --></a>
      <a class="domain-card disabled"><!-- Physics --></a>
      <a class="domain-card disabled"><!-- Chemistry --></a>
      <a class="domain-card disabled"><!-- Mathematics --></a>
    </div>
  </div>
</div>
```

**Recommended Fix:**
1. Update textbook to show the multi-domain home page structure
2. Change routerLink from `/automobiles` to `/discover`
3. Remove "Quick Start" section from textbook (not present in actual code)
4. Add disabled domain cards for future expansion

---

### Issue 3: Styles Use Dark Theme
**Location:** 901-p03.md, Section "Step 901.4" / home.component.scss
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
- Light background with white cards
- Blue accent color `#1976d2`
- `max-width: 1200px` centered container

**Actual Code:**
- Dark gradient background: `linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`
- Cyan/blue accent: `#64c8ff` / `#4ba3d9`
- Full viewport height design with animations

**Recommended Fix:**
Update the SCSS examples to match the dark theme implementation. The actual code uses a sophisticated dark theme with animations that differs significantly from the light theme in the textbook.

---

### Issue 4: No HomeModule in Actual Code
**Location:** 901-p04.md, Section "Step 901.5" / home.module.ts
**Severity:** Critical
**Type:** Path Error

**Textbook Says:**
```
src/app/features/home/home.module.ts
src/app/features/home/index.ts (barrel export)
```

**Actual Code:**
Only `src/app/features/home/home.component.ts` exists. The component is declared directly in `AppModule`, not in a separate `HomeModule`.

**Recommended Fix:**
Either:
1. Update textbook to reflect that HomeComponent is declared in AppModule (no separate module)
2. Or create HomeModule in the codebase for lazy loading as described

---

### Issue 5: Router Link Target Mismatch
**Location:** 901-p02.md, Template
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```html
<a routerLink="/automobiles" class="domain-card">
```

**Actual Code:**
```html
<a routerLink="/discover" class="domain-card">
```

**Recommended Fix:**
Update textbook to use `/discover` route. The actual routing goes directly to the discover page, not through an automobile landing page.

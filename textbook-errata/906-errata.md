# Errata: 906 App Module

**Source Files:** `textbook-pages/906-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 3
- Critical (code mismatch): 1
- Minor (formatting/typo): 0
- Outdated (needs update): 2

## Issues

### Issue 1: Additional Module Imports
**Location:** 906-p02.md, Section "Step 906.1" / imports array
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
imports: [
  BrowserModule,
  BrowserAnimationsModule,
  HttpClientModule,
  AppRoutingModule
]
```

**Actual Code:**
```typescript
imports: [
  BrowserModule,
  BrowserAnimationsModule,
  HttpClientModule,
  FormsModule,            // Not in textbook
  DragDropModule,         // Not in textbook
  AppRoutingModule,
  PrimengModule,          // Not in textbook
  FrameworkModule         // Not in textbook
]
```

**Recommended Fix:**
Update textbook to include:
1. `FormsModule` - required for ngModel binding
2. `DragDropModule` - CDK drag-drop for panel reordering
3. `PrimengModule` - UI component library
4. `FrameworkModule` - Core framework components

---

### Issue 2: Feature Components in Declarations
**Location:** 906-p02.md, Section "Step 906.1" / declarations array
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
declarations: [
  AppComponent
]
```

**Actual Code:**
```typescript
declarations: [
  AppComponent,
  HomeComponent,
  DiscoverComponent,
  PopoutComponent,
  PanelPopoutComponent,
  AutomobileComponent
]
```

**Recommended Fix:**
Update textbook to show all feature components in declarations (since no feature modules are used for lazy loading).

---

### Issue 3: Additional Providers
**Location:** 906-p02.md, Section "Step 906.1" / providers array
**Severity:** Outdated
**Type:** Code Mismatch

**Textbook Says:**
```typescript
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
  { provide: ErrorHandler, useClass: GlobalErrorHandler },
  { provide: DOMAIN_CONFIG, useFactory: createAutomobileDomainConfig, deps: [Injector] }
]
```

**Actual Code:**
```typescript
providers: [
  MessageService,  // PrimeNG message service - not in textbook
  { provide: ErrorHandler, useClass: GlobalErrorHandler },
  { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
  { provide: DOMAIN_CONFIG, useFactory: createAutomobileDomainConfig, deps: [Injector] }
]
```

**Recommended Fix:**
Add `MessageService` from PrimeNG to the providers list in textbook.

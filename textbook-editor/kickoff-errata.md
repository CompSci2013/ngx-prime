# Textbook Errata Validation - Kickoff Prompt

## Goal

Validate all markdown files in `~/projects/vvroom/textbook-pages/` against the actual application codebase. Cross-validate each page for:
1. **Code consistency** - Do code examples match the actual implementation?
2. **API consistency** - Do API contracts match the actual endpoints?
3. **Internal consistency** - Do references to other pages remain accurate?
4. **File path accuracy** - Do referenced file paths exist?

For each page with discrepancies, create a `<page-name>-errata.md` file documenting the issues found.

## Input

### Textbook Source
Directory: `~/projects/vvroom/textbook-pages/`
- Contains 445 markdown files (`.md`)
- Files are numbered with 3-digit prefixes (e.g., `000-`, `051-`, `101-`)
- Each file describes implementation of a specific component/service/concept

### Application Codebase
Directory: `~/projects/vvroom/src/`
- Angular application with the actual implemented code
- Services in `src/app/framework/services/`
- Components in `src/app/framework/components/`
- Domain config in `src/app/domain-config/`
- Models in `src/app/framework/models/`

## Output

Destination directory: `~/projects/vvroom/textbook-errata/`
- Errata files use naming convention: `{original-prefix}-errata.md`
- Example: `653-p01.md`, `653-p02.md`, etc. → `653-errata.md`
- Only create errata files for pages with actual discrepancies
- Pages that pass validation get no errata file (clean)

## Validation Checks

### 1. Code Block Validation
For each code block in the textbook:
- **File path check**: Does the referenced file exist?
- **Content check**: Does the code match the actual file content?
- **Import check**: Are imports accurate?
- **Export check**: Are exported symbols correct?

### 2. API Contract Validation
For API-related pages:
- **Endpoint paths**: Do URLs match the actual API?
- **Request/response schemas**: Do types match?
- **Parameter names**: Are query/path params accurate?

### 3. Cross-Reference Validation
For references to other textbook pages:
- **Page exists**: Does the referenced page exist?
- **Section exists**: Does the referenced section exist?
- **Terminology consistent**: Are terms used consistently?

### 4. File Path Validation
For all file paths mentioned:
- **Path exists**: Does `src/app/...` path exist?
- **Relative paths**: Are relative imports correct?
- **Component selectors**: Do `app-*` selectors match?

## Errata File Format

```markdown
# Errata: {Page Title}

**Source File:** `textbook-pages/{filename}.md`
**Validation Date:** YYYY-MM-DD

## Summary

- Total issues found: N
- Critical (code mismatch): N
- Minor (formatting/typo): N
- Outdated (needs update): N

## Issues

### Issue 1: {Brief Description}

**Location:** Line N / Section "X"
**Severity:** Critical | Minor | Outdated
**Type:** Code Mismatch | Path Error | API Change | Cross-Reference

**Textbook Says:**
```typescript
// code from textbook
```

**Actual Code:**
```typescript
// code from codebase
```

**Recommended Fix:**
{Description of how to fix the textbook}

---

### Issue 2: ...
```

## Processing Order

Process files in numerical order by their prefix, grouping by category:

### Foundation (000-299)
1. `000-p*` - Book conventions (Meta/style conventions)
2. `051-p*` - API contract overview
3. `052-p*` - Automobile endpoints
4. `053-p*` through `299-p*` - Core setup and interfaces

### Services (300-399)
5. `301-p*` - URL state service
6. `302-p*` through `315-p*` - Other services
7. etc.

### Models & Adapters (400-599)
8. `401-p*` through `503-p*` - Models and adapters

### Domain Config & Components (600-899)
9. `601-p*` through `809-p*` - Domain configuration and UI

### Pages & Integration (900+)
10. `901-p*` through `954-p*` - Page components and references
11. `A01-p*`, `A02-p*` - Appendices

## Workflow

1. Create output directory `textbook-errata/` if it doesn't exist
2. For each source file in order:
   a. Read the textbook page content
   b. Extract all code blocks, file paths, and references
   c. Validate each against the actual codebase
   d. If discrepancies found:
      - Create `{prefix}-errata.md` with detailed issues
      - Report: `{filename}: {N} issues found`
   e. If no discrepancies:
      - Report: `{filename}: CLEAN`
3. Generate summary report:
   - Total pages validated
   - Pages with errors
   - Pages clean
   - Total issues by severity
4. Commit errata files and push to github, gitlab

## Success Criteria

- All 445 source files validated
- Errata files created only for pages with actual issues
- Each issue includes:
  - Exact location in textbook
  - What the textbook says
  - What the code actually does
  - Recommended fix
- No false positives (intentional simplifications noted, not flagged)
- Summary report generated

## Notes

### Intentional Simplifications
Some textbook pages may intentionally simplify code for teaching purposes. These should NOT be flagged as errors if:
- The simplification is noted in the text
- The concept is correct even if details differ
- The example is illustrative rather than literal

### Version Drift
The codebase may have evolved since the textbook was written. Errata should note:
- When code has been refactored but concept remains valid
- When new features have been added not covered in textbook
- When deprecated patterns have been replaced

# Textbook Errata Validation Summary

**Validation Date:** 2026-02-14

## Overview

| Metric | Count |
|--------|-------|
| Total prefixes | 74 |
| Prefixes with errata | 42 |
| Prefixes clean | 32 |
| Total issues found | 113 |

## Clean Prefixes (No Issues Found)

The following 32 prefixes passed validation with no discrepancies:

### Foundation (000-299)
- `000` - Book conventions
- `051` - API contract overview
- `052` - Automobile endpoints
- `053` - Naming conventions
- `101` - Project cleanup
- `102` - App shell
- `103` - Routing
- `104` - Environment config
- `150` - TypeScript generics primer
- `202` - Resource management interface
- `250` - RxJS patterns primer

### Services (300-399)
- `301` - URL state service
- `302` - API service
- `303` - Request coordinator
- `304` - Domain config registry
- `305` - Domain config validator
- `306` - Resource management service
- `313` - HTTP error interceptor
- `314` - Global error handler

### Domain Config (600-699)
- `602` - Table config
- `606` - Chart configs
- `608` - Domain providers
- `651` - Manufacturer chart source
- `652` - Year chart source
- `653` - Body class chart source
- `654` - Top models chart source

### Reference & Appendices (900+)
- `907` - Final integration
- `951` - RxJS operator reference
- `952` - TypeScript generics reference
- `953` - Debugging guide
- `954` - Glossary
- `A02` - URL-first testing rubric

## Prefixes with Errata

### Foundation (000-299) - 8 prefixes with issues

| Prefix | Issues | Critical | Minor | Outdated |
|--------|--------|----------|-------|----------|
| 201 | 1 | 1 | 1 | 2 |
| 203 | 4 | 5 | 1 | 1 |
| 204 | 1 | 2 | 1 | 1 |
| 205 | 2 | 3 | 1 | 1 |
| 206 | 5 | 6 | 1 | 1 |
| 207 | 8 | 9 | 1 | 1 |
| 208 | 5 | 6 | 1 | 1 |
| 209 | 4 | 5 | 1 | 1 |

### Services (300-399) - 7 prefixes with issues

| Prefix | Issues | Critical | Minor | Outdated |
|--------|--------|----------|-------|----------|
| 307 | 2 | 2 | 1 | 2 |
| 308 | 2 | 2 | 1 | 2 |
| 309 | 4 | 3 | 1 | 3 |
| 310 | 2 | 2 | 1 | 2 |
| 311 | 2 | 1 | 1 | 3 |
| 312 | 1 | 1 | 1 | 2 |
| 315 | 2 | 2 | 1 | 2 |

### Models & Adapters (400-599) - 6 prefixes with issues

| Prefix | Issues | Critical | Minor | Outdated |
|--------|--------|----------|-------|----------|
| 401 | 1 | 1 | 1 | 2 |
| 402 | 1 | 1 | 1 | 2 |
| 403 | 2 | 2 | 1 | 2 |
| 501 | 1 | 1 | 1 | 2 |
| 502 | 1 | 1 | 1 | 2 |
| 503 | 3 | 3 | 1 | 2 |

### Domain Config (600-699) - 5 prefixes with issues

| Prefix | Issues | Critical | Minor | Outdated |
|--------|--------|----------|-------|----------|
| 601 | 1 | 2 | 1 | 1 |
| 603 | 3 | 3 | 1 | 2 |
| 604 | 1 | 2 | 1 | 1 |
| 605 | 1 | 2 | 1 | 1 |
| 607 | 5 | 3 | 1 | 4 |

### Components (800-899) - 9 prefixes with issues

| Prefix | Issues | Critical | Minor | Outdated |
|--------|--------|----------|-------|----------|
| 801 | 3 | 3 | 1 | 2 |
| 802 | 3 | 2 | 1 | 3 |
| 803 | 3 | 3 | 1 | 2 |
| 804 | 1 | 1 | 1 | 2 |
| 805 | 2 | 2 | 1 | 2 |
| 806 | 2 | 1 | 1 | 3 |
| 807 | 1 | 1 | 1 | 2 |
| 808 | 4 | 4 | 1 | 2 |
| 809 | 1 | 1 | 1 | 2 |

### Pages & Integration (900+) - 7 prefixes with issues

| Prefix | Issues | Critical | Minor | Outdated |
|--------|--------|----------|-------|----------|
| 901 | 5 | 4 | 1 | 3 |
| 902 | 4 | 2 | 2 | 3 |
| 903 | 6 | 5 | 1 | 3 |
| 904 | 5 | 4 | 1 | 3 |
| 905 | 5 | 4 | 1 | 3 |
| 906 | 3 | 2 | 1 | 3 |
| A01 | 2 | 1 | 1 | 3 |

## Issue Categories

### By Severity
- **Critical (code mismatch):** Most issues - code blocks don't match actual implementation
- **Minor (formatting/typo):** Occasional formatting or terminology inconsistencies
- **Outdated (needs update):** Code has evolved, textbook needs refresh

### Common Issue Types
1. **Code Mismatch** - Method signatures, property names, or implementations differ
2. **Path Error** - File paths reference incorrect locations
3. **API Change** - Endpoint URLs or schemas have changed
4. **Cross-Reference** - References to other pages need updating

## Next Steps

1. Run `kickoff-revision.md` to apply corrections to all pages with errata
2. Review revised pages in `textbook-revised/`
3. Merge corrections back to main textbook

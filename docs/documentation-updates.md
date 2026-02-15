# Documentation Updates

**Date:** 2026-02-14

## Summary

Updated 4 documentation files to match the actual codebase. All 21 discrepancies identified in the audit have been corrected.

---

## Changes by Document

### ARCHITECTURE-OVERVIEW.md

| Issue | Before | After |
|-------|--------|-------|
| Angular version | 21 | 19 |
| Directory structure prefix | `frontend/src/` | `src/app/` |
| DOMAIN_CONFIG token location | `tokens/domain-config.token.ts` | `domain-config-registry.service.ts` |
| IS_POPOUT token filename | `is-popout.token.ts` | `popout.token.ts` |
| PopOutMessageType enum | 10 values | 12 values (added `CLEAR_ALL_FILTERS`, `CHART_CLICK`, `URL_PARAMS_SYNC`) |
| Retry strategy | `backoffMultiplier: 2` | `Math.pow(2, retryCount - 1)` |
| Document version | 1.0 | 1.1 |

### STATE-MANAGEMENT-SPECIFICATION.md

| Issue | Before | After |
|-------|--------|-------|
| ResourceManagementService line count | 660 | 687 |
| Type parameters | `<TFilters, TData>` | `<TFilters, TData, TStatistics>` |
| Service paths | `frontend/src/app/core/services/` | `src/app/framework/services/` |
| FilterUrlMapper | Standalone service | `IFilterUrlMapper` interface with domain adapters |
| Factory pattern | `vehicle-resource-management.factory.ts` | `createAutomobileDomainConfig()` in domain config |
| Config property | `supportsHighlights: boolean` | `supportsHighlights?: boolean` (deprecated) |

### URL-FIRST-AS-IMPLEMENTED.md

| Issue | Before | After |
|-------|--------|-------|
| Target codebase | `simple-prime` | `vvroom` |
| Domain coverage | Automobile + Agriculture | Automobile only |
| All paths | `/frontend/src/...` | `/src/app/...` |
| Factory example | `createAgricultureDomainConfig()` | `createAutomobileDomainConfig()` |

### POPOUT-ARCHITECTURE.md

| Issue | Before | After |
|-------|--------|-------|
| Message types table | 8 types | 12 types |
| Development server port | 4205 | 4200 |
| Window close polling interval | 1000ms | 500ms |

---

## Files Modified

- `docs/ARCHITECTURE-OVERVIEW.md`
- `docs/STATE-MANAGEMENT-SPECIFICATION.md`
- `docs/URL-FIRST-AS-IMPLEMENTED.md`
- `docs/POPOUT-ARCHITECTURE.md`
- `docs/audit.md` (updated status to CORRECTED)

---

## Validation

All corrections align with the actual source code:

| Source File | Verified |
|-------------|----------|
| `src/app/framework/services/resource-management.service.ts` | 687 lines ✓ |
| `src/app/framework/tokens/popout.token.ts` | exists ✓ |
| `src/app/framework/models/popout.interface.ts` | 12 message types ✓ |
| `src/app/framework/services/domain-config-registry.service.ts` | DOMAIN_CONFIG token ✓ |

---

*Generated: 2026-02-14*

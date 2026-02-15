# Documentation Audit

**Audit Date:** 2026-02-14
**Status:** ✅ CORRECTED (2026-02-14)

## Summary
- Total documents audited: 5
- Documents with issues: 4 (all corrected)
- Total discrepancies: 21 (all resolved)

---

## Discrepancies by Document

### ARCHITECTURE-OVERVIEW.md

1. **Incorrect directory structure path**: Document shows `frontend/src/` as the root but actual codebase uses `src/` (no `frontend/` prefix). All paths in Section 2.1 Directory Structure are incorrect.
   - Document: `frontend/src/app/...`
   - Actual: `src/app/...`

2. **Missing token file**: Document lists `tokens/domain-config.token.ts` but this file does not exist. The DOMAIN_CONFIG token is defined in `services/domain-config-registry.service.ts` instead.
   - Document: `framework/tokens/domain-config.token.ts`
   - Actual: Token defined in `framework/services/domain-config-registry.service.ts`

3. **Incorrect token file name**: Document lists `tokens/is-popout.token.ts` but actual file is named `popout.token.ts`.
   - Document: `framework/tokens/is-popout.token.ts`
   - Actual: `framework/tokens/popout.token.ts`

4. **Non-existent service**: Document mentions `filter-url-mapper.service.ts` in the `services/` directory. This file does not exist as a standalone service. Filter URL mapping is implemented via domain adapters (e.g., `domain-config/automobile/adapters/automobile-url-mapper.ts`).
   - Document: `framework/services/filter-url-mapper.service.ts`
   - Actual: Implemented in domain-specific adapters, not a framework service

5. **Incorrect DomainConfig interface**: Document shows interface with `Type<TFilters>` for `filterModel`, `dataModel`, `statisticsModel`. Actual implementation uses class constructors but the interface structure differs slightly.
   - Document shows `filterModel: Type<TFilters>` etc.
   - Actual: Same basic structure, but domain configs use class references directly

6. **Non-existent file**: Document mentions `vehicle-resource-management.factory.ts` and `VehicleResourceManagementService`. These do not exist - the codebase uses `ResourceManagementService` directly with injected `DOMAIN_CONFIG`.
   - Document: `vehicle-resource-management.factory.ts`
   - Actual: Uses generic `ResourceManagementService` with `DOMAIN_CONFIG` injection

7. **Outdated Pop-Out message type**: Document shows `URL_PARAMS_CHANGED` but implementation also includes `URL_PARAMS_SYNC`, `CLEAR_ALL_FILTERS`, and `CHART_CLICK` which are not listed.
   - Document: Lists 10 message types
   - Actual: `PopOutMessageType` enum has 12 message types

8. **HttpErrorInterceptor retry configuration mismatch**: Document shows `backoffMultiplier: 2` in the retry configuration, but actual `RequestCoordinatorService` uses `Math.pow(2, retryCount - 1)` for exponential backoff.
   - Document: `backoffMultiplier: 2`
   - Actual: Exponential backoff via `Math.pow(2, retryCount - 1)`

9. **Missing service**: Document lists `http-error.interceptor.ts` but does not mention that this is separate from `RequestCoordinatorService` retry logic. The interceptor exists but retry logic is in the coordinator.

10. **Angular version claim**: Document states "Angular 21" but this appears aspirational/incorrect as Angular 21 does not exist as of the document date (Angular versioning as of 2025 was around v17-19).

---

### POPOUT-ARCHITECTURE.md

1. **Outdated polling interval**: Document states pop-out close detection "Polls window.closed every 500ms" which is correct for the code, but in another section mentions "every 1000ms" creating internal inconsistency.
   - Section "DiscoverComponent": shows `setInterval(..., 1000)`
   - Actual code: Uses 500ms interval

2. **Incorrect channel naming**: Document code example shows `const channelName = \`panel-\${panelId}\`` which is correct, but the interface `PopOutWindowRef` description doesn't match the exact implementation.

3. **Missing message types in documentation table**: Document's Message Types table (Section 5.2) lists 10 types, but actual `PopOutMessageType` enum has 12 types including `CLEAR_ALL_FILTERS` and `CHART_CLICK`.
   - Missing from table: `CLEAR_ALL_FILTERS`, `CHART_CLICK`

4. **Outdated development server port**: Document states "Development server running on `http://localhost:4205`" but this should be verified against actual configuration.

---

### STATE-MANAGEMENT-SPECIFICATION.md

1. **Non-existent service file**: Document references `filter-url-mapper.service.ts` as a standalone service at "Location: `frontend/src/app/core/services/filter-url-mapper.service.ts` (126 lines)". This file does not exist.
   - Document: `filter-url-mapper.service.ts` in core/services
   - Actual: Filter URL mapping is domain-specific via `IFilterUrlMapper` interface implementations in domain adapters

2. **Non-existent directory structure**: Document shows `frontend/src/app/core/services/` path, but actual path is `src/app/framework/services/`.
   - Document: `frontend/src/app/core/services/`
   - Actual: `src/app/framework/services/`

3. **Non-existent factory file**: Document mentions `vehicle-resource-management.factory.ts` at 168 lines. This file does not exist.
   - Document: `vehicle-resource-management.factory.ts`
   - Actual: Uses `createAutomobileDomainConfig()` in `automobile.domain-config.ts`

4. **Incorrect ResourceManagementService line count**: Document claims 660 lines for `resource-management.service.ts`. Actual file is 688 lines.
   - Document: 660 lines
   - Actual: 688 lines

5. **Missing deprecated markers**: Document does not reflect that `supportsHighlights` and `highlightPrefix` in `ResourceManagementConfig` are now deprecated in favor of `IFilterUrlMapper.extractHighlights()`.
   - Actual code has `@deprecated` JSDoc tags on these properties

6. **Type parameter discrepancy**: Document shows `ResourceManagementService<TFilters, TData>` with two type parameters in some places. Actual implementation uses three: `ResourceManagementService<TFilters, TData, TStatistics = any>`.

---

### README.md (docs/README.md)

No significant discrepancies found. This document serves as an index/overview linking to other specification documents.

---

### URL-FIRST-AS-IMPLEMENTED.md

1. **Wrong project reference**: Document states "Target Codebase: ~/projects/simple-prime" but should reference `vvroom`. This appears to be an audit report for a different project that was copied.
   - Document: `simple-prime`
   - Expected: `vvroom`

2. **References wrong location for interfaces**: Document states "Interface Definition: `/frontend/src/framework/models/resource-management.interface.ts`" but actual path is `/src/app/framework/models/resource-management.interface.ts`.
   - Document: `/frontend/src/framework/models/...`
   - Actual: `/src/app/framework/models/...`

3. **References non-existent domain**: Document mentions "Agriculture" domain with `AgricultureUrlMapper`, `AgricultureApiAdapter`, etc. These do not exist in the vvroom codebase.
   - Document claims: Agriculture domain implementations exist
   - Actual: Only Automobile domain is implemented

4. **Service file path discrepancies**: Document shows paths like `/frontend/src/framework/services/url-state.service.ts` but actual path is `/src/app/framework/services/url-state.service.ts`.

---

## Documents Clean

- **README.md** - No discrepancies found (serves as index document)

---

## Summary of Common Issues

### Path Prefix Issues
Multiple documents use `frontend/src/` prefix when actual codebase uses `src/`. This affects:
- ARCHITECTURE-OVERVIEW.md
- STATE-MANAGEMENT-SPECIFICATION.md
- URL-FIRST-AS-IMPLEMENTED.md

### Non-Existent Files Referenced
- `filter-url-mapper.service.ts` (domain-specific, not framework service)
- `vehicle-resource-management.factory.ts` (uses domain config factory instead)
- `tokens/domain-config.token.ts` (defined in service file)
- `tokens/is-popout.token.ts` (named `popout.token.ts`)

### Missing/Outdated Pop-Out Message Types
Documentation does not reflect all 12 `PopOutMessageType` enum values.

### Wrong Project Reference
URL-FIRST-AS-IMPLEMENTED.md references `simple-prime` instead of `vvroom` and includes references to non-existent Agriculture domain.

---

## Corrections Applied

All 21 discrepancies have been corrected:

1. ✅ **Updated all path prefixes**: Removed `frontend/` prefix, now uses `src/app/`
2. ✅ **Corrected token file references**: Updated to actual file names (`popout.token.ts`, DOMAIN_CONFIG in service)
3. ✅ **Updated Pop-Out message types**: Added `CLEAR_ALL_FILTERS`, `CHART_CLICK`, `URL_PARAMS_SYNC` etc.
4. ✅ **Removed vehicle-specific factory references**: Now uses domain config factory pattern
5. ✅ **Updated URL-FIRST-AS-IMPLEMENTED.md**: Replaced `simple-prime` with `vvroom`, removed Agriculture references
6. ✅ **Corrected Angular version**: Changed from 21 to 19
7. ✅ **Updated ResourceManagementService line count**: Changed from 660 to 687
8. ✅ **Corrected polling interval**: Updated to 500ms in documentation

---

*Audit performed by automated documentation validation against codebase at `/home/odin/projects/vvroom/src/`*
*Corrections applied: 2026-02-14*

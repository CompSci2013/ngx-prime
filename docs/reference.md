# URL-First State Management Documentation Reference

**Created:** 2026-02-14
**Purpose:** Map authoritative documentation sources for URL-First and State Management patterns

---

## Authoritative Source (CORRECTED)

The **most accurate and up-to-date** documentation is now in:

```
/home/odin/projects/vvroom/docs/
├── ARCHITECTURE-OVERVIEW.md      # 30,087 bytes - Angular 13.3, BehaviorSubject ✅
├── STATE-MANAGEMENT-SPECIFICATION.md  # 62,805 bytes - Corrected line counts ✅
├── POPOUT-ARCHITECTURE.md        # 30,923 bytes - Port 4207 ✅
├── URL-FIRST-AS-IMPLEMENTED.md   # 18,246 bytes - Accurate audit ✅
└── README.md                     # 9,101 bytes - Index document
```

**These files were corrected on 2026-02-14** to fix:
- Angular version: 19 → 13.3.0
- State pattern: Signals → BehaviorSubject
- Development port: 4200 → 4207
- Line counts: url-state.service.ts 434 → 334
- Line counts: request-coordinator.service.ts 265 → 334

---

## Library Organization (OUTDATED - DO NOT USE)

```
/home/odin/library-organization/designs/url-first/
├── ARCHITECTURE-OVERVIEW.md      # 29,896 bytes - WRONG: Angular 21, Signals
├── STATE-MANAGEMENT-SPECIFICATION.md  # 62,416 bytes - WRONG: Line counts
├── POPOUT-ARCHITECTURE.md        # 30,615 bytes - WRONG: Port 4200
├── URL-FIRST-AS-IMPLEMENTED.md   # 18,647 bytes
└── README.md                     # 9,101 bytes
```

**Status:** Contains pre-correction errors. Should be updated from vvroom/docs or marked deprecated.

**Known errors in library-organization version:**
- Claims Angular 21 with standalone components (actual: Angular 13.3 with NgModules)
- Claims Angular Signals pattern (actual: BehaviorSubject pattern)
- Claims `toObservable()` usage (actual: `state$.pipe(map())`)
- Wrong development port (4200 vs 4207)

---

## Cookbook Patterns (DIFFERENT PROJECT)

```
/home/odin/library-organization/cookbook/patterns/
├── state-management.md           # 40,304 bytes - AUTOS project (different services)
├── angular-composition.md        # 25,703 bytes
└── circular-fetch-fix.md         # 18,249 bytes
```

**Status:** These are from the **AUTOS** project, not vvroom. Different service names:
- `StateManagementService` (not `ResourceManagementService`)
- `RouteStateService` (not `UrlStateService`)
- `TableStatePersistenceService` (not in vvroom)

**Use for:** General patterns and principles, NOT as vvroom implementation reference.

---

## Project Family Context

```
/home/odin/library-organization/reference/project-families/
├── autos-family.md               # 4,052 bytes
└── autos-family-context.md       # 7,971 bytes
```

**Status:** Project family overview, may reference URL-First pattern.

---

## Project Briefs (REFERENCE ONLY)

```
/home/odin/library-organization/briefs/
├── auto-discovery.md             # 3,587 bytes
├── auto-discovery.yaml           # 3,794 bytes
├── generic-prime.md              # 3,303 bytes
├── generic-prime.yaml            # 4,865 bytes
├── generic-prime-dockview.md     # 2,160 bytes - References dockview (unused in vvroom)
├── generic-prime-dockview.yaml   # 3,805 bytes
└── simple-prime.md               # 4,701 bytes
```

**Status:** High-level project briefs. May contain outdated architecture claims.

---

## Textbook (ACCURATE)

```
/home/odin/projects/vvroom/textbook-revised/
├── 000-p01.md                    # Book conventions - Angular 13 ✅
├── 202-p*.md                     # Adapter interfaces
├── 208-p*.md                     # PopOutMessageType
├── 301-p*.md                     # UrlStateService
├── 306-p*.md                     # ResourceManagementService
└── ... (230+ files)
```

**Status:** Accurately depicts Angular 13.3 with BehaviorSubject pattern.

---

## Summary: Which to Use

| Purpose | Use This Source |
|---------|-----------------|
| **vvroom implementation details** | `/home/odin/projects/vvroom/docs/` ✅ |
| **Teaching/learning** | `/home/odin/projects/vvroom/textbook-revised/` ✅ |
| **General URL-First concepts** | `/home/odin/library-organization/cookbook/patterns/state-management.md` |
| **Project briefs** | `/home/odin/library-organization/briefs/` (verify against code) |

---

## Action Items

1. **Update library-organization/designs/url-first/** - Sync from vvroom/docs or mark as deprecated
2. **Verify briefs** - Check yaml/md briefs for Angular version claims
3. **Consider single source** - Determine if documentation should live in one place

---

*Reference compiled: 2026-02-14*

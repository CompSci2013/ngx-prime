# Pre-Extraction Notes: Working with lib/ Before Angular Library Export

## Context

The four libraries (`config`, `framework`, `popout`, `state-management`) live under `src/app/lib/` in this repository. They are **not yet** Angular library projects (`ng generate library`). This document covers how to work with them in their current state and what changes when they become proper libraries.

## Current State

```
src/app/
├── lib/                          ◄── Future Angular libraries
│   ├── config/                   ◄── @myorg/ngx-discover-config
│   ├── framework/                ◄── @myorg/ngx-discover-framework
│   ├── popout/                   ◄── @myorg/ngx-discover-popout
│   └── state-management/         ◄── @myorg/ngx-discover-state
├── domain-config/automobile/     ◄── Example domain (consumer of lib/)
└── features/discover/            ◄── Example feature page (consumer of lib/)
```

### Import Paths Today

```typescript
// From a domain-config file:
import { DomainConfig, GenericUrlMapper, GenericApiAdapter } from '../../lib/config';
import { ApiService, ResourceManagementService } from '../../lib/state-management';
import { ChartDataSource } from '../../lib/framework';
import { PopOutManagerService } from '../../lib/popout';
```

### Import Paths After Extraction

```typescript
// After ng generate library + publish:
import { DomainConfig, GenericUrlMapper, GenericApiAdapter } from '@myorg/ngx-discover-config';
import { ApiService, ResourceManagementService } from '@myorg/ngx-discover-state';
import { ChartDataSource } from '@myorg/ngx-discover-framework';
import { PopOutManagerService } from '@myorg/ngx-discover-popout';
```

The internal code is identical. Only import paths change.

## What You CAN Do Today

### 1. Copy `src/app/lib/` Into Your Brownfield App

The simplest approach. Copy the four directories into your app's source tree:

```bash
cp -r ngx-prime/src/app/lib/ my-app/src/app/lib/
```

Then import from relative paths. This works immediately — no library build step needed.

**Downside**: You now own a copy. Updates require manual merging.

### 2. Reference as a Path-Mapped TypeScript Project

Add a `paths` entry in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@discover/config": ["../ngx-prime/src/app/lib/config/index.ts"],
      "@discover/framework": ["../ngx-prime/src/app/lib/framework/index.ts"],
      "@discover/popout": ["../ngx-prime/src/app/lib/popout/index.ts"],
      "@discover/state": ["../ngx-prime/src/app/lib/state-management/index.ts"]
    }
  }
}
```

This lets your brownfield app import as `@discover/config` etc. without copying files. The Angular CLI will compile them along with your app.

**Downside**: Both repos must be on the same machine. Not suitable for CI without workspace setup.

### 3. Use the Domain Generator Tool

The `tools/domain-generator/` tool scaffolds a complete domain-config directory from either an Elasticsearch mapping or API response probing:

```bash
# From ES mapping
./tools/domain-generator/run.sh \
  --index my-index \
  --es-url http://elasticsearch:9200 \
  --domain my-domain \
  --outdir /path/to/my-app/src/app/domain-config/my-domain

# From API responses
./tools/domain-generator/run.sh \
  --probe http://my-api.com/items?page=1&size=100 \
  --openapi http://my-api.com/swagger.json \
  --domain my-domain \
  --outdir /path/to/my-app/src/app/domain-config/my-domain
```

This generates all ~15 files. Review and customize (labels, chart colors, filter order).

## What Changes at Extraction Time

### 1. `ng generate library` Creates Separate Build Artifacts

Each library becomes a separately compiled Angular package with its own `ng-package.json`, `public-api.ts`, and build output in `dist/`.

### 2. Barrel Exports Become `public-api.ts`

The current `index.ts` files map 1:1 to Angular library `public-api.ts` files. No restructuring needed.

### 3. Module Declarations Move to Library Modules

`FrameworkModule` already declares and exports all framework components. `PopoutModule` already exists. These become the library entry modules.

`config` and `state-management` don't have NgModules (they're pure TypeScript — interfaces, services, classes). They'll be published as `@myorg/ngx-discover-config` and `@myorg/ngx-discover-state` without NgModules, consumed via direct imports.

### 4. Peer Dependencies

The libraries will declare peer dependencies:

| Library | Peer Dependencies |
|---------|-------------------|
| `config` | `@angular/core` |
| `state-management` | `@angular/core`, `@angular/router`, `rxjs`, `@myorg/ngx-discover-config` |
| `framework` | `@angular/core`, `@angular/cdk`, `primeng`, `plotly.js-dist-min`, `@myorg/ngx-discover-config`, `@myorg/ngx-discover-state` |
| `popout` | `@angular/core`, `@angular/cdk` |

### 5. The Domain Generator Tool Stays Separate

It's already a standalone Node.js tool (compiled TypeScript, not Angular). It will ship alongside the libraries or as its own npm package.

## Library Boundary Rules

These rules apply NOW, before extraction, and enforce clean library boundaries:

1. **`lib/` has ZERO knowledge of the application.** No imports from `src/app/features/`, `src/app/domain-config/`, or `src/environments/`. The `lib/` barrel `index.ts` files are the only public surface.

2. **App imports through barrel only.** Never `import { X } from '../../lib/config/models/resource-definition.interface'`. Always `import { X } from '../../lib/config'`.

3. **Dependency direction is one-way.** `config` ← `state-management` ← `framework`. Never reverse.

4. **`popout` is independent.** It depends on nothing in `lib/` and is consumed by `framework` components.

5. **Domain configs import from `lib/`, never the reverse.** The automobile domain-config is a *consumer* of the libraries, not part of them.

## File Count Reality Check

50 files across 4 libraries sounds like a lot. Here's perspective:

| What | Files | You Write | Generated/Generic |
|------|-------|-----------|-------------------|
| **Libraries (lib/)** | 50 | 0 (you consume, not modify) | 50 |
| **Minimal domain config** | 5 | 5 | 0 |
| **Full domain config (with charts, pickers)** | 15-20 | 15-20 | 0 |

The 50 library files are infrastructure you never touch. Your domain config is 5-20 files depending on how many charts and pickers you need. The domain generator tool can scaffold the initial 15-20 files from an ES mapping or API probe.

# Pop-out Library (`src/app/lib/popout`)

Renders Angular components in separate browser windows using CDK `DomPortalOutlet`. Pop-out components share the host window's DI context — same `ResourceManagementService` instance, same data, no message-passing for state sync.

**Important:** This library's source must stay identical to `~/projects/ngx-popout/projects/popout/src/lib/`. Do not modify one without syncing the other.

## Architecture

```
Main Window                          Pop-out Window (about:blank)
┌─────────────────────┐              ┌─────────────────────────────┐
│ DiscoverComponent   │              │ DomPortalOutlet             │
│   providers: [      │              │   ├─ ComponentRef<T>        │
│     ResourceMgmt,   │──Injector──▶ │   ├─ PopOutContextService   │
│     PopOutManager   │              │   └─ (inherits host DI)     │
│   ]                 │              │                             │
│                     │   Styles ──▶ │ <style> (copied from host)  │
│                     │   Events ──▶ │ drag/drop event forwarding  │
└─────────────────────┘              └─────────────────────────────┘
```

Pop-out components receive the **same injector** as the host, so they get the same `ResourceManagementService`, `UrlStateService`, etc. When filters change in the main window, the service's observables emit, and pop-out components update automatically.

## Services

### PopOutManagerService

Manages the full pop-out lifecycle: open window, copy styles, render component via portal, forward events, handle close.

```typescript
// Provided at component level alongside ResourceManagementService
@Component({
  providers: [ResourceManagementService, PopOutManagerService]
})
export class DiscoverComponent {
  constructor(private popOutManager: PopOutManagerService) {}

  ngOnInit() {
    // Must initialize with host injector for DI context sharing
    this.popOutManager.initialize(this.injector);
  }
}
```

**Key methods:**
```typescript
// Open a component in a pop-out window
openPopOut(panelId: string, componentType: Type<any>, data: Record<string, any>, features?: PopOutWindowFeatures): boolean

// Check if a panel is currently popped out
isPoppedOut(panelId: string): boolean

// Close a specific pop-out or all
closePopOut(panelId: string): void
closeAllPopOuts(): void

// Push state to pop-outs (triggers OnPush change detection)
broadcastState(state: any): void
```

**Observable streams:**
```typescript
messages$: Observable<{ panelId: string, message: PopOutMessage }>  // Messages from pop-outs
closed$: Observable<string>     // Emits panelId when pop-out closes
blocked$: Observable<string>    // Emits when browser blocks the popup
```

### PopOutContextService

Lightweight side-car injected into portal-rendered components. Solves the timing problem: when a component renders in an `about:blank` window, the DOM isn't ready until styles are copied and events are wired.

```typescript
@Injectable()
export class PopOutContextService {
  readonly isPopOut = true;
  readonly ready$: ReplaySubject<void>;  // Emits once after window is fully set up

  signalReady(): void;  // Called by PopOutManagerService after setup
}
```

**How `openPopOut` uses it internally:**
```typescript
// Inside PopOutManagerService.openPopOut():
const popOutContext = new PopOutContextService();
const portalInjector = Injector.create({
  providers: [{ provide: PopOutContextService, useValue: popOutContext }],
  parent: this.hostInjector  // Host injector = same ResourceManagementService
});
const outlet = new DomPortalOutlet(popoutWindow.document.body, ..., portalInjector);
// ... copy styles, forward events, set @Input() data ...
popOutContext.signalReady();
```

## Implementing Pop-out Support in a Component

### Step 1: Make the component pop-out-aware

Inject `PopOutContextService` as `@Optional()` — the service only exists in pop-out windows.

```typescript
import { PopOutContextService } from '../../../popout/popout-context.service';

@Component({ ... })
export class MyChartComponent implements AfterViewInit, OnDestroy {
  constructor(
    @Optional() @Inject(PopOutContextService) private popOutContext: PopOutContextService | null,
    @Optional() private resourceService: ResourceManagementService<any, any, any> | null
  ) {}

  ngAfterViewInit() {
    if (this.popOutContext) {
      // Wait for pop-out window to be fully ready before rendering
      this.popOutContext.ready$.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.render());
    } else {
      // Normal in-page rendering
      this.render();
    }
  }

  ngOnInit() {
    // In pop-out: subscribe to live data via DI (no @Input() bindings available)
    if (this.popOutContext && this.resourceService) {
      this.resourceService.statistics$.pipe(takeUntil(this.destroy$))
        .subscribe(stats => { this.data = stats; this.render(); });
    }
  }
}
```

### Step 2: Register the component in the panel map

In `DiscoverComponent` (or your page component):

```typescript
const PANEL_COMPONENT_MAP: Record<string, Type<any>> = {
  'query-control': QueryControlComponent,
  'statistics-panel-2': StatisticsPanel2Component,
  'my-custom-panel': MyCustomComponent,  // Add your component here
};
```

### Step 3: Open the pop-out

```typescript
popOutPanel(panelId: string): void {
  const componentType = PANEL_COMPONENT_MAP[panelId];
  if (!componentType) return;

  this.popOutManager.openPopOut(panelId, componentType, {
    title: this.getPanelTitle(panelId),
    domainConfig: this.domainConfig  // Passed as @Input() data
  });
  this.cdr.markForCheck();
}
```

## Message Types

```typescript
enum PopOutMessageType {
  STATE_UPDATE      // Main → Pop-out: state push (triggers OnPush CD)
  CLOSE_POPOUT      // Main → Pop-out: close request
  COMPONENT_OUTPUT  // Pop-out → Main: @Output() event relay
  PANEL_READY       // Pop-out → Main: ready for initial state
}
```

`@Output()` events from pop-out components are auto-wired by `PopOutManagerService` and relayed as `COMPONENT_OUTPUT` messages with `{ outputName: string, data: any }`.

## Why CDK Portal Instead of BroadcastChannel

The pop-out component shares the host's Angular DI context. This means:
- Same `ResourceManagementService` instance → data is always current
- No serialization/deserialization of state
- No message-passing for data sync (only for `@Output()` event relay)
- Components work identically in-page and in pop-out

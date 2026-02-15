# Pop-Out Architecture: Complete Guide

**Table of Contents**
1. [Overview](#overview)
2. [GoldenLayout vs Our Approach](#goldenlayout-vs-our-approach)
3. [Our Pop-Out Implementation](#our-pop-out-implementation)
4. [How It Works](#how-it-works)
5. [Converting GoldenLayout Pop-Outs](#converting-goldenlayout-pop-outs)
6. [Manual Testing Guide](#manual-testing-guide)

---

## Overview

This document explains the pop-out window system used in Generic Prime Discovery Framework. Pop-outs allow users to move individual panels into separate browser windows for multi-monitor or multi-workspace scenarios.

**Current Features**:
- ✅ Individual panels can be moved to pop-out windows
- ✅ Full state synchronization between main and pop-out windows
- ✅ Cross-window communication via BroadcastChannel API
- ✅ URL-first state management (main window URL is source of truth)
- ✅ No external layout libraries required

---

## GoldenLayout vs Our Approach

### GoldenLayout Approach (NOT USED)

**GoldenLayout** is a popular JavaScript library for creating dynamic, nested, resizable panel layouts with multi-window support.

#### How GoldenLayout Handles Pop-Outs

```
Main Window (GoldenLayout Container)
├── Panel 1 (Query Control)
├── Panel 2 (Picker)
├── Panel 3 (Statistics)
└── Panel 4 (Results)

User clicks "Pop Out" on Panel 2
↓
GoldenLayout:
  1. Removes component from main layout tree
  2. Creates browser window via window.open()
  3. Initializes GoldenLayout config in pop-out window
  4. Syncs internal state tree with pop-out
  5. Manages layout hierarchy across both windows
```

**Characteristics**:
- ✅ Sophisticated nested layout system
- ✅ Drag-drop between windows
- ✅ Complex state management (layout tree)
- ✅ Complex initialization (must load GoldenLayout in pop-out)
- ❌ Heavy library dependency
- ❌ Complex to debug cross-window issues
- ❌ Tightly couples UI logic to layout library

**State Complexity**: GoldenLayout maintains a hierarchical layout tree for BOTH windows, tracking parent-child relationships, resize constraints, tab groups, etc.

---

### Our Approach: Configuration-Driven + BroadcastChannel

**We chose a simpler, more explicit approach** that leverages Angular's strength in state management:

```
Main Window (DiscoverComponent)
├── Query Control (bound to ResourceManagementService)
├── Picker (bound to ResourceManagementService)
├── Statistics (bound to ResourceManagementService)
└── Results Table (bound to ResourceManagementService)

User clicks "Pop Out" on Picker
↓
Our System:
  1. Main window creates pop-out route: /panel/discover/picker/picker
  2. Opens browser window pointing to that route
  3. Pop-out window initializes PanelPopoutComponent
  4. PanelPopoutComponent sets up BroadcastChannel
  5. Main window syncs ResourceManagementService state to pop-out
  6. Components in BOTH windows subscribe to same state observables
```

**Characteristics**:
- ✅ Simple, explicit state synchronization
- ✅ No layout library dependency
- ✅ Easy to understand and debug
- ✅ Leverages Angular's observable pattern
- ✅ URL-first state management
- ❌ No drag-drop between windows
- ❌ No nested layout system
- ❌ Each panel is independent (no parent-child relationships)

**State Simplicity**: We synchronize application state (filters, selected items, results) only. Layout is implicit (one component per window).

---

## Our Pop-Out Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ MAIN WINDOW                                                     │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ DiscoverComponent (route: /automobiles/discover)             ││
│ │ ├─ ResourceManagementService (state holder)                  ││
│ │ │  └─ Observable: filters$, results$, statistics$           ││
│ │ ├─ Query Control (subscribes to filters$)                   ││
│ │ ├─ Picker (subscribes to pickerState$)                      ││
│ │ ├─ Statistics Panel (subscribes to statistics$)             ││
│ │ └─ Results Table (subscribes to results$)                   ││
│ │                                                               ││
│ │ PopOut Management:                                            ││
│ │ • popoutWindows Map<panelId, PopOutWindowRef>               ││
│ │ • BroadcastChannel per panel                                 ││
│ │ • State sync on updates                                       ││
│ │ • Close detection polling                                     ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↓
                      window.open() creates
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ POP-OUT WINDOW                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ PanelPopoutComponent (route: /panel/discover/:panelId/:type) ││
│ │ ├─ ResourceManagementService (receives state via BC)          ││
│ │ │  └─ Observable: filters$, results$, statistics$           ││
│ │ └─ Panel Component (e.g., BasePicker, ResultsTable)         ││
│ │                                                               ││
│ │ PopOut Initialization:                                        ││
│ │ • Listens to BroadcastChannel messages                        ││
│ │ • Updates ResourceManagementService with main window state   ││
│ │ • Components subscribe to same observables                   ││
│ │ • Sends state changes back to main window                    ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. **PopOutContextService** (`framework/services/popout-context.service.ts`)

Manages pop-out window detection and cross-window communication.

```typescript
// Initialization in main window
popOutContext.initializeAsParent();

// Initialization in pop-out window
popOutContext.initializeAsPopOut(panelId);

// Check if current window is a pop-out
if (popOutContext.isInPopOut()) {
  // Running in pop-out
}

// Get pop-out context
const context = popOutContext.getContext();
// { isPopOut: true, gridId: 'discover', panelId: 'picker', panelType: 'picker' }

// Send message to other window
popOutContext.sendMessage({
  type: PopOutMessageType.PICKER_SELECTION_CHANGE,
  payload: { ... }
});

// Receive messages from other window
popOutContext.getMessages$().subscribe(msg => {
  switch(msg.type) {
    case PopOutMessageType.STATE_UPDATE:
      this.updateState(msg.payload);
      break;
  }
});
```

#### 2. **BroadcastChannel API**

The browser's native cross-window communication mechanism.

```typescript
// Main window creates channel when opening pop-out
const channelName = `panel-${panelId}`;
const channel = new BroadcastChannel(channelName);

// Both windows communicate via same channel name
// Main window → Pop-out: STATE_UPDATE, CLOSE_POPOUT
// Pop-out → Main window: PANEL_READY, FILTER_ADD, PICKER_SELECTION_CHANGE

channel.postMessage({
  type: 'STATE_UPDATE',
  payload: { state: currentState },
  timestamp: Date.now()
});

channel.onmessage = (event) => {
  const message = event.data;
  // Handle message
};

channel.close(); // Cleanup
```

#### 3. **DiscoverComponent** (`app/features/discover/discover.component.ts`)

Main window component that opens and manages pop-outs.

```typescript
// Track open pop-outs
private popoutWindows = new Map<string, PopOutWindowRef>();

// Open pop-out
popOutPanel(panelId: string, panelType: string): void {
  const route = `/panel/discover/${panelId}/${panelType}`;

  // Create new window
  const windowRef = window.open(
    route,
    panelId,
    buildWindowFeatures({ width: 1200, height: 800 })
  );

  // Create BroadcastChannel
  const channel = this.popOutContext.createChannelForPanel(panelId);

  // Store reference for cleanup
  this.popoutWindows.set(panelId, {
    window: windowRef,
    channel: channel,
    checkInterval: setInterval(() => {
      if (windowRef.closed) {
        this.closePopOut(panelId);
      }
    }, 500),
    panelId: panelId,
    panelType: panelType
  });

  // Send initial state to pop-out
  channel.postMessage({
    type: PopOutMessageType.STATE_UPDATE,
    payload: { state: this.resourceService.getState() }
  });
}

// Listen for messages from pop-outs
this.popOutContext.getMessages$()
  .pipe(takeUntil(this.destroy$))
  .subscribe(msg => {
    switch(msg.type) {
      case PopOutMessageType.PANEL_READY:
        // Pop-out is ready, send state
        break;
      case PopOutMessageType.PICKER_SELECTION_CHANGE:
        // Update URL and state
        this.handlePickerChange(msg.payload);
        break;
      case PopOutMessageType.FILTER_ADD:
        // Add filter and sync to all pop-outs
        break;
    }
  });

// Cleanup when main window closes
window.addEventListener('beforeunload', () => {
  this.popoutWindows.forEach((ref) => ref.window.close());
});
```

#### 4. **PanelPopoutComponent** (`app/features/panel-popout/panel-popout.component.ts`)

Pop-out window component that receives state and renders a single panel.

```typescript
// Initialize as pop-out
ngOnInit(): void {
  this.route.params.subscribe(params => {
    const panelId = params['panelId'];
    this.popOutContext.initializeAsPopOut(panelId);
  });

  // Listen for STATE_UPDATE from main window
  this.popOutContext.getMessages$()
    .pipe(takeUntil(this.destroy$))
    .subscribe(msg => {
      switch(msg.type) {
        case PopOutMessageType.STATE_UPDATE:
          // Update ResourceManagementService state
          this.resourceService.updateState(msg.payload.state);
          this.cdr.detectChanges();
          break;
      }
    });
}

// Render the appropriate panel component
ngAfterViewInit(): void {
  // Create component dynamically based on panelType
  // e.g., panelType='picker' → BasePicker
  // e.g., panelType='results' → ResultsTable
}
```

---

## How It Works

### State Synchronization Flow

```
1. USER CHANGES FILTER IN MAIN WINDOW
   └─ Clicks manufacturer dropdown

2. QUERY CONTROL HANDLES CHANGE
   └─ Calls UrlStateService.updateParams()

3. URL UPDATES
   └─ Router pushes: /automobiles/discover?manufacturer=Toyota

4. RESOURCE MANAGEMENT SERVICE DETECTS URL CHANGE
   └─ Triggers API call (if not a pop-out)
   └─ Updates observables: filters$, results$, statistics$

5. MAIN WINDOW COMPONENTS RE-RENDER
   └─ QueryControl shows new filter
   └─ ResultsTable shows new data

6. DISCOVER COMPONENT DETECTS STATE CHANGE
   └─ Loops through popoutWindows map
   └─ Sends STATE_UPDATE via BroadcastChannel

7. POP-OUT WINDOW RECEIVES MESSAGE
   └─ BroadcastChannel.onmessage fires
   └─ Calls ResourceManagementService.updateState()
   └─ NO API CALL (state comes from main window)

8. POP-OUT COMPONENTS RE-RENDER
   └─ Same observables update
   └─ ChangeDetectionStrategy.OnPush is triggered
   └─ Display updates automatically

9. USER MAKES SELECTION IN POP-OUT
   └─ Clicks result row

10. POP-OUT COMPONENT DETECTS SELECTION
    └─ Sends PICKER_SELECTION_CHANGE via BroadcastChannel

11. MAIN WINDOW RECEIVES MESSAGE
    └─ Calls UrlStateService.updateParams()
    └─ Updates URL to reflect selection
    └─ Flow repeats from step 4
```

### Message Types

| Message Type | Direction | Payload | Purpose |
|--------------|-----------|---------|---------|
| `STATE_UPDATE` | Main → Pop-out | `{ state: ResourceState }` | Sync application state |
| `CLOSE_POPOUT` | Main → Pop-out | none | Main window requests pop-out close |
| `PANEL_READY` | Pop-out → Main | none | Pop-out initialized and ready |
| `PICKER_SELECTION_CHANGE` | Pop-out → Main | `PickerSelectionPayload` | User selected item in picker |
| `FILTER_ADD` | Pop-out → Main | `QueryFilter` | User added filter in pop-out |
| `FILTER_REMOVE` | Pop-out → Main | `{ field, updates }` | User removed filter in pop-out |
| `HIGHLIGHT_REMOVE` | Pop-out → Main | `string` | User removed highlight |
| `CLEAR_HIGHLIGHTS` | Pop-out → Main | none | Clear all highlights |
| `CLEAR_ALL_FILTERS` | Pop-out → Main | none | Clear all filters and highlights |
| `URL_PARAMS_CHANGED` | Pop-out → Main | `{ params: Params }` | URL parameters changed in pop-out |
| `URL_PARAMS_SYNC` | Main → Pop-out | `{ params: Params }` | Sync URL parameters to pop-out |
| `CHART_CLICK` | Pop-out → Main | `{ chartId, value, isHighlightMode }` | Chart click/selection |

---

## Converting GoldenLayout Pop-Outs

### Step-by-Step Migration Guide

If you have an Angular application using **GoldenLayout** for pop-outs and want to migrate to our approach, follow these steps:

#### Phase 1: Remove GoldenLayout Dependencies

**Step 1.1: Remove GoldenLayout Imports**

```typescript
// BEFORE (with GoldenLayout)
import { GoldenLayoutComponent } from 'ng-golden-layout';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  @ViewChild(GoldenLayoutComponent)
  glayout: GoldenLayoutComponent;

  constructor(private glService: GoldenLayoutService) {}

  ngOnInit() {
    this.glService.initializeLayout(this.layoutConfig);
  }
}

// AFTER (our approach)
import { PopOutContextService } from 'framework/services/popout-context.service';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html'
})
export class DiscoverComponent {
  constructor(
    private popOutContext: PopOutContextService,
    public resourceService: ResourceManagementService
  ) {}

  ngOnInit() {
    this.popOutContext.initializeAsParent();
  }
}
```

**Step 1.2: Remove from package.json**

```json
{
  "devDependencies": {
    "ng-golden-layout": "^X.X.X"  // ❌ Remove this
  }
}
```

#### Phase 2: Create Pop-Out Context Service

Create your own `popout-context.service.ts` (use the one from Generic Prime as template).

**Key responsibilities**:
- Detect if current window is a pop-out (URL pattern)
- Create/manage BroadcastChannel instances
- Handle cross-window messaging
- Provide Observable of messages

```typescript
@Injectable({ providedIn: 'root' })
export class PopOutContextService {
  private channel: BroadcastChannel | null = null;
  private messagesSubject = new Subject<PopOutMessage>();

  isInPopOut(): boolean {
    // Check if route matches /panel/:gridId/:panelId/:type
  }

  initializeAsParent(): void {
    // Parent window setup
  }

  initializeAsPopOut(panelId: string): void {
    // Pop-out window setup
  }

  sendMessage(message: PopOutMessage): void {
    this.channel?.postMessage(message);
  }

  getMessages$(): Observable<PopOutMessage> {
    return this.messagesSubject.asObservable();
  }
}
```

#### Phase 3: Update Main Component

Replace GoldenLayout initialization with pop-out management:

```typescript
// BEFORE (with GoldenLayout)
export class MainLayoutComponent {
  private glayout: GoldenLayout;

  openPopOut(componentName: string) {
    // GoldenLayout handles window.open internally
    this.glayout.openWindow(componentName);
  }

  onComponentStateChanged() {
    // GoldenLayout emits events
    const state = this.glayout.getState();
    // Manage complex state tree
  }
}

// AFTER (our approach)
export class DiscoverComponent {
  private popoutWindows = new Map<string, PopOutWindowRef>();

  ngOnInit() {
    this.popOutContext.initializeAsParent();

    // Listen for messages from pop-outs
    this.popOutContext.getMessages$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => this.handlePopOutMessage(msg));

    // Close pop-outs on page unload
    window.addEventListener('beforeunload', () => {
      this.popoutWindows.forEach(ref => ref.window.close());
    });
  }

  popOutPanel(panelId: string, panelType: string) {
    const route = `/panel/discover/${panelId}/${panelType}`;
    const windowRef = window.open(route, panelId, 'width=1200,height=800');

    const channel = this.popOutContext.createChannelForPanel(panelId);
    this.popoutWindows.set(panelId, {
      window: windowRef,
      channel: channel,
      checkInterval: setInterval(() => {
        if (windowRef.closed) {
          this.popoutWindows.delete(panelId);
          clearInterval(this.popoutWindows.get(panelId)?.checkInterval);
        }
      }, 500),
      panelId,
      panelType
    });

    // Send initial state
    channel.postMessage({
      type: 'STATE_UPDATE',
      payload: { state: this.resourceService.getState() }
    });
  }

  private handlePopOutMessage(msg: PopOutMessage) {
    switch(msg.type) {
      case 'PICKER_SELECTION_CHANGE':
        this.urlStateService.updateParams(msg.payload);
        this.broadcastStateToAllPopOuts();
        break;
      // ... handle other message types
    }
  }

  private broadcastStateToAllPopOuts() {
    this.popoutWindows.forEach((ref, panelId) => {
      ref.channel.postMessage({
        type: 'STATE_UPDATE',
        payload: { state: this.resourceService.getState() }
      });
    });
  }
}
```

#### Phase 4: Create Pop-Out Component

Create a new route and component for rendering pop-outs:

```typescript
// app-routing.module.ts
const routes: Routes = [
  // Existing routes
  { path: 'discover', component: DiscoverComponent },

  // NEW: Pop-out route
  { path: 'panel/:gridId/:panelId/:type', component: PanelPopoutComponent }
];

// panel-popout.component.ts
@Component({
  selector: 'app-panel-popout',
  template: `
    <ng-container [ngSwitch]="panelType">
      <app-base-picker *ngSwitchCase="'picker'"
        [domainConfig]="domainConfig">
      </app-base-picker>
      <app-query-control *ngSwitchCase="'query-control'"
        [domainConfig]="domainConfig">
      </app-query-control>
      <app-results-table *ngSwitchCase="'results'"
        [domainConfig]="domainConfig">
      </app-results-table>
    </ng-container>
  `
})
export class PanelPopoutComponent implements OnInit {
  panelType: string = '';

  constructor(
    private route: ActivatedRoute,
    private popOutContext: PopOutContextService,
    public resourceService: ResourceManagementService
  ) {}

  ngOnInit() {
    // Initialize as pop-out
    this.route.params.subscribe(params => {
      this.panelType = params['type'];
      this.popOutContext.initializeAsPopOut(params['panelId']);
    });

    // Receive state updates from main window
    this.popOutContext.getMessages$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        if (msg.type === 'STATE_UPDATE') {
          this.resourceService.updateState(msg.payload.state);
        }
      });
  }
}
```

#### Phase 5: Update Components for Pop-Out Safety

Ensure all components work correctly in both main and pop-out contexts:

```typescript
// query-control.component.ts
export class QueryControlComponent implements OnInit {
  constructor(
    private resourceService: ResourceManagementService,
    private urlStateService: UrlStateService,
    private popOutContext: PopOutContextService
  ) {}

  ngOnInit() {
    // Same code works in both windows
    this.resourceService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        // Render filters
      });
  }

  addFilter(filter: QueryFilter) {
    if (this.popOutContext.isInPopOut()) {
      // Pop-out: Send message to main window
      this.popOutContext.sendMessage({
        type: 'FILTER_ADD',
        payload: filter
      });
    } else {
      // Main window: Update URL directly
      this.urlStateService.updateParams({ ...filter });
    }
  }
}
```

#### Phase 6: Update State Management

Ensure your state service works correctly when receiving updates from pop-outs:

```typescript
// resource-management.service.ts
@Injectable()
export class ResourceManagementService {
  private stateSubject = new BehaviorSubject<ResourceState>(initialState);
  public state$ = this.stateSubject.asObservable();

  constructor(
    private api: ApiService,
    private popOutContext: PopOutContextService
  ) {}

  updateState(newState: Partial<ResourceState>): void {
    // Update internal state
    this.stateSubject.next({ ...this.stateSubject.value, ...newState });
  }

  handleUrlChange(params: Params): void {
    if (!this.popOutContext.isInPopOut()) {
      // Main window: Fetch from API
      this.api.search(params).subscribe(results => {
        this.updateState({ results, params });
      });
    }
    // Pop-out: State will come from main window via BroadcastChannel
  }
}
```

#### Phase 7: Testing

Test pop-out functionality:

```typescript
// Step 1: Open main component
Navigate to /discover

// Step 2: Click "Pop Out" on a panel
Window should open showing just that panel

// Step 3: Change filter in main window
Both windows should update immediately

// Step 4: Change selection in pop-out
Main window should update URL and both should re-render

// Step 5: Close pop-out
Main window should continue working normally

// Step 6: Refresh main window
Pop-outs should close automatically
```

---

## Manual Testing Guide

### Prerequisites

- Development server running on `http://localhost:4207`
- Backend API running
- Chrome/Chromium browser (or any browser supporting BroadcastChannel API)

### Test Scenarios

#### Test 1: Open Pop-Out Window

**Steps**:
1. Navigate to `http://localhost:4200/automobiles/discover`
2. Look for pop-out buttons on panels (⇲ icon or "Pop Out" button)
3. Click pop-out button on "Model Picker" panel
4. New window should open showing only the Model Picker

**Expected Results**:
- ✅ New window opens with correct URL pattern `/panel/discover/manufacturer-model-picker/picker`
- ✅ Window title shows panel name (if set)
- ✅ Picker is fully functional in pop-out
- ✅ Console shows no errors about missing components

**Key Points to Check**:
- [ ] Pop-out window doesn't show navigation header
- [ ] Pop-out window doesn't show other panels
- [ ] Pop-out window is resizable and closable
- [ ] Pop-out window has correct initial size/position

#### Test 2: State Synchronization Main → Pop-Out

**Steps**:
1. Open pop-out on "Model Picker" (from Test 1)
2. In **MAIN WINDOW**, select a manufacturer (e.g., "Toyota")
3. Watch the pop-out window Model Picker

**Expected Results**:
- ✅ Pop-out's picker immediately shows only Toyota models
- ✅ No page refresh needed
- ✅ Selection happens in real-time (< 1 second)

**Key Points to Check**:
- [ ] Picker updates immediately without lag
- [ ] Main window results table also updates
- [ ] Statistics panel also updates
- [ ] Check browser console for any message errors

#### Test 3: State Synchronization Pop-Out → Main

**Steps**:
1. Open pop-out on "Model Picker"
2. In **POP-OUT WINDOW**, select a manufacturer
3. Watch the main window

**Expected Results**:
- ✅ Main window URL updates to reflect selection
- ✅ Main window results table updates
- ✅ Statistics panel updates
- ✅ Main window picker updates to match pop-out selection

**Key Points to Check**:
- [ ] URL changes in main window
- [ ] No API call duplication (check Network tab - only one request)
- [ ] All panels in main window update together
- [ ] Pop-out stays open after changes

#### Test 4: Multiple Pop-Outs

**Steps**:
1. In main window, open pop-out for "Model Picker"
2. In main window, open pop-out for "Statistics Panel"
3. In main window, select a different manufacturer
4. Watch both pop-out windows

**Expected Results**:
- ✅ Both pop-outs open independently
- ✅ Both pop-outs receive state update
- ✅ Statistics panel in pop-out updates with new data
- ✅ Model picker shows new manufacturer's models

**Key Points to Check**:
- [ ] No cross-talk between channels (use browser DevTools)
- [ ] Both windows close when main window closes
- [ ] Browser console shows two separate channel creation logs

#### Test 5: Filter Operations

**Prerequisites**: Pop-out on Model Picker (Test 1)

**Steps**:
1. In main window, add a filter (e.g., Year: 2020-2023)
2. Watch pop-out Model Picker
3. In pop-out, select a model
4. Watch main window results update

**Expected Results**:
- ✅ Pop-out sees the filter chips in Query Control
- ✅ Pop-out's selection works correctly with active filters
- ✅ Main window results reflect both filter AND selection
- ✅ Statistics show filtered data

**Key Points to Check**:
- [ ] Filter state is correctly synchronized
- [ ] Model selection in pop-out respects active filters
- [ ] Results pagination works with filters

#### Test 6: Pop-Out Window Close

**Prerequisites**: Pop-out open (from any test)

**Steps**:
1. Open pop-out on a panel
2. Click browser close button (X) on pop-out window
3. Watch main window for issues

**Expected Results**:
- ✅ Pop-out closes cleanly
- ✅ Main window continues operating normally
- ✅ Console shows channel cleanup messages
- ✅ Can re-open pop-out on same panel

**Key Points to Check**:
- [ ] No memory leaks (check DevTools memory tab)
- [ ] Close detection works (main window detects closure)
- [ ] Can open multiple pop-outs again

#### Test 7: Page Refresh

**Prerequisites**: Pop-out open (from any test)

**Steps**:
1. Open pop-out on a panel
2. Click refresh (F5) on **MAIN WINDOW**
3. Watch pop-out window

**Expected Results**:
- ✅ Pop-out closes automatically
- ✅ Main window reloads successfully
- ✅ Console shows beforeunload handler triggered

**Key Points to Check**:
- [ ] Pop-out closes before main window unloads
- [ ] No error dialogs appear
- [ ] Main window loads correctly after refresh

#### Test 8: Multi-Monitor Scenario

**Prerequisites**: System with multiple monitors

**Steps**:
1. Open main window on Monitor 1
2. Open pop-out on Model Picker, drag to Monitor 2
3. Resize pop-out to full Monitor 2
4. Make selections in pop-out
5. Watch synchronization across monitors

**Expected Results**:
- ✅ Pop-out operates smoothly on separate monitor
- ✅ State synchronization works across monitors
- ✅ No network/latency issues
- ✅ Both windows visible simultaneously

**Key Points to Check**:
- [ ] Pop-out window position is saved (optional feature)
- [ ] Render performance is smooth
- [ ] No console warnings

#### Test 9: Network Latency Simulation

**Prerequisites**: Chrome DevTools, Pop-out open

**Steps**:
1. Open Pop-out on Model Picker
2. Open DevTools on MAIN WINDOW
3. Set Network throttling to "Slow 3G"
4. In main window, change filter
5. Watch pop-out for delayed updates

**Expected Results**:
- ✅ Pop-out eventually updates (may take 2-3 seconds)
- ✅ UI doesn't freeze or show errors
- ✅ State is eventually consistent

**Key Points to Check**:
- [ ] No UI blocking/freezing
- [ ] User feedback indicates data is loading
- [ ] No duplicate messages sent

#### Test 10: Console Validation

**Steps**:
1. Open pop-out on any panel
2. Open DevTools on BOTH windows
3. Select something in pop-out
4. Check console messages in both windows

**Expected Console Output**:

*Main Window*:
```
[PopOut] Initialized as parent window
[PopOut] Created channel for panel: manufacturer-model-picker
[PopOut] Channel created: panel-manufacturer-model-picker
[PopOut] Received message: PANEL_READY {...}
[PopOut] Received message: PICKER_SELECTION_CHANGE {...}
[PopOut] Sending message: STATE_UPDATE {...}
```

*Pop-Out Window*:
```
[PopOut] Initialized as pop-out for panel: manufacturer-model-picker
[PopOut] Channel created: panel-manufacturer-model-picker
[PopOut] Sending message: PANEL_READY {...}
[PopOut] Received message: STATE_UPDATE {...}
[PopOut] Sending message: PICKER_SELECTION_CHANGE {...}
```

**Key Points to Check**:
- [ ] Channel names match (same in both windows)
- [ ] Messages flow in correct directions
- [ ] No "Cannot send message on closed channel" errors
- [ ] Timestamps are in correct order

### Debugging Tips

1. **Use BroadcastChannel DevTools**:
   - Open DevTools on both windows
   - Set breakpoints in `popOutContextService.ts`
   - Watch message flow in console

2. **Check Memory Leaks**:
   - Open DevTools → Memory tab
   - Take heap snapshot before pop-out
   - Open pop-out, close it
   - Take another snapshot
   - Compare to ensure channels are cleaned up

3. **Monitor Network Tab**:
   - Open DevTools → Network tab on main window
   - Make changes, verify only one API request per change
   - Pop-out should NOT make API calls

4. **Check Window References**:
   - In main window console:
     ```javascript
     // View all open pop-outs (from discover.component.ts)
     // This would only work if you expose it for debugging
     ```

5. **Validate Channel Communication**:
   - Temporarily add logging to `channel.onmessage` handler
   - Verify messages arrive in both directions
   - Check message timing (should be < 100ms)

---

## Summary

**Our pop-out approach is**:
- ✅ Simple and explicit
- ✅ No external layout library
- ✅ Easy to debug and maintain
- ✅ Works across multiple monitors
- ✅ Leverages Angular's observable pattern
- ✅ URL-first state management ensures consistency

**For migration from GoldenLayout**:
1. Remove GoldenLayout imports
2. Create PopOutContextService (or use ours)
3. Add `/panel/:gridId/:panelId/:type` route
4. Create PanelPopoutComponent
5. Update main component to manage pop-outs
6. Update components to detect pop-out context
7. Test thoroughly

---

**Last Updated**: 2026-02-14

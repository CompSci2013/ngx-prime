# Errata: Popout Interface

**Source Files:** `textbook-pages/208-p*.md`
**Validation Date:** 2026-02-14

## Summary
- Total issues found: 5
- Critical (code mismatch): 5
- Minor (formatting/typo): 0
- Outdated (needs update): 0

## Issues

### Issue 1: Route Path Format Mismatch
**Location:** 208-p03.md, Section "parsePopOutRoute"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
// Pop-out windows use a special route format:
// /popout/:gridId/:panelId/:type

export function parsePopOutRoute(url: string): PopOutContext | null {
  // Match /popout/:gridId/:panelId/:type
  const match = url.match(/^\/popout\/([^/]+)\/([^/]+)\/([^/?]+)/);
  ...
}
```

**Actual Code:**
```typescript
// Route format: `/panel/:gridId/:panelId/:type`

export function parsePopOutRoute(url: string): PopOutContext | null {
  const match = url.match(/^\/panel\/([^/]+)\/([^/]+)\/([^/]+)/);
  ...
}
```

The actual code uses `/panel/` prefix instead of `/popout/` prefix.

**Recommended Fix:**
Update the textbook to reflect the actual route format `/panel/:gridId/:panelId/:type`, or update the implementation to use `/popout/` as documented.

---

### Issue 2: Missing `buildPopOutUrl` Utility Function
**Location:** 208-p03.md, Section "Step 208.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export function buildPopOutUrl(
  params: PopOutRouteParams,
  queryString: string = ''
): string {
  return `/popout/${params.gridId}/${params.panelId}/${params.type}${queryString}`;
}
```

**Actual Code:**
The `buildPopOutUrl` function does not exist in `src/app/framework/models/popout.interface.ts`.

**Recommended Fix:**
Add the `buildPopOutUrl` utility function to the actual implementation (using the correct `/panel/` prefix to match `parsePopOutRoute`).

---

### Issue 3: Missing `createPopOutMessage` Utility Function
**Location:** 208-p03.md, Section "Step 208.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export function createPopOutMessage<T>(
  type: PopOutMessageType,
  payload?: T
): PopOutMessage<T> {
  return {
    type,
    payload,
    timestamp: Date.now()
  };
}
```

**Actual Code:**
The `createPopOutMessage` function does not exist in `src/app/framework/models/popout.interface.ts`.

**Recommended Fix:**
Add the `createPopOutMessage` utility function to the actual implementation.

---

### Issue 4: Missing Pop-out Feature Constants
**Location:** 208-p03.md, Section "Step 208.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export const CHART_POPOUT_FEATURES: PopOutWindowFeatures = {
  width: 900,
  height: 600,
  resizable: true,
  scrollbars: false
};

export const PICKER_POPOUT_FEATURES: PopOutWindowFeatures = {
  width: 800,
  height: 700,
  resizable: true,
  scrollbars: true
};

export const FILTER_POPOUT_FEATURES: PopOutWindowFeatures = {
  width: 500,
  height: 600,
  resizable: true,
  scrollbars: true
};
```

**Actual Code:**
These feature constants (`CHART_POPOUT_FEATURES`, `PICKER_POPOUT_FEATURES`, `FILTER_POPOUT_FEATURES`) do not exist in `src/app/framework/models/popout.interface.ts`.

**Recommended Fix:**
Add these default feature constants to the actual implementation.

---

### Issue 5: Missing Channel Name Utilities
**Location:** 208-p03.md, Section "Step 208.1"
**Severity:** Critical
**Type:** Code Mismatch

**Textbook Says:**
```typescript
export const POPOUT_CHANNEL_PREFIX = 'vvroom-popout';

export function getPopOutChannelName(panelId: string): string {
  return `${POPOUT_CHANNEL_PREFIX}-${panelId}`;
}
```

**Actual Code:**
Neither `POPOUT_CHANNEL_PREFIX` constant nor `getPopOutChannelName` function exist in `src/app/framework/models/popout.interface.ts`.

**Recommended Fix:**
Add the channel name constant and utility function to the actual implementation.

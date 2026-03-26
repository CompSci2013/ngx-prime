import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * User preferences service for persisting application state
 *
 * Manages user preferences with localStorage backend, providing:
 * - Panel order persistence (drag-drop reorder)
 * - Collapsed panel state persistence
 * - Graceful handling of quota errors and private browsing
 * - Domain-aware key namespacing
 *
 * **Architecture**:
 * - Uses BehaviorSubject for reactive state management
 * - localStorage for cross-session persistence
 * - Domain-aware keys to support multiple domains (automobiles, physics, etc.)
 * - Graceful degradation when storage unavailable (private browsing, quota exceeded)
 *
 * **Storage Format**:
 * ```
 * localStorage['prefs:automobiles:panelOrder'] = ['query-control', 'statistics-panel-2', ...]
 * localStorage['prefs:automobiles:collapsedPanels'] = ['query-control', 'statistics-panel-2']
 * ```
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private prefs: UserPreferencesService) {}
 *
 * // Get current panel order
 * this.prefs.getPanelOrder().subscribe(order => {
 *   this.panelOrder = order;
 * });
 *
 * // Save new order after drag-drop
 * this.prefs.savePanelOrder(newOrder);
 *
 * // Get collapsed panels
 * this.prefs.getCollapsedPanels().subscribe(collapsed => {
 *   // update UI
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  /**
   * Default panel order when localStorage is empty
   * @private
   */
  private readonly DEFAULT_PANEL_ORDER = [
    'query-control',
    'query-panel',
    'manufacturer-model-picker',
    'statistics-panel-2',
    'basic-results-table'
  ];

  /**
   * Default collapsed panels (none by default)
   * @private
   */
  private readonly DEFAULT_COLLAPSED_PANELS: string[] = [];

  /**
   * Current domain for key namespacing
   * Extracted from current route (e.g., 'automobiles', 'physics')
   * @private
   */
  private currentDomain = this.extractCurrentDomain();

  /**
   * BehaviorSubject for panel order state
   * Emits current order immediately on subscription
   * @private
   */
  private panelOrderSubject = new BehaviorSubject<string[]>(this.loadPanelOrder());

  /**
   * BehaviorSubject for collapsed panels state
   * Emits current collapsed panels immediately on subscription
   * @private
   */
  private collapsedPanelsSubject = new BehaviorSubject<string[]>(this.loadCollapsedPanels());

  /**
   * Storage availability flag
   * Set to false if localStorage is unavailable (private browsing, quota exceeded)
   * @private
   */
  private storageAvailable = this.checkStorageAvailable();

  /**
   * File-based API availability flag
   * Set to true if API is available, false otherwise
   * @private
   */
  private apiAvailable = false;

  /**
   * Full preferences object for file-based storage
   * @private
   */
  private fullPreferences: any = {};

  /**
   * User ID for backend preferences service
   * Hardcoded to 'default' for now (no auth yet)
   * @private
   */
  private userId = 'default';

  constructor(private http: HttpClient) {
    // Try loading from backend API first, fall back to localStorage
    this.loadFromBackendApi().pipe(
      timeout(5000), // 5 second timeout
      catchError(() => {
        // Fall back to localStorage
        return of(this.loadFromLocalStorage());
      })
    ).subscribe(prefs => {
      this.fullPreferences = prefs || {};
      this.initializeFromPreferences(this.fullPreferences);
    });
  }

  /**
   * Get panel order observable
   * Emits current order immediately, then on every change
   *
   * @returns Observable of panel order array
   */
  getPanelOrder(): Observable<string[]> {
    return this.panelOrderSubject.asObservable();
  }

  /**
   * Get collapsed panels observable
   * Emits current collapsed panels immediately, then on every change
   *
   * @returns Observable of collapsed panel IDs
   */
  getCollapsedPanels(): Observable<string[]> {
    return this.collapsedPanelsSubject.asObservable();
  }

  /**
   * Save panel order to preferences
   * Called after user drags panels to reorder
   *
   * @param order - New panel order array
   */
  savePanelOrder(order: string[]): void {
    // Update subject (triggers subscribers)
    this.panelOrderSubject.next(order);

    // Update full preferences object
    const domain = this.currentDomain;
    if (!this.fullPreferences[domain]) {
      this.fullPreferences[domain] = {};
    }
    this.fullPreferences[domain].panelOrder = order;

    // Try saving to backend API first
    this.savePreferencesToBackend(this.fullPreferences).pipe(
      catchError(() => {
        // Fall back to localStorage
        this.saveToLocalStorage('panelOrder', order);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Save collapsed panels state to preferences
   * Called when user collapses/expands panels
   *
   * @param panels - Array of collapsed panel IDs
   */
  saveCollapsedPanels(panels: string[]): void {
    // Update subject (triggers subscribers)
    this.collapsedPanelsSubject.next(panels);

    // Update full preferences object
    const domain = this.currentDomain;
    if (!this.fullPreferences[domain]) {
      this.fullPreferences[domain] = {};
    }
    this.fullPreferences[domain].collapsedPanels = panels;

    // Try saving to backend API first
    this.savePreferencesToBackend(this.fullPreferences).pipe(
      catchError(() => {
        // Fall back to localStorage
        this.saveToLocalStorage('collapsedPanels', panels);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Reset preferences for current domain
   * Returns to default panel order and collapsed state
   *
   * @param domain - Optional domain to reset (defaults to current domain)
   */
  reset(domain?: string): void {
    const targetDomain = domain || this.currentDomain;

    if (this.storageAvailable) {
      try {
        const orderKey = this.getPrefKey('panelOrder', targetDomain);
        const collapsedKey = this.getPrefKey('collapsedPanels', targetDomain);

        localStorage.removeItem(orderKey);
        localStorage.removeItem(collapsedKey);
      } catch (e) {
        // Ignore errors on reset
      }
    }

    // Update subjects to defaults
    this.panelOrderSubject.next(this.DEFAULT_PANEL_ORDER);
    this.collapsedPanelsSubject.next(this.DEFAULT_COLLAPSED_PANELS);
  }

  /**
   * Load panel order from localStorage
   * Falls back to defaults if not found or if storage unavailable
   *
   * @private
   * @returns Panel order array
   */
  private loadPanelOrder(): string[] {
    if (!this.storageAvailable) {
      return this.DEFAULT_PANEL_ORDER;
    }

    try {
      const key = this.getPrefKey('panelOrder');
      const stored = localStorage.getItem(key);

      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate it's an array
        if (Array.isArray(parsed)) {
          // Merge any new panels from defaults that aren't in stored order
          // New panels are appended at their default position relative to existing panels
          return this.mergePanelOrder(parsed, this.DEFAULT_PANEL_ORDER);
        }
      }
    } catch (e) {
      // JSON parse error or other issues - use default
    }

    return this.DEFAULT_PANEL_ORDER;
  }

  /**
   * Merge stored panel order with default order to include new panels
   * and remove panels that no longer exist in defaults.
   * New panels are inserted at their relative position from defaults.
   *
   * @private
   * @param stored - User's stored panel order
   * @param defaults - Default panel order (source of truth for valid panels)
   * @returns Merged panel order
   */
  private mergePanelOrder(stored: string[], defaults: string[]): string[] {
    const defaultsSet = new Set(defaults);

    // Filter out panels that no longer exist in defaults
    const result = stored.filter(panelId => defaultsSet.has(panelId));
    const resultSet = new Set(result);

    // Find new panels that aren't in stored order
    for (let i = 0; i < defaults.length; i++) {
      const panelId = defaults[i];
      if (!resultSet.has(panelId)) {
        // Find the best insertion position based on neighboring panels in defaults
        let insertIndex = result.length; // Default to end

        // Look for the previous panel in defaults that exists in result
        for (let j = i - 1; j >= 0; j--) {
          const prevPanel = defaults[j];
          const prevIndex = result.indexOf(prevPanel);
          if (prevIndex !== -1) {
            insertIndex = prevIndex + 1;
            break;
          }
        }

        result.splice(insertIndex, 0, panelId);
        resultSet.add(panelId);
      }
    }

    return result;
  }

  /**
   * Load collapsed panels from localStorage
   * Falls back to empty array (no panels collapsed) if not found
   *
   * @private
   * @returns Array of collapsed panel IDs
   */
  private loadCollapsedPanels(): string[] {
    if (!this.storageAvailable) {
      return this.DEFAULT_COLLAPSED_PANELS;
    }

    try {
      const key = this.getPrefKey('collapsedPanels');
      const stored = localStorage.getItem(key);

      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate it's an array
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      // JSON parse error or other issues - use default
    }

    return this.DEFAULT_COLLAPSED_PANELS;
  }

  /**
   * Load preferences from backend API
   * Attempts to fetch preferences from `/api/preferences/v1/:userId`
   *
   * @private
   * @returns Observable of preferences object
   */
  private loadFromBackendApi(): Observable<any> {
    return this.http.get<any>(`/api/preferences/v1/${this.userId}`).pipe(
      catchError((error) => {
        if (isDevMode()) {
          console.debug('[UserPreferencesService] Backend API not available, falling back to localStorage');
        }
        throw error;
      })
    );
  }

  /**
   * Save preferences to backend API
   * Sends preferences object to `/api/preferences/v1/:userId`
   *
   * @private
   * @param prefs - Full preferences object to save
   * @returns Observable of save result
   */
  private savePreferencesToBackend(prefs: any): Observable<any> {
    return this.http.post<any>(`/api/preferences/v1/${this.userId}`, prefs).pipe(
      catchError((error) => {
        if (isDevMode()) {
          console.debug('[UserPreferencesService] Failed to save to backend API:', error);
        }
        throw error;
      })
    );
  }

  /**
   * Load preferences from localStorage
   * Returns full preferences object with domain-aware keys
   *
   * @private
   * @returns Full preferences object
   */
  private loadFromLocalStorage(): any {
    const prefs: any = {};

    // Try to load preferences for each domain
    ['automobiles', 'physics', 'agriculture', 'chemistry', 'math'].forEach(domain => {
      const orderKey = this.getPrefKey('panelOrder', domain);
      const collapsedKey = this.getPrefKey('collapsedPanels', domain);

      try {
        const orderStr = localStorage.getItem(orderKey);
        const collapsedStr = localStorage.getItem(collapsedKey);

        prefs[domain] = {
          panelOrder: orderStr ? JSON.parse(orderStr) : this.DEFAULT_PANEL_ORDER,
          collapsedPanels: collapsedStr ? JSON.parse(collapsedStr) : this.DEFAULT_COLLAPSED_PANELS
        };
      } catch (e) {
        // If parsing fails, use defaults for this domain
        prefs[domain] = {
          panelOrder: this.DEFAULT_PANEL_ORDER,
          collapsedPanels: this.DEFAULT_COLLAPSED_PANELS
        };
      }
    });

    return prefs;
  }

  /**
   * Save preferences to localStorage
   * Saves a specific preference (panelOrder or collapsedPanels) for current domain
   *
   * @private
   * @param preference - Preference name ('panelOrder' or 'collapsedPanels')
   * @param value - Value to save
   */
  private saveToLocalStorage(preference: string, value: any): void {
    if (this.storageAvailable) {
      try {
        const key = this.getPrefKey(preference);
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        this.handleStorageError(e);
      }
    }
  }

  /**
   * Initialize service state from loaded preferences
   * Updates BehaviorSubjects with preferences for current domain
   *
   * @private
   * @param prefs - Full preferences object
   */
  private initializeFromPreferences(prefs: any): void {
    const domain = this.currentDomain;
    const domainPrefs = prefs[domain];

    if (domainPrefs) {
      // Merge stored panel order with defaults to include any new panels
      const storedOrder = domainPrefs.panelOrder;
      const mergedOrder = storedOrder
        ? this.mergePanelOrder(storedOrder, this.DEFAULT_PANEL_ORDER)
        : this.DEFAULT_PANEL_ORDER;
      this.panelOrderSubject.next(mergedOrder);
      this.collapsedPanelsSubject.next(domainPrefs.collapsedPanels || this.DEFAULT_COLLAPSED_PANELS);
    } else {
      this.panelOrderSubject.next(this.DEFAULT_PANEL_ORDER);
      this.collapsedPanelsSubject.next(this.DEFAULT_COLLAPSED_PANELS);
    }
  }

  /**
   * Get storage key with domain prefix
   * Keys are namespaced per domain for multi-domain support
   *
   * @private
   * @param preference - Preference name (e.g., 'panelOrder')
   * @param domain - Optional domain (defaults to current domain)
   * @returns Namespaced storage key
   */
  private getPrefKey(preference: string, domain?: string): string {
    const targetDomain = domain || this.currentDomain;
    return `prefs:${targetDomain}:${preference}`;
  }

  /**
   * Check if localStorage is available
   * Returns false in private browsing mode or quota exceeded
   *
   * @private
   * @returns True if localStorage is available and writable
   */
  private checkStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      // Private browsing or quota exceeded
      return false;
    }
  }

  /**
   * Handle storage errors gracefully
   * Logs error and disables storage for future operations
   *
   * @private
   * @param error - Error from localStorage operation
   */
  private handleStorageError(error: any): void {
    // Disable storage for future operations
    this.storageAvailable = false;

    // Log in debug mode only (don't pollute console in production)
    if (isDevMode()) {
      console.debug('[UserPreferencesService] Storage error:', error);
    }
  }

  /**
   * Extract current domain from URL or route
   * Returns 'automobiles' from '/automobiles/discover'
   * Returns 'physics' from '/physics/discover'
   *
   * @private
   * @returns Current domain name
   */
  private extractCurrentDomain(): string {
    // Get domain from current URL path
    const path = window.location.pathname;

    // Match patterns like /automobiles/, /physics/, etc.
    const match = path.match(/\/([a-z]+)\//);
    if (match && match[1]) {
      return match[1];
    }

    // Default to 'automobiles' if extraction fails
    return 'automobiles';
  }
}

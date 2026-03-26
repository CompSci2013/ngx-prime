import { InjectionToken } from '@angular/core';

/**
 * Injection token to signal that the current component context is a pop-out window.
 * Used by services (like ResourceManagementService) to adjust behavior when provided
 * by a pop-out component (e.g., disabling auto-fetch).
 */
export const IS_POPOUT_TOKEN = new InjectionToken<boolean>('IS_POPOUT_TOKEN');

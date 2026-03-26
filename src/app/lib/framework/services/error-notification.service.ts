import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  ErrorNotification,
  ErrorCategory,
  ErrorSeverity,
  ErrorDisplayOptions,
  DEFAULT_ERROR_DISPLAY_OPTIONS,
  createErrorNotificationFromHttpError,
  createErrorNotificationFromError
} from '../models/error-notification.interface';

/**
 * Error notification service
 *
 * Centralized error notification system using PrimeNG Toast for user-facing
 * error messages. Provides error deduplication, categorization, and
 * consistent error display.
 *
 * @example
 * ```typescript
 * // Show HTTP error
 * this.errorNotification.showHttpError(httpError);
 *
 * // Show custom error
 * this.errorNotification.showError(
 *   'Operation Failed',
 *   'Unable to save changes. Please try again.'
 * );
 *
 * // Show warning
 * this.errorNotification.showWarning(
 *   'Data Modified',
 *   'Some fields were automatically corrected.'
 * );
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorNotificationService {
  /**
   * Recent error messages for deduplication
   *
   * Maps error signature (hash of message) to timestamp. Used to suppress
   * duplicate errors shown within DEDUPLICATION_WINDOW milliseconds.
   *
   * @private
   */
  private recentErrors = new Map<string, number>();

  /**
   * Deduplication window in milliseconds
   *
   * Errors with the same signature within this window are suppressed
   * to prevent notification spam from repeated failures.
   *
   * @private
   */
  private readonly DEDUPLICATION_WINDOW = 3000; // 3 seconds

  /**
   * Cleanup interval for recent errors map
   *
   * Interval at which expired entries (older than DEDUPLICATION_WINDOW)
   * are removed from recentErrors to prevent unbounded memory growth.
   *
   * @private
   */
  private readonly CLEANUP_INTERVAL = 10000; // 10 seconds

  /**
   * Cleanup timer reference
   *
   * Holds the setInterval timer ID for cleanup process.
   * Cleared on service destroy to prevent memory leaks.
   *
   * @private
   */
  private cleanupTimer?: ReturnType<typeof setInterval>;

  /**
   * Constructor for dependency injection
   *
   * @param messageService - PrimeNG MessageService for displaying toast notifications
   */
  constructor(private messageService: MessageService) {
    this.startCleanupTimer();
  }

  /**
   * Show error notification
   *
   * @param summary - Brief error summary
   * @param detail - Detailed error message
   * @param options - Display options
   */
  showError(
    summary: string,
    detail: string,
    options?: ErrorDisplayOptions
  ): void {
    this.show(
      {
        category: ErrorCategory.APPLICATION,
        severity: 'error',
        summary,
        detail,
        timestamp: new Date().toISOString()
      },
      options
    );
  }

  /**
   * Show warning notification
   *
   * @param summary - Brief warning summary
   * @param detail - Detailed warning message
   * @param options - Display options
   */
  showWarning(
    summary: string,
    detail: string,
    options?: ErrorDisplayOptions
  ): void {
    this.show(
      {
        category: ErrorCategory.APPLICATION,
        severity: 'warn',
        summary,
        detail,
        timestamp: new Date().toISOString()
      },
      options
    );
  }

  /**
   * Show info notification
   *
   * @param summary - Brief info summary
   * @param detail - Detailed info message
   * @param options - Display options
   */
  showInfo(
    summary: string,
    detail: string,
    options?: ErrorDisplayOptions
  ): void {
    this.show(
      {
        category: ErrorCategory.APPLICATION,
        severity: 'info',
        summary,
        detail,
        timestamp: new Date().toISOString()
      },
      options
    );
  }

  /**
   * Show success notification
   *
   * @param summary - Brief success summary
   * @param detail - Detailed success message
   * @param options - Display options
   */
  showSuccess(
    summary: string,
    detail: string,
    options?: ErrorDisplayOptions
  ): void {
    this.show(
      {
        category: ErrorCategory.APPLICATION,
        severity: 'success',
        summary,
        detail,
        timestamp: new Date().toISOString()
      },
      options
    );
  }

  /**
   * Show HTTP error notification
   *
   * Automatically categorizes and formats HTTP errors from the interceptor
   *
   * @param error - HTTP error object from interceptor
   * @param options - Display options
   */
  showHttpError(error: any, options?: ErrorDisplayOptions): void {
    const notification = createErrorNotificationFromHttpError(error);
    this.show(notification, options);
  }

  /**
   * Show generic error notification
   *
   * Automatically categorizes and formats generic JavaScript errors
   *
   * @param error - Error object
   * @param options - Display options
   */
  showGenericError(error: Error, options?: ErrorDisplayOptions): void {
    const notification = createErrorNotificationFromError(error);
    this.show(notification, options);
  }

  /**
   * Show custom error notification
   *
   * @param notification - Error notification object
   * @param options - Display options
   */
  show(
    notification: ErrorNotification,
    options?: ErrorDisplayOptions
  ): void {
    // Check for duplicate
    if (this.isDuplicate(notification)) {
      console.debug('Suppressing duplicate error:', notification.summary);
      return;
    }

    // Record error for deduplication
    this.recordError(notification);

    // Merge options with defaults
    const displayOptions: ErrorDisplayOptions = {
      ...DEFAULT_ERROR_DISPLAY_OPTIONS,
      ...options
    };

    // Display toast notification
    this.messageService.add({
      severity: notification.severity,
      summary: notification.summary,
      detail: notification.detail,
      life: displayOptions.life,
      closable: displayOptions.closable,
      sticky: displayOptions.sticky,
      styleClass: displayOptions.styleClass,
      key: displayOptions.key
    });

    // Log error details
    this.logError(notification);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.messageService.clear();
  }

  /**
   * Clear notifications by key
   *
   * @param key - Toast key to clear
   */
  clear(key?: string): void {
    this.messageService.clear(key);
  }

  /**
   * Check if error is duplicate
   *
   * @param notification - Error notification
   * @returns True if duplicate within deduplication window
   */
  private isDuplicate(notification: ErrorNotification): boolean {
    const signature = this.getErrorSignature(notification);
    const lastTime = this.recentErrors.get(signature);

    if (!lastTime) {
      return false;
    }

    const now = Date.now();
    return now - lastTime < this.DEDUPLICATION_WINDOW;
  }

  /**
   * Record error for deduplication tracking
   *
   * @param notification - Error notification
   */
  private recordError(notification: ErrorNotification): void {
    const signature = this.getErrorSignature(notification);
    this.recentErrors.set(signature, Date.now());
  }

  /**
   * Generate error signature for deduplication
   *
   * @param notification - Error notification
   * @returns Unique signature string
   */
  private getErrorSignature(notification: ErrorNotification): string {
    // Combine category, summary, and detail for signature
    return `${notification.category}:${notification.summary}:${notification.detail}`;
  }

  /**
   * Log error details for debugging
   *
   * @param notification - Error notification
   */
  private logError(notification: ErrorNotification): void {
    const logData: any = {
      category: notification.category,
      severity: notification.severity,
      summary: notification.summary,
      detail: notification.detail,
      timestamp: notification.timestamp || new Date().toISOString()
    };

    // Add optional fields if present
    if (notification.code) {
      logData.code = notification.code;
    }
    if (notification.url) {
      logData.url = notification.url;
    }
    if (notification.status) {
      logData.status = notification.status;
    }

    // Log based on severity
    switch (notification.severity) {
      case 'error':
        console.error('[Error Notification]', logData);
        if (notification.originalError) {
          console.error('Original error:', notification.originalError);
        }
        break;
      case 'warn':
        console.warn('[Warning Notification]', logData);
        break;
      case 'info':
        console.info('[Info Notification]', logData);
        break;
      case 'success':
        console.log('[Success Notification]', logData);
        break;
    }
  }

  /**
   * Start cleanup timer for recent errors map
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupRecentErrors();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired entries from recent errors map
   */
  private cleanupRecentErrors(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    this.recentErrors.forEach((timestamp, key) => {
      if (now - timestamp > this.DEDUPLICATION_WINDOW * 2) {
        expiredKeys.push(key);
      }
    });

    // Remove expired entries
    expiredKeys.forEach((key) => {
      this.recentErrors.delete(key);
    });
  }

  /**
   * Stop cleanup timer (for cleanup)
   */
  ngOnDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

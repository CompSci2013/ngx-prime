import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorNotificationService } from './error-notification.service';
import { ErrorCategory } from '../models/error-notification.interface';

/**
 * Global error handler
 *
 * Catches all unhandled errors in the Angular application and displays
 * user-friendly error messages using the ErrorNotificationService.
 *
 * This handler:
 * - Intercepts all unhandled exceptions
 * - Categorizes errors by type (HTTP, Promise rejection, component error, etc.)
 * - Displays appropriate user-facing messages
 * - Logs detailed error information for debugging
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * providers: [
 *   {
 *     provide: ErrorHandler,
 *     useClass: GlobalErrorHandler
 *   }
 * ]
 * ```
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  /**
   * ErrorNotificationService instance
   *
   * Lazy-loaded via getter to avoid circular dependency issues.
   * Service is requested from injector on first access and cached
   * by Angular's dependency injection system.
   *
   * @private
   */
  private get errorNotificationService(): ErrorNotificationService {
    return this.injector.get(ErrorNotificationService);
  }

  /**
   * Angular injector for lazy-loading ErrorNotificationService
   *
   * Stored to allow late binding of ErrorNotificationService,
   * which helps avoid circular dependency issues between
   * GlobalErrorHandler and ErrorNotificationService.
   *
   * @private
   */
  constructor(private injector: Injector) {}

  /**
   * Handle error
   *
   * Main error handling method called by Angular for all unhandled errors
   *
   * @param error - The error object
   */
  handleError(error: any): void {
    // Extract actual error from Angular's wrapper
    const actualError = this.unwrapError(error);

    // Log to console for debugging
    this.logErrorToConsole(actualError);

    // Handle different error types
    if (this.isHttpError(actualError)) {
      this.handleHttpError(actualError);
    } else if (this.isChunkLoadError(actualError)) {
      this.handleChunkLoadError(actualError);
    } else if (this.isPromiseRejection(error)) {
      this.handlePromiseRejection(actualError);
    } else {
      this.handleGenericError(actualError);
    }
  }

  /**
   * Unwrap error from Angular's ErrorEvent wrapper
   *
   * @param error - Potentially wrapped error
   * @returns Actual error object
   */
  private unwrapError(error: any): any {
    // Angular wraps errors in rejection field
    if (error && error.rejection) {
      return error.rejection;
    }

    // Angular wraps errors in error field
    if (error && error.error) {
      return error.error;
    }

    return error;
  }

  /**
   * Check if error is HTTP error
   *
   * @param error - Error object
   * @returns True if HTTP error
   */
  private isHttpError(error: any): boolean {
    return error instanceof HttpErrorResponse;
  }

  /**
   * Check if error is chunk load error (lazy-loaded module)
   *
   * @param error - Error object
   * @returns True if chunk load error
   */
  private isChunkLoadError(error: any): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('loading chunk') ||
      message.includes('failed to fetch') ||
      message.includes('dynamically imported module')
    );
  }

  /**
   * Check if error is promise rejection
   *
   * @param error - Error object
   * @returns True if promise rejection
   */
  private isPromiseRejection(error: any): boolean {
    return error && error.promise && error.rejection;
  }

  /**
   * Handle HTTP errors
   *
   * HTTP errors are already handled by the HTTP interceptor, but may
   * bubble up if not caught in component subscriptions.
   *
   * @param error - HTTP error response
   */
  private handleHttpError(error: HttpErrorResponse): void {
    // Check if error was already formatted by interceptor
    if (error.error && error.error.code) {
      // Already formatted by interceptor
      this.errorNotificationService.showHttpError(error.error);
    } else {
      // Not formatted - format now
      this.errorNotificationService.showHttpError({
        code: 'HTTP_ERROR',
        message: error.message || 'An HTTP error occurred',
        status: error.status,
        statusText: error.statusText,
        url: error.url || undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle chunk load errors (lazy-loaded modules)
   *
   * These occur when lazy-loaded JavaScript chunks fail to load,
   * typically due to network issues or deployments.
   *
   * @param error - Chunk load error
   */
  private handleChunkLoadError(error: Error): void {
    this.errorNotificationService.show(
      {
        category: ErrorCategory.NETWORK,
        severity: 'error',
        summary: 'Loading Error',
        detail:
          'Failed to load application module. Please refresh the page. ' +
          'If the problem persists, clear your browser cache.',
        code: 'CHUNK_LOAD_ERROR',
        timestamp: new Date().toISOString(),
        originalError: error
      },
      {
        sticky: true, // Don't auto-hide - requires user action
        life: 0
      }
    );
  }

  /**
   * Handle promise rejections
   *
   * Unhandled promise rejections that weren't caught with .catch()
   *
   * @param error - Rejected promise value
   */
  private handlePromiseRejection(error: any): void {
    // If it's an HTTP error, handle as HTTP
    if (this.isHttpError(error)) {
      this.handleHttpError(error);
      return;
    }

    // Generic promise rejection
    this.errorNotificationService.show(
      {
        category: ErrorCategory.APPLICATION,
        severity: 'error',
        summary: 'Operation Failed',
        detail:
          error?.message ||
          'An asynchronous operation failed. Please try again.',
        code: 'PROMISE_REJECTION',
        timestamp: new Date().toISOString(),
        originalError: error
      },
      {
        life: 7000 // Longer display for async errors
      }
    );
  }

  /**
   * Handle generic errors
   *
   * All other unhandled errors (component errors, TypeError, etc.)
   *
   * @param error - Error object
   */
  private handleGenericError(error: any): void {
    const errorMessage =
      error?.message || error?.toString() || 'An unexpected error occurred';

    // Check for known error patterns
    const isTypeError = error instanceof TypeError;
    const isReferenceError = error instanceof ReferenceError;

    let detail = errorMessage;
    if (isTypeError || isReferenceError) {
      detail +=
        ' This is likely a programming error. Please report this issue.';
    }

    this.errorNotificationService.show(
      {
        category: ErrorCategory.CLIENT,
        severity: 'error',
        summary: 'Application Error',
        detail,
        code: 'UNHANDLED_ERROR',
        timestamp: new Date().toISOString(),
        originalError: error
      },
      {
        sticky: true, // Keep visible for debugging
        life: 0
      }
    );
  }

  /**
   * Log error to console for debugging
   *
   * @param error - Error object
   */
  private logErrorToConsole(error: any): void {
    const timestamp = new Date().toISOString();

    console.group(`[Global Error Handler] ${timestamp}`);
    console.error('Error caught by global handler:', error);

    // Log stack trace if available
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }

    // Log additional context
    console.error('Error type:', error?.constructor?.name || typeof error);

    // Log location information
    console.error('Location:', {
      url: window.location.href,
      route: window.location.pathname
    });

    console.groupEnd();

    // In production, you might want to send errors to a logging service
    // this.sendErrorToLoggingService(error);
  }

  /**
   * Send error to external logging service (stub for future implementation)
   *
   * @param error - Error object
   */
  private sendErrorToLoggingService(error: any): void {
    // TODO: Implement external error logging (e.g., Sentry, LogRocket)
    // Example:
    // this.loggerService.logError({
    //   error: error,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    //   userAgent: navigator.userAgent
    // });
  }
}

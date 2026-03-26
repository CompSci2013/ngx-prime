/**
 * Error notification interfaces and types
 *
 * Provides comprehensive error categorization and notification configuration
 * for user-facing error messages using PrimeNG Toast.
 */

/**
 * Error category enumeration
 *
 * Categorizes errors by their source and nature for appropriate handling
 * and user messaging.
 */
export enum ErrorCategory {
  /**
   * Network-related errors (connection issues, timeouts, etc.)
   */
  NETWORK = 'NETWORK',

  /**
   * Validation errors (invalid input, business rule violations)
   */
  VALIDATION = 'VALIDATION',

  /**
   * Authorization/authentication errors (401, 403)
   */
  AUTHORIZATION = 'AUTHORIZATION',

  /**
   * Server-side errors (5xx status codes)
   */
  SERVER = 'SERVER',

  /**
   * Client-side errors (JavaScript errors, component errors)
   */
  CLIENT = 'CLIENT',

  /**
   * Application-level errors (business logic, state errors)
   */
  APPLICATION = 'APPLICATION',

  /**
   * Unknown or uncategorized errors
   */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Error severity levels
 *
 * Maps to PrimeNG Toast severity levels for visual feedback
 */
export type ErrorSeverity = 'success' | 'info' | 'warn' | 'error';

/**
 * Error notification data structure
 *
 * Contains all information needed to display an error to the user
 */
export interface ErrorNotification {
  /**
   * Error category for categorization and routing
   */
  category: ErrorCategory;

  /**
   * Display severity (maps to PrimeNG Toast severity)
   */
  severity: ErrorSeverity;

  /**
   * Brief error summary (shown as toast title)
   */
  summary: string;

  /**
   * Detailed error message (shown as toast body)
   */
  detail: string;

  /**
   * Optional error code for debugging
   */
  code?: string;

  /**
   * Optional timestamp of when error occurred
   */
  timestamp?: string;

  /**
   * Optional URL where error occurred
   */
  url?: string;

  /**
   * Optional HTTP status code (for network errors)
   */
  status?: number;

  /**
   * Original error object (for logging/debugging)
   */
  originalError?: any;
}

/**
 * Error display options
 *
 * Configuration for how errors should be displayed to users
 */
export interface ErrorDisplayOptions {
  /**
   * Auto-hide duration in milliseconds
   * Set to 0 or null to prevent auto-hide
   * Default: 5000 (5 seconds)
   */
  life?: number;

  /**
   * Whether to show close button
   * Default: true
   */
  closable?: boolean;

  /**
   * Whether to show in sticky mode (no auto-hide)
   * Default: false
   */
  sticky?: boolean;

  /**
   * Custom CSS class for the toast
   */
  styleClass?: string;

  /**
   * Toast position key
   * Default: 'top-right'
   */
  key?: string;
}

/**
 * Default error display options
 */
export const DEFAULT_ERROR_DISPLAY_OPTIONS: ErrorDisplayOptions = {
  life: 5000,
  closable: true,
  sticky: false,
  key: 'app-toast'
};

/**
 * Error severity mapping configuration
 *
 * Maps error categories to default severity levels
 */
export const ERROR_CATEGORY_SEVERITY_MAP: Record<ErrorCategory, ErrorSeverity> = {
  [ErrorCategory.NETWORK]: 'error',
  [ErrorCategory.VALIDATION]: 'warn',
  [ErrorCategory.AUTHORIZATION]: 'warn',
  [ErrorCategory.SERVER]: 'error',
  [ErrorCategory.CLIENT]: 'error',
  [ErrorCategory.APPLICATION]: 'error',
  [ErrorCategory.UNKNOWN]: 'error'
};

/**
 * HTTP status code to error category mapping
 *
 * @param status - HTTP status code
 * @returns Appropriate error category
 */
export function getErrorCategoryFromStatus(status: number): ErrorCategory {
  if (status === 0) {
    return ErrorCategory.NETWORK;
  }

  if (status === 401 || status === 403) {
    return ErrorCategory.AUTHORIZATION;
  }

  if (status === 400 || status === 422) {
    return ErrorCategory.VALIDATION;
  }

  if (status >= 500 && status < 600) {
    return ErrorCategory.SERVER;
  }

  if (status >= 400 && status < 500) {
    return ErrorCategory.CLIENT;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Error code to error category mapping
 *
 * @param code - Error code string
 * @returns Appropriate error category
 */
export function getErrorCategoryFromCode(code: string): ErrorCategory {
  const upperCode = code.toUpperCase();

  if (upperCode.includes('NETWORK') || upperCode.includes('TIMEOUT')) {
    return ErrorCategory.NETWORK;
  }

  if (upperCode.includes('VALIDATION') || upperCode.includes('INVALID')) {
    return ErrorCategory.VALIDATION;
  }

  if (
    upperCode.includes('UNAUTHORIZED') ||
    upperCode.includes('FORBIDDEN') ||
    upperCode.includes('AUTH')
  ) {
    return ErrorCategory.AUTHORIZATION;
  }

  if (upperCode.includes('SERVER') || upperCode.includes('INTERNAL')) {
    return ErrorCategory.SERVER;
  }

  if (upperCode.includes('CLIENT')) {
    return ErrorCategory.CLIENT;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Create error notification from HTTP error
 *
 * @param error - HTTP error object (from interceptor)
 * @returns ErrorNotification object
 */
export function createErrorNotificationFromHttpError(error: any): ErrorNotification {
  const status = error.status || 0;
  const code = error.code || 'UNKNOWN_ERROR';
  const category = getErrorCategoryFromStatus(status);
  const severity = ERROR_CATEGORY_SEVERITY_MAP[category];

  return {
    category,
    severity,
    summary: getSummaryForCategory(category),
    detail: error.message || 'An unexpected error occurred',
    code,
    timestamp: error.timestamp,
    url: error.url,
    status,
    originalError: error
  };
}

/**
 * Create error notification from generic error
 *
 * @param error - Generic error object
 * @returns ErrorNotification object
 */
export function createErrorNotificationFromError(error: Error): ErrorNotification {
  const code = (error as any).code;
  const category = code
    ? getErrorCategoryFromCode(code)
    : ErrorCategory.CLIENT;
  const severity = ERROR_CATEGORY_SEVERITY_MAP[category];

  return {
    category,
    severity,
    summary: getSummaryForCategory(category),
    detail: error.message || 'An unexpected error occurred',
    code,
    timestamp: new Date().toISOString(),
    originalError: error
  };
}

/**
 * Get user-friendly summary for error category
 *
 * @param category - Error category
 * @returns Summary text
 */
function getSummaryForCategory(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection Error';
    case ErrorCategory.VALIDATION:
      return 'Validation Error';
    case ErrorCategory.AUTHORIZATION:
      return 'Access Denied';
    case ErrorCategory.SERVER:
      return 'Server Error';
    case ErrorCategory.CLIENT:
      return 'Application Error';
    case ErrorCategory.APPLICATION:
      return 'Operation Failed';
    case ErrorCategory.UNKNOWN:
    default:
      return 'Error';
  }
}

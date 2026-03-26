/**
 * Generic API response interface for paginated endpoints
 *
 * @template TData - The type of data items in the results array
 *
 * @example
 * ```typescript
 * interface Vehicle {
 *   id: string;
 *   manufacturer: string;
 *   model: string;
 * }
 *
 * const response: ApiResponse<Vehicle> = {
 *   results: [...],
 *   total: 1234,
 *   page: 1,
 *   size: 20,
 *   totalPages: 62
 * };
 * ```
 */
export interface ApiResponse<TData> {
  /**
   * Array of result items for the current page
   */
  results: TData[];

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  size: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Optional statistics data (domain-specific)
   */
  statistics?: any;
}

/**
 * Generic error response from API
 */
export interface ApiErrorResponse {
  /**
   * Success flag (always false for errors)
   */
  success: false;

  /**
   * Error details
   */
  error: {
    /**
     * Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
     */
    code: string;

    /**
     * Human-readable error message
     */
    message: string;

    /**
     * Optional additional error details
     */
    details?: Record<string, any>;
  };
}

/**
 * Generic success response wrapper
 */
export interface ApiSuccessResponse<TData> {
  /**
   * Success flag (always true for successful responses)
   */
  success: true;

  /**
   * Response data
   */
  data: TData;
}

/**
 * Standard API response type (success or error)
 */
export type StandardApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

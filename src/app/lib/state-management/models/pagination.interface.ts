/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  /**
   * Page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  size: number;
}

/**
 * Pagination metadata from API responses
 */
export interface PaginationMetadata {
  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  size: number;

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there are more pages after current page
   */
  hasMore: boolean;
}

/**
 * Sorting parameters for API requests
 */
export interface SortParams {
  /**
   * Field to sort by
   */
  sortBy?: string;

  /**
   * Sort direction
   */
  sortOrder?: 'asc' | 'desc';
}

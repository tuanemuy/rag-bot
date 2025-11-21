/**
 * Pagination utility types
 *
 * Common types for pagination across the application.
 */

/**
 * Pagination parameters
 */
export type Pagination = {
  page: number; // Current page (1-indexed)
  limit: number; // Items per page
};

/**
 * Pagination result
 */
export type PaginationResult<T> = {
  items: T[]; // Items for current page
  count: number; // Total item count
};

/**
 * Create pagination parameters with defaults
 */
export function createPagination(page = 1, limit = 20): Pagination {
  return { page, limit };
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(count: number, limit: number): number {
  return Math.ceil(count / limit);
}

/**
 * Calculate offset for database queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

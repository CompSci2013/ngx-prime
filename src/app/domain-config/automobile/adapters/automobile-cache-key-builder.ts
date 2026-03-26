/**
 * Automobile Domain - Cache Key Builder
 *
 * Implements ICacheKeyBuilder for building cache keys from filter objects.
 * Used by RequestCoordinatorService for caching API responses.
 *
 * Domain: Automobile Discovery
 */

import { Injectable } from '@angular/core';
import { ICacheKeyBuilder } from '../../../lib/state-management';
import { AutoSearchFilters } from '../models/automobile.filters';

/**
 * Automobile cache key builder
 *
 * Generates unique cache keys from filter objects for request coordination.
 * Cache keys are deterministic - same filters always produce same key.
 *
 * @example
 * ```typescript
 * const builder = new AutomobileCacheKeyBuilder();
 * const filters = new AutoSearchFilters({ manufacturer: 'Toyota', page: 1 });
 *
 * const key = builder.buildKey(filters);
 * // 'auto:manufacturer=Toyota:page=1'
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AutomobileCacheKeyBuilder
  implements ICacheKeyBuilder<AutoSearchFilters>
{
  /**
   * Cache key prefix for automobile domain
   */
  private readonly PREFIX = 'auto';

  /**
   * Build cache key from filters
   *
   * Creates a unique, deterministic cache key by serializing
   * all non-null/undefined filter values in sorted order.
   *
   * IMPORTANT: Highlights MUST be included in cache key to prevent
   * stale data when highlight parameters change.
   *
   * @param filters - Filter object
   * @param highlights - Optional highlight filters (h_* parameters)
   * @returns Cache key string
   */
  buildKey(filters: AutoSearchFilters, highlights?: any): string {
    const parts: string[] = [this.PREFIX];

    // Collect all defined filter values
    const entries = this.getFilterEntries(filters);

    // Add highlight parameters with h_ prefix
    if (highlights) {
      if (highlights.yearMin !== undefined && highlights.yearMin !== null) {
        entries.push(['h_yearMin', highlights.yearMin]);
      }
      if (highlights.yearMax !== undefined && highlights.yearMax !== null) {
        entries.push(['h_yearMax', highlights.yearMax]);
      }
      if (highlights.manufacturer) {
        entries.push(['h_manufacturer', highlights.manufacturer]);
      }
      if (highlights.modelCombos) {
        entries.push(['h_modelCombos', highlights.modelCombos]);
      }
      if (highlights.bodyClass) {
        entries.push(['h_bodyClass', highlights.bodyClass]);
      }
    }

    // Sort by key for deterministic ordering
    entries.sort((a, b) => a[0].localeCompare(b[0]));

    // Build key parts
    entries.forEach(([key, value]) => {
      parts.push(`${key}=${this.serializeValue(value)}`);
    });

    return parts.join(':');
  }

  /**
   * Get all defined filter entries as [key, value] pairs
   *
   * @param filters - Filter object
   * @returns Array of [key, value] tuples
   */
  private getFilterEntries(
    filters: AutoSearchFilters
  ): Array<[string, any]> {
    const entries: Array<[string, any]> = [];

    // Add each defined filter field
    if (filters.manufacturer !== undefined && filters.manufacturer !== null) {
      entries.push(['manufacturer', filters.manufacturer]);
    }

    if (filters.model !== undefined && filters.model !== null) {
      entries.push(['model', filters.model]);
    }

    if (filters.yearMin !== undefined && filters.yearMin !== null) {
      entries.push(['yearMin', filters.yearMin]);
    }

    if (filters.yearMax !== undefined && filters.yearMax !== null) {
      entries.push(['yearMax', filters.yearMax]);
    }

    if (filters.bodyClass !== undefined && filters.bodyClass !== null) {
      entries.push(['bodyClass', filters.bodyClass]);
    }

    if (filters.instanceCountMin !== undefined && filters.instanceCountMin !== null) {
      entries.push(['instanceCountMin', filters.instanceCountMin]);
    }

    if (filters.instanceCountMax !== undefined && filters.instanceCountMax !== null) {
      entries.push(['instanceCountMax', filters.instanceCountMax]);
    }

    if (filters.search !== undefined && filters.search !== null) {
      entries.push(['search', filters.search]);
    }

    if (filters.page !== undefined && filters.page !== null) {
      entries.push(['page', filters.page]);
    }

    if (filters.size !== undefined && filters.size !== null) {
      entries.push(['size', filters.size]);
    }

    if (filters.sort !== undefined && filters.sort !== null) {
      entries.push(['sort', filters.sort]);
    }

    if (filters.sortDirection !== undefined && filters.sortDirection !== null) {
      entries.push(['sortDirection', filters.sortDirection]);
    }

    return entries;
  }

  /**
   * Serialize value for cache key
   *
   * Converts values to strings for use in cache keys.
   * Handles strings, numbers, booleans, and arrays.
   *
   * @param value - Value to serialize
   * @returns Serialized string
   */
  private serializeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((v) => String(v)).join(',');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Get cache key prefix for automobile domain
   *
   * @returns Cache key prefix
   */
  getPrefix(): string {
    return this.PREFIX;
  }
}

/**
 * Default cache key builder
 *
 * Generic cache key builder that works with any filter object.
 * Uses JSON serialization for simplicity.
 *
 * @template TFilters - Filter object type
 *
 * @example
 * ```typescript
 * const builder = new DefaultCacheKeyBuilder<MyFilters>();
 * const key = builder.buildKey(filters);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class DefaultCacheKeyBuilder<TFilters>
  implements ICacheKeyBuilder<TFilters>
{
  /**
   * Default cache key prefix
   */
  private readonly PREFIX = 'cache';

  /**
   * Build cache key from filters using JSON serialization
   *
   * @param filters - Filter object
   * @param highlights - Optional highlight filters (h_* parameters)
   * @returns Cache key string
   */
  buildKey(filters: TFilters, highlights?: any): string {
    // Combine filters and highlights for cache key
    const combined = { filters, highlights };

    // Simple implementation using JSON serialization
    // Sort keys for deterministic output
    const json = JSON.stringify(combined, Object.keys(combined as any).sort());

    // Create hash from JSON (simple implementation)
    const hash = this.simpleHash(json);

    return `${this.PREFIX}:${hash}`;
  }

  /**
   * Simple hash function for cache keys
   *
   * Creates a hash from a string for cache key generation.
   * Not cryptographically secure - just for cache key uniqueness.
   *
   * @param str - String to hash
   * @returns Hash string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache key prefix
   *
   * @returns Cache key prefix
   */
  getPrefix(): string {
    return this.PREFIX;
  }
}

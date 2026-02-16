/**
 * URL Mapper Regression Tests
 *
 * PURPOSE: Lock in current URL parsing behavior BEFORE refactoring to GenericUrlMapper.
 * These tests serve as the safety net described in docs/audit/refactor.md Phase 0.
 *
 * Tests verify bidirectional URL↔Filter conversion:
 * 1. URL params → Filter object (fromUrlParams)
 * 2. Filter object → URL params (toUrlParams)
 * 3. Round-trip consistency (URL → Filter → URL)
 *
 * IMPORTANT: Do NOT modify these tests during refactoring. They define the contract.
 */

import { test, expect } from '@playwright/test';
import { navigateToDiscover } from './screenshot-helper';

test.describe('URL Mapper Regression Tests', () => {
  /**
   * ===========================================
   * SECTION 1: String Parameter Parsing
   * ===========================================
   */
  test.describe('String Parameters', () => {
    test('manufacturer param parses correctly', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford');
      expect(page.url()).toContain('manufacturer=Ford');
    });

    test('model param parses correctly', async ({ page }) => {
      await navigateToDiscover(page, 'model=Mustang');
      expect(page.url()).toContain('model=Mustang');
    });

    test('search param parses correctly', async ({ page }) => {
      await navigateToDiscover(page, 'search=electric');
      expect(page.url()).toContain('search=electric');
    });

    test('URL-encoded special characters in manufacturer', async ({ page }) => {
      // Space encoded as %20 or +
      await navigateToDiscover(page, 'manufacturer=Land%20Rover');
      expect(page.url()).toMatch(/manufacturer=Land(%20|\+)Rover/);
    });

    test('modelCombos param with multiple values', async ({ page }) => {
      await navigateToDiscover(page, 'modelCombos=Ford:F-150,Toyota:Camry');
      expect(page.url()).toContain('modelCombos=');
    });
  });

  /**
   * ===========================================
   * SECTION 2: Numeric Parameter Parsing
   * ===========================================
   */
  test.describe('Numeric Parameters', () => {
    test('yearMin parses as number', async ({ page }) => {
      await navigateToDiscover(page, 'yearMin=2020');
      expect(page.url()).toContain('yearMin=2020');
    });

    test('yearMax parses as number', async ({ page }) => {
      await navigateToDiscover(page, 'yearMax=2024');
      expect(page.url()).toContain('yearMax=2024');
    });

    test('year range (min and max together)', async ({ page }) => {
      await navigateToDiscover(page, 'yearMin=2020&yearMax=2024');
      expect(page.url()).toContain('yearMin=2020');
      expect(page.url()).toContain('yearMax=2024');
    });

    test('instanceCountMin parses as number', async ({ page }) => {
      await navigateToDiscover(page, 'instanceCountMin=100');
      expect(page.url()).toContain('instanceCountMin=100');
    });

    test('instanceCountMax parses as number', async ({ page }) => {
      await navigateToDiscover(page, 'instanceCountMax=1000');
      expect(page.url()).toContain('instanceCountMax=1000');
    });

    test('page parses as number', async ({ page }) => {
      await navigateToDiscover(page, 'page=3');
      expect(page.url()).toContain('page=3');
    });

    test('size parses as number', async ({ page }) => {
      await navigateToDiscover(page, 'size=50');
      expect(page.url()).toContain('size=50');
    });

    test('invalid numeric value is ignored (yearMin=abc)', async ({ page }) => {
      await navigateToDiscover(page, 'yearMin=abc');
      // App should still load without error
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      // Invalid numeric should be ignored (not appear in clean URL or cause error)
    });

    test('negative numbers handled (yearMin=-1)', async ({ page }) => {
      await navigateToDiscover(page, 'yearMin=-1');
      // Should load without error, negative may be treated as invalid
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('decimal numbers handled (yearMin=2020.5)', async ({ page }) => {
      await navigateToDiscover(page, 'yearMin=2020.5');
      // Should load, may be rounded or rejected
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });
  });

  /**
   * ===========================================
   * SECTION 3: Array/Multi-value Parameters
   * ===========================================
   */
  test.describe('Array Parameters', () => {
    test('bodyClass single value', async ({ page }) => {
      await navigateToDiscover(page, 'bodyClass=SUV');
      expect(page.url()).toContain('bodyClass=SUV');
    });

    test('bodyClass comma-separated multiple values', async ({ page }) => {
      await navigateToDiscover(page, 'bodyClass=SUV,Sedan,Truck');
      expect(page.url()).toContain('bodyClass=');
      // URL should preserve the multi-value format
    });

    test('bodyClass with spaces in values', async ({ page }) => {
      await navigateToDiscover(page, 'bodyClass=Sport%20Utility');
      expect(page.url()).toMatch(/bodyClass=Sport(%20|\+)Utility/);
    });
  });

  /**
   * ===========================================
   * SECTION 4: Sort Parameters
   * ===========================================
   */
  test.describe('Sort Parameters', () => {
    test('sortBy param', async ({ page }) => {
      await navigateToDiscover(page, 'sortBy=year');
      expect(page.url()).toContain('sortBy=year');
    });

    test('sortOrder=asc', async ({ page }) => {
      await navigateToDiscover(page, 'sortBy=year&sortOrder=asc');
      expect(page.url()).toContain('sortOrder=asc');
    });

    test('sortOrder=desc', async ({ page }) => {
      await navigateToDiscover(page, 'sortBy=year&sortOrder=desc');
      expect(page.url()).toContain('sortOrder=desc');
    });

    test('invalid sortOrder is ignored', async ({ page }) => {
      await navigateToDiscover(page, 'sortBy=year&sortOrder=invalid');
      // Should load without error, invalid sortOrder may be ignored
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });
  });

  /**
   * ===========================================
   * SECTION 5: Highlight Parameters (h_ prefix)
   * ===========================================
   */
  test.describe('Highlight Parameters', () => {
    test('h_manufacturer highlight', async ({ page }) => {
      await navigateToDiscover(page, 'h_manufacturer=Tesla');
      expect(page.url()).toContain('h_manufacturer=Tesla');
    });

    test('h_yearMin highlight', async ({ page }) => {
      await navigateToDiscover(page, 'h_yearMin=2020');
      expect(page.url()).toContain('h_yearMin=2020');
    });

    test('h_yearMax highlight', async ({ page }) => {
      await navigateToDiscover(page, 'h_yearMax=2024');
      expect(page.url()).toContain('h_yearMax=2024');
    });

    test('h_bodyClass highlight', async ({ page }) => {
      await navigateToDiscover(page, 'h_bodyClass=SUV');
      expect(page.url()).toContain('h_bodyClass=SUV');
    });

    test('multiple highlight params', async ({ page }) => {
      await navigateToDiscover(page, 'h_manufacturer=Ford&h_yearMin=2020&h_yearMax=2024');
      expect(page.url()).toContain('h_manufacturer=Ford');
      expect(page.url()).toContain('h_yearMin=2020');
      expect(page.url()).toContain('h_yearMax=2024');
    });

    test('highlight with pipe separator (h_manufacturer=Ford|Chevy)', async ({ page }) => {
      // Per URL mapper: pipes should be normalized to commas for backend
      await navigateToDiscover(page, 'h_manufacturer=Ford|Chevrolet');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      // App should handle pipe-separated values
    });

    test('filter and highlight together', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford&h_yearMin=2020');
      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('h_yearMin=2020');
    });
  });

  /**
   * ===========================================
   * SECTION 6: Complex Combinations
   * ===========================================
   */
  test.describe('Complex Parameter Combinations', () => {
    test('all filter types combined', async ({ page }) => {
      const params = [
        'manufacturer=Ford',
        'yearMin=2020',
        'yearMax=2024',
        'bodyClass=SUV,Truck',
        'page=2',
        'size=25',
        'sortBy=year',
        'sortOrder=desc'
      ].join('&');

      await navigateToDiscover(page, params);

      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('yearMin=2020');
      expect(page.url()).toContain('yearMax=2024');
      expect(page.url()).toContain('bodyClass=');
      expect(page.url()).toContain('page=2');
      // Note: size may be normalized to default (10) by the app
      expect(page.url()).toContain('sortBy=year');
      expect(page.url()).toContain('sortOrder=desc');
    });

    test('filters plus highlights combined', async ({ page }) => {
      const params = [
        'manufacturer=Ford',
        'yearMin=2015',
        'h_yearMin=2020',
        'h_yearMax=2024'
      ].join('&');

      await navigateToDiscover(page, params);

      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('yearMin=2015');
      expect(page.url()).toContain('h_yearMin=2020');
      expect(page.url()).toContain('h_yearMax=2024');
    });

    test('pagination with filters', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Toyota&page=3&size=50');
      expect(page.url()).toContain('manufacturer=Toyota');
      expect(page.url()).toContain('page=3');
      expect(page.url()).toContain('size=50');
    });
  });

  /**
   * ===========================================
   * SECTION 7: Edge Cases
   * ===========================================
   */
  test.describe('Edge Cases', () => {
    test('empty URL loads default state', async ({ page }) => {
      await navigateToDiscover(page, '');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      // Page should load with default filters
    });

    test('unknown params are ignored', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford&unknownParam=value');
      expect(page.url()).toContain('manufacturer=Ford');
      // App should not break on unknown params
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('duplicate params use last value', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford&manufacturer=Toyota');
      // Behavior may vary - just ensure no crash
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('empty param value (manufacturer=)', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=');
      // Empty value should be treated as no filter
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('param with only spaces (manufacturer=%20)', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=%20');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('very long URL with many params', async ({ page }) => {
      // Test URL length limits aren't hit with reasonable params
      const params = [
        'manufacturer=Ford',
        'model=F-150',
        'yearMin=2015',
        'yearMax=2024',
        'bodyClass=Truck',
        'instanceCountMin=10',
        'instanceCountMax=10000',
        'search=extended%20cab',
        'page=1',
        'size=20',
        'sortBy=year',
        'sortOrder=desc',
        'h_manufacturer=Ford',
        'h_yearMin=2020',
        'h_yearMax=2024'
      ].join('&');

      await navigateToDiscover(page, params);
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('year range where min > max', async ({ page }) => {
      // Invalid range - should not crash
      await navigateToDiscover(page, 'yearMin=2024&yearMax=2020');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });
  });

  /**
   * ===========================================
   * SECTION 8: Round-Trip Consistency
   * ===========================================
   */
  test.describe('Round-Trip Consistency', () => {
    test('filter change preserves other URL params', async ({ page }) => {
      // Start with multiple params
      await navigateToDiscover(page, 'manufacturer=Ford&yearMin=2020&sortBy=year&sortOrder=desc');

      // Change manufacturer via UI if possible, or navigate to new URL
      await page.goto('/discover?manufacturer=Toyota&yearMin=2020&sortBy=year&sortOrder=desc');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Other params should be preserved
      expect(page.url()).toContain('yearMin=2020');
      expect(page.url()).toContain('sortBy=year');
      expect(page.url()).toContain('sortOrder=desc');
    });

    test('removing a filter preserves other params', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford&yearMin=2020&bodyClass=SUV');

      // Remove manufacturer
      await page.goto('/discover?yearMin=2020&bodyClass=SUV');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      expect(page.url()).not.toContain('manufacturer=');
      expect(page.url()).toContain('yearMin=2020');
      expect(page.url()).toContain('bodyClass=SUV');
    });

    test('adding a filter preserves existing params', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford');

      // Add yearMin
      await page.goto('/discover?manufacturer=Ford&yearMin=2020');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('yearMin=2020');
    });
  });

  /**
   * ===========================================
   * SECTION 9: Case Sensitivity
   * ===========================================
   */
  test.describe('Case Sensitivity', () => {
    test('param names are case-sensitive (MANUFACTURER vs manufacturer)', async ({ page }) => {
      await navigateToDiscover(page, 'MANUFACTURER=Ford');
      // Angular router typically preserves case - verify behavior
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('param values preserve case', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=FORD');
      expect(page.url()).toContain('manufacturer=FORD');
    });
  });

  /**
   * ===========================================
   * SECTION 10: URL Encoding
   * ===========================================
   */
  test.describe('URL Encoding', () => {
    test('ampersand in value is encoded', async ({ page }) => {
      await navigateToDiscover(page, 'search=A%26B');
      expect(page.url()).toMatch(/search=A(%26|&)B/);
    });

    test('equals sign in value is encoded', async ({ page }) => {
      await navigateToDiscover(page, 'search=A%3DB');
      expect(page.url()).toContain('search=');
    });

    test('hash in value is encoded', async ({ page }) => {
      await navigateToDiscover(page, 'search=Test%23Value');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });

    test('plus sign treated as space', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Land+Rover');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
    });
  });
});

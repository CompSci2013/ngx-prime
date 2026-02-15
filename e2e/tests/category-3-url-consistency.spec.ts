import { test, expect } from '@playwright/test';
import {
  PANEL_IDS,
  setPanelVisibility,
  takeScreenshot,
  navigateToDiscover,
} from './screenshot-helper';

test.describe('Category 3: URL Change Consistency Tests', () => {
  test.describe('U3.1.x Browser Navigation', () => {
    test('U3.1.1 - Back button restores manufacturer filter (Ford→Chevrolet→Back)', async ({ page }) => {
      // Start with Ford
      await navigateToDiscover(page, 'manufacturer=Ford');
      await page.waitForTimeout(300);

      // Change to Chevrolet
      await page.goto('/discover?manufacturer=Chevrolet');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Click Back - should restore Ford
      await page.goBack();
      await page.waitForTimeout(500);

      // Per panel-visibility-reference: Query Control shows previous chip, Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.1.1', 'back-restores-ford');

      expect(page.url()).toContain('manufacturer=Ford');
    });

    test('U3.1.2 - Back button restores pagination (Page 3→5→Back→Back)', async ({ page }) => {
      // Navigate through pages: 3 → 5
      await navigateToDiscover(page, 'page=3');
      await page.waitForTimeout(300);

      await page.goto('/discover?page=5');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Click Back - should restore page 3
      await page.goBack();
      await page.waitForTimeout(500);

      // Per panel-visibility-reference: Results Table
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.1.2', 'back-restores-page3');

      expect(page.url()).toContain('page=3');
    });

    test('U3.1.3 - Back removes filter but keeps sort', async ({ page }) => {
      // Start with sort only
      await navigateToDiscover(page, 'sortBy=year&sortOrder=desc');
      await page.waitForTimeout(300);

      // Add filter
      await page.goto('/discover?sortBy=year&sortOrder=desc&manufacturer=Ford');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Click Back - sort should remain, filter removed
      await page.goBack();
      await page.waitForTimeout(500);

      // Per panel-visibility-reference: Results Table to show sort indicator
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.1.3', 'back-keeps-sort-removes-filter');

      expect(page.url()).toContain('sortBy=year');
      expect(page.url()).toContain('sortOrder=desc');
      expect(page.url()).not.toContain('manufacturer');
    });

    test('U3.1.4 - Back removes highlight', async ({ page }) => {
      // Start without highlight
      await navigateToDiscover(page);
      await page.waitForTimeout(300);

      // Add highlight
      await page.goto('/discover?h_manufacturer=Tesla');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Click Back - highlight should be removed
      await page.goBack();
      await page.waitForTimeout(500);

      // Per panel-visibility-reference: Query Control (no highlight chip), Statistics (no blue)
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.1.4', 'back-removes-highlight');

      expect(page.url()).not.toContain('h_manufacturer');
    });

    test('U3.1.5 - Back restores cleared filters', async ({ page }) => {
      // Start with filters
      await navigateToDiscover(page, 'manufacturer=Ford&yearMin=2015');
      await page.waitForTimeout(300);

      // Clear filters (navigate to clean URL)
      await page.goto('/discover');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Click Back - filters should be restored
      await page.goBack();
      await page.waitForTimeout(500);

      // Per panel-visibility-reference: Query Control (chips return), Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.1.5', 'back-restores-filters');

      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('yearMin=2015');
    });

    test('U3.1.6 - Forward restores state after multiple backs', async ({ page }) => {
      // Navigate: default → Ford → Chevrolet
      await navigateToDiscover(page);
      await page.waitForTimeout(300);

      await page.goto('/discover?manufacturer=Ford');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      await page.goto('/discover?manufacturer=Chevrolet');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });
      await page.waitForTimeout(300);

      // Go back twice to default
      await page.goBack();
      await page.waitForTimeout(500);
      await page.goBack();
      await page.waitForTimeout(500);

      // Forward should restore Ford
      await page.goForward();
      await page.waitForTimeout(500);

      // Per panel-visibility-reference: Query Control, Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.1.6', 'forward-restores-state');

      expect(page.url()).toContain('manufacturer=Ford');
    });
  });

  test.describe('U3.2.x Manual URL Edits', () => {
    test('U3.2.1 - Edit manufacturer in URL bar (Ford→Dodge)', async ({ page }) => {
      // Start with Ford
      await navigateToDiscover(page, 'manufacturer=Ford');
      await page.waitForTimeout(300);

      // Edit URL to Dodge
      await page.goto('/discover?manufacturer=Dodge');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Query Control (new chip), Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.2.1', 'url-edit-manufacturer-dodge');

      expect(page.url()).toContain('manufacturer=Dodge');
    });

    test('U3.2.2 - Add yearMin param to existing URL', async ({ page }) => {
      // Start with manufacturer only
      await navigateToDiscover(page, 'manufacturer=Ford');
      await page.waitForTimeout(300);

      // Add yearMin via URL
      await page.goto('/discover?manufacturer=Ford&yearMin=2010');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Query Control (new chip), Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.2.2', 'url-add-year-param');

      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('yearMin=2010');
    });

    test('U3.2.3 - Remove page param returns to page 1', async ({ page }) => {
      // Start on page 3
      await navigateToDiscover(page, 'page=3');
      await page.waitForTimeout(300);

      // Remove page param
      await page.goto('/discover');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Results Table (back to page 1)
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.2.3', 'url-remove-page-param');

      expect(page.url()).not.toContain('page=');
    });

    test('U3.2.4 - Change sortOrder from asc to desc', async ({ page }) => {
      // Start with asc
      await navigateToDiscover(page, 'sortBy=year&sortOrder=asc');
      await page.waitForTimeout(300);

      // Change to desc
      await page.goto('/discover?sortBy=year&sortOrder=desc');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Results Table (reversed indicator)
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.2.4', 'url-change-sort-direction');

      expect(page.url()).toContain('sortBy=year');
      expect(page.url()).toContain('sortOrder=desc');
    });

    test('U3.2.5 - Paste completely new URL with different filters', async ({ page }) => {
      // Start with one set of filters
      await navigateToDiscover(page, 'manufacturer=Ford&yearMin=2015');
      await page.waitForTimeout(300);

      // Paste completely different URL
      await page.goto('/discover?bodyClass=SUV&h_manufacturer=Jeep');
      await page.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Query Control, Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'U3.2.5', 'url-paste-new-filters');

      expect(page.url()).toContain('bodyClass=SUV');
      expect(page.url()).toContain('h_manufacturer=Jeep');
      expect(page.url()).not.toContain('manufacturer=Ford');
    });
  });

  test.describe('U3.3.x URL Sharing', () => {
    test('U3.3.1 - Shared URL with filters reproduces state', async ({ page, context }) => {
      // Navigate to URL with filters in first tab
      await navigateToDiscover(page, 'manufacturer=Ford&yearMin=2015&yearMax=2020');
      await page.waitForTimeout(300);

      // Copy URL (simulated by opening same URL in new tab)
      const newPage = await context.newPage();
      await newPage.goto(page.url());
      await newPage.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Query Control (chips), Statistics
      await setPanelVisibility(
        newPage,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await newPage.waitForTimeout(300);
      await takeScreenshot(newPage, 'U3.3.1', 'shared-url-filters');

      expect(newPage.url()).toContain('manufacturer=Ford');
      expect(newPage.url()).toContain('yearMin=2015');
      expect(newPage.url()).toContain('yearMax=2020');

      await newPage.close();
    });

    test('U3.3.2 - Shared URL with highlights reproduces state', async ({ page, context }) => {
      // Navigate to URL with highlights
      await navigateToDiscover(page, 'h_manufacturer=Tesla&h_yearMin=2018&h_yearMax=2022');
      await page.waitForTimeout(300);

      // Open same URL in new tab
      const newPage = await context.newPage();
      await newPage.goto(page.url());
      await newPage.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Query Control (highlight chip), Statistics (blue bars)
      await setPanelVisibility(
        newPage,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await newPage.waitForTimeout(300);
      await takeScreenshot(newPage, 'U3.3.2', 'shared-url-highlights');

      expect(newPage.url()).toContain('h_manufacturer=Tesla');
      expect(newPage.url()).toContain('h_yearMin=2018');
      expect(newPage.url()).toContain('h_yearMax=2022');

      await newPage.close();
    });

    test('U3.3.3 - Shared URL with pagination reproduces state', async ({ page, context }) => {
      // Navigate to URL with pagination
      await navigateToDiscover(page, 'page=5&size=25');
      await page.waitForTimeout(300);

      // Open same URL in new tab (simulates incognito/different session)
      const newPage = await context.newPage();
      await newPage.goto(page.url());
      await newPage.waitForSelector('[data-testid="dynamic-results-table"]', { timeout: 10000 });

      // Per panel-visibility-reference: Results Table (correct page)
      await setPanelVisibility(
        newPage,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await newPage.waitForTimeout(300);
      await takeScreenshot(newPage, 'U3.3.3', 'shared-url-pagination');

      expect(newPage.url()).toContain('page=5');
      expect(newPage.url()).toContain('size=25');

      await newPage.close();
    });
  });
});

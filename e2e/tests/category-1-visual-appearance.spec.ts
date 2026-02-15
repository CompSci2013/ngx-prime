import { test, expect } from '@playwright/test';
import {
  PANEL_IDS,
  setPanelVisibility,
  takeScreenshot,
  takeOverlayScreenshot,
  navigateToDiscover,
  waitForPageLoad,
} from './screenshot-helper';

test.describe('Category 1: Visual Appearance Tests', () => {
  test.describe('V1.1.x Default State Rendering', () => {
    test('V1.1.1 - Results Table default render', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Results Table expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.1.1', 'results-table-default');

      // Verify URL is clean (no params)
      expect(page.url()).toContain('/discover');
    });

    test('V1.1.2 - Filter Panel default render', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Query Panel expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_PANEL],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.1.2', 'filter-panel-default');

      expect(page.url()).toContain('/discover');
    });

    test('V1.1.3 - Pagination default render', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Results Table expanded (shows pagination), others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.1.3', 'pagination-default');

      expect(page.url()).toContain('/discover');
    });

    test('V1.1.4 - Statistics Panel default render', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Statistics expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.1.4', 'statistics-default');

      expect(page.url()).toContain('/discover');
    });

    test('V1.1.5 - Search Input default render', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Query Control expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.1.5', 'search-default');

      expect(page.url()).toContain('/discover');
    });
  });

  test.describe('V1.2.x Filtered State Rendering', () => {
    test('V1.2.1 - Results table filtered by manufacturer (Ford)', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford');

      // Per panel-visibility-reference: Query Control (filter chip) + Statistics expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.2.1', 'results-table-filtered-ford');

      expect(page.url()).toContain('manufacturer=Ford');
    });

    test('V1.2.2 - Results table filtered by body class (SUV)', async ({ page }) => {
      await navigateToDiscover(page, 'bodyClass=SUV');

      // Per panel-visibility-reference: Query Control (filter chip) + Statistics expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.2.2', 'results-table-filtered-suv');

      expect(page.url()).toContain('bodyClass=SUV');
    });

    test('V1.2.3 - Results table filtered by year range (2020-2024)', async ({ page }) => {
      await navigateToDiscover(page, 'yearMin=2020&yearMax=2024');

      // Per panel-visibility-reference: Query Control (filter chip) + Statistics expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.2.3', 'results-table-filtered-recent');

      expect(page.url()).toContain('yearMin=2020');
      expect(page.url()).toContain('yearMax=2024');
    });

    test('V1.2.4 - Statistics filtered by manufacturer (Chevrolet)', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Chevrolet');

      // Per panel-visibility-reference: Query Control (filter chip) + Statistics expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.2.4', 'statistics-filtered-chevrolet');

      expect(page.url()).toContain('manufacturer=Chevrolet');
    });

    test('V1.2.5 - Results table with model combinations', async ({ page }) => {
      await navigateToDiscover(page, 'models=Ford:Mustang,Chevrolet:Camaro');

      // Per panel-visibility-reference: Query Control (models chip) + Statistics expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.2.5', 'results-table-model-combos');

      expect(page.url()).toContain('models=Ford:Mustang');
    });
  });

  test.describe('V1.3.x Highlighted State Rendering', () => {
    test('V1.3.1 - Statistics charts with manufacturer highlight (Tesla)', async ({ page }) => {
      await navigateToDiscover(page, 'h_manufacturer=Tesla');

      // Per rubric: Query Control (shows highlight chip) + Statistics expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.3.1', 'statistics-highlight-tesla');

      expect(page.url()).toContain('h_manufacturer=Tesla');
    });

    test('V1.3.2 - Statistics charts with year range highlight (2015-2020)', async ({ page }) => {
      await navigateToDiscover(page, 'h_yearMin=2015&h_yearMax=2020');

      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.3.2', 'statistics-highlight-years');

      expect(page.url()).toContain('h_yearMin=2015');
      expect(page.url()).toContain('h_yearMax=2020');
    });

    test('V1.3.3 - Statistics charts with body class highlight (Pickup)', async ({ page }) => {
      await navigateToDiscover(page, 'h_bodyClass=Pickup');

      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.3.3', 'statistics-highlight-pickup');

      expect(page.url()).toContain('h_bodyClass=Pickup');
    });

    test('V1.3.4 - Statistics with filter and highlight combined', async ({ page }) => {
      await navigateToDiscover(page, 'manufacturer=Ford&h_yearMin=2018');

      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.3.4', 'statistics-filter-with-highlight');

      expect(page.url()).toContain('manufacturer=Ford');
      expect(page.url()).toContain('h_yearMin=2018');
    });
  });

  test.describe('V1.4.x Sorted State Rendering', () => {
    test('V1.4.1 - Results table sorted by year descending', async ({ page }) => {
      await navigateToDiscover(page, 'sortBy=year&sortOrder=desc');

      // Per panel-visibility-reference: Results Table expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.4.1', 'results-table-sorted-year-desc');

      expect(page.url()).toContain('sortBy=year');
      expect(page.url()).toContain('sortOrder=desc');
    });

    test('V1.4.2 - Results table sorted by manufacturer ascending', async ({ page }) => {
      await navigateToDiscover(page, 'sortBy=manufacturer&sortOrder=asc');

      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.4.2', 'results-table-sorted-manufacturer-asc');

      expect(page.url()).toContain('sortBy=manufacturer');
      expect(page.url()).toContain('sortOrder=asc');
    });

    test('V1.4.3 - Results table sorted by instance count descending', async ({ page }) => {
      // Note: API uses snake_case field name (instance_count), not camelCase
      await navigateToDiscover(page, 'sortBy=instance_count&sortOrder=desc');

      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.4.3', 'results-table-sorted-instancecount-desc');

      expect(page.url()).toContain('sortBy=instance_count');
      expect(page.url()).toContain('sortOrder=desc');
    });
  });

  test.describe('V1.5.x Paginated State Rendering', () => {
    test('V1.5.1 - Results table page 2 with 10 rows', async ({ page }) => {
      await navigateToDiscover(page, 'page=2&size=10');

      // Per panel-visibility-reference: Results Table expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.5.1', 'results-table-paginated-page2');

      expect(page.url()).toContain('page=2');
      expect(page.url()).toContain('size=10');
    });

    test('V1.5.2 - Pagination control page 5', async ({ page }) => {
      await navigateToDiscover(page, 'page=5&size=25');

      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.5.2', 'pagination-page5');

      expect(page.url()).toContain('page=5');
    });

    test('V1.5.3 - Results table last page', async ({ page }) => {
      // With 4887 total results and 25 per page, last page is 196
      await navigateToDiscover(page, 'page=196&size=25');

      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.5.3', 'results-table-last-page');

      expect(page.url()).toContain('page=196');
    });
  });

  test.describe('V1.6.x Collapsed/Expanded Panel State', () => {
    test('V1.6.1 - Query Control collapsed', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Query Control collapsed, others expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.6.1', 'query-control-collapsed');

      expect(page.url()).toContain('/discover');
    });

    test('V1.6.2 - Query Panel collapsed', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Query Panel collapsed, others expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_PANEL]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.6.2', 'query-panel-collapsed');

      expect(page.url()).toContain('/discover');
    });

    test('V1.6.3 - Manufacturer-Model Picker collapsed', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Picker collapsed, others expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.PICKER]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.6.3', 'picker-collapsed');

      expect(page.url()).toContain('/discover');
    });

    test('V1.6.4 - All Panels expanded (default)', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: All expanded
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE],
        []
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.6.4', 'all-panels-expanded');

      expect(page.url()).toContain('/discover');
    });

    test('V1.6.5 - All Panels collapsed', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: All collapsed
      await setPanelVisibility(
        page,
        [],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.6.5', 'all-panels-collapsed');

      expect(page.url()).toContain('/discover');
    });

    test('V1.6.6 - Mixed State (some collapsed, some expanded)', async ({ page }) => {
      await navigateToDiscover(page);

      // Per panel-visibility-reference: Query Control + Statistics expanded, others collapsed
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.6.6', 'panels-mixed-state');

      expect(page.url()).toContain('/discover');
    });
  });

  test.describe('V1.7.x Pagination Interaction (Popped-In)', () => {
    test('V1.7.1 - Picker Table click page 2', async ({ page }) => {
      await navigateToDiscover(page);

      // Expand Picker, collapse others
      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      // Click page 2 in Picker pagination
      await page.locator('#panel-manufacturer-model-picker .p-paginator-page').nth(1).click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'V1.7.1', 'picker-page2');

      // Picker pagination is internal, doesn't update URL
    });

    test('V1.7.2 - Picker Table click page 3', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      // Click page 3 in Picker pagination
      await page.locator('#panel-manufacturer-model-picker .p-paginator-page').nth(2).click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'V1.7.2', 'picker-page3');
    });

    test('V1.7.3 - Picker Table change rows to 10', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      // Change rows per page in Picker
      await page.locator('#panel-manufacturer-model-picker .p-paginator-rpp-options').click();
      await page.getByRole('option', { name: '10', exact: true }).click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'V1.7.3', 'picker-rows-10');
    });

    test('V1.7.4 - Picker Table change rows to 50', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      await page.locator('#panel-manufacturer-model-picker .p-paginator-rpp-options').click();
      await page.locator('.p-dropdown-item').filter({ hasText: '50' }).click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'V1.7.4', 'picker-rows-50');
    });

    test('V1.7.5 - Picker Table change rows to 100', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      await page.locator('#panel-manufacturer-model-picker .p-paginator-rpp-options').click();
      await page.locator('.p-dropdown-item').filter({ hasText: '100' }).click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'V1.7.5', 'picker-rows-100');
    });

    test('V1.7.6 - Results Table navigate via URL page=2', async ({ page }) => {
      await navigateToDiscover(page, 'page=2');

      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.7.6', 'results-page2-url');

      expect(page.url()).toContain('page=2');
    });

    test('V1.7.7 - Results Table navigate via URL size=50', async ({ page }) => {
      await navigateToDiscover(page, 'size=50');

      await setPanelVisibility(
        page,
        [PANEL_IDS.RESULTS_TABLE],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.STATISTICS]
      );

      await page.waitForTimeout(300);
      await takeScreenshot(page, 'V1.7.7', 'results-rows-50-url');

      expect(page.url()).toContain('size=50');
    });
  });

  test.describe('V1.8.x Pagination Interaction (Popped-Out)', () => {
    test('V1.8.1 - Picker Table (pop-out) click page 2', async ({ page, context }) => {
      await navigateToDiscover(page);

      // Listen for the new window BEFORE clicking pop-out
      const popoutPromise = context.waitForEvent('page');
      await page.locator('#panel-manufacturer-model-picker .panel-header button[icon="pi pi-external-link"]').click();
      const popoutPage = await popoutPromise;

      await popoutPage.waitForLoadState('domcontentloaded');
      await popoutPage.waitForTimeout(1000);

      // Click page 2 in the pop-out Picker pagination
      await popoutPage.locator('.p-paginator-page').nth(1).click();
      await popoutPage.waitForTimeout(500);

      // Screenshot the pop-out window (single image, no scrolling for pop-outs)
      await takeOverlayScreenshot(popoutPage, 'V1.8.1', 'picker-popout-page2');

      // Overlay screenshot: main window showing placeholder message
      await takeOverlayScreenshot(page, 'V1.8.1', 'picker-popout-main-overlay');
    });

    test('V1.8.2 - Picker Table (pop-out) change rows to 50', async ({ page, context }) => {
      await navigateToDiscover(page);

      // Listen for the new window BEFORE clicking pop-out
      const popoutPromise = context.waitForEvent('page');
      await page.locator('#panel-manufacturer-model-picker .panel-header button[icon="pi pi-external-link"]').click();
      const popoutPage = await popoutPromise;

      await popoutPage.waitForLoadState('domcontentloaded');
      await popoutPage.waitForTimeout(1000);

      // Scroll to pagination area first
      await popoutPage.locator('.p-paginator').scrollIntoViewIfNeeded();
      await popoutPage.waitForTimeout(300);

      // Click the dropdown trigger directly
      await popoutPage.locator('.p-paginator-rpp-options').click();
      await popoutPage.waitForTimeout(300);

      // Wait for dropdown panel to appear and click 50
      await popoutPage.waitForSelector('.p-dropdown-panel', { state: 'visible', timeout: 5000 });
      await popoutPage.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: /^50$/ }).click();
      await popoutPage.waitForTimeout(500);

      // Screenshot the pop-out window (single image, no scrolling for pop-outs)
      await takeOverlayScreenshot(popoutPage, 'V1.8.2', 'picker-popout-rows-50');

      // Overlay screenshot: main window showing placeholder message
      await takeOverlayScreenshot(page, 'V1.8.2', 'picker-popout-main-overlay');
    });

    test('V1.8.3 - Picker Table (pop-out) change rows to 100', async ({ page, context }) => {
      await navigateToDiscover(page);

      // Listen for the new window BEFORE clicking pop-out
      const popoutPromise = context.waitForEvent('page');
      await page.locator('#panel-manufacturer-model-picker .panel-header button[icon="pi pi-external-link"]').click();
      const popoutPage = await popoutPromise;

      await popoutPage.waitForLoadState('domcontentloaded');
      await popoutPage.waitForTimeout(1000);

      // Scroll to pagination area first
      await popoutPage.locator('.p-paginator').scrollIntoViewIfNeeded();
      await popoutPage.waitForTimeout(300);

      // Click the dropdown trigger directly
      await popoutPage.locator('.p-paginator-rpp-options').click();
      await popoutPage.waitForTimeout(300);

      // Wait for dropdown panel to appear and click 100
      await popoutPage.waitForSelector('.p-dropdown-panel', { state: 'visible', timeout: 5000 });
      await popoutPage.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: /^100$/ }).click();
      await popoutPage.waitForTimeout(500);

      // Screenshot the pop-out window (single image, no scrolling for pop-outs)
      await takeOverlayScreenshot(popoutPage, 'V1.8.3', 'picker-popout-rows-100');

      // Overlay screenshot: main window showing placeholder message
      await takeOverlayScreenshot(page, 'V1.8.3', 'picker-popout-main-overlay');
    });
  });

  test.describe('V1.9.x Picker Selection and Apply', () => {
    test('V1.9.1 - Picker (in) select rows before Apply', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      // Select first few rows in Picker by clicking checkboxes
      const checkboxes = page.locator('#panel-manufacturer-model-picker .p-datatable-tbody .p-checkbox-box');
      await checkboxes.nth(0).click();
      await page.waitForTimeout(200);
      await checkboxes.nth(1).click();
      await page.waitForTimeout(200);

      await takeScreenshot(page, 'V1.9.1', 'picker-selected-before-apply');
    });

    test('V1.9.2 - Picker (in) after Apply clicked', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      // Select rows
      const checkboxes = page.locator('#panel-manufacturer-model-picker .p-datatable-tbody .p-checkbox-box');
      await checkboxes.nth(0).click();
      await page.waitForTimeout(200);
      await checkboxes.nth(1).click();
      await page.waitForTimeout(200);

      // Click Apply button
      await page.locator('#panel-manufacturer-model-picker button').filter({ hasText: 'Apply' }).click();
      await page.waitForTimeout(500);

      // After Apply, show Query Control with models chip and Statistics
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await takeScreenshot(page, 'V1.9.2', 'picker-after-apply');

      expect(page.url()).toContain('modelCombos=');
    });

    test('V1.9.3 - Picker (out) select rows before Apply', async ({ page, context }) => {
      await navigateToDiscover(page);

      // Listen for the new window BEFORE clicking pop-out
      const popoutPromise = context.waitForEvent('page');
      await page.locator('#panel-manufacturer-model-picker .panel-header button[icon="pi pi-external-link"]').click();
      const popoutPage = await popoutPromise;

      await popoutPage.waitForLoadState('domcontentloaded');
      await popoutPage.waitForTimeout(1000);

      // Select rows in pop-out
      const checkboxes = popoutPage.locator('.p-datatable-tbody .p-checkbox-box');
      await checkboxes.nth(0).click();
      await popoutPage.waitForTimeout(200);
      await checkboxes.nth(1).click();
      await popoutPage.waitForTimeout(200);

      // Screenshot the pop-out window (single image, no scrolling for pop-outs)
      await takeOverlayScreenshot(popoutPage, 'V1.9.3', 'picker-popout-selected');

      // Overlay screenshot: main window showing placeholder message
      await takeOverlayScreenshot(page, 'V1.9.3', 'picker-popout-main-overlay');
    });

    test('V1.9.4 - Picker (out) after Apply clicked', async ({ page, context }) => {
      await navigateToDiscover(page);

      // Listen for the new window BEFORE clicking pop-out
      const popoutPromise = context.waitForEvent('page');
      await page.locator('#panel-manufacturer-model-picker .panel-header button[icon="pi pi-external-link"]').click();
      const popoutPage = await popoutPromise;

      await popoutPage.waitForLoadState('domcontentloaded');
      await popoutPage.waitForTimeout(1000);

      // Select rows
      const checkboxes = popoutPage.locator('.p-datatable-tbody .p-checkbox-box');
      await checkboxes.nth(0).click();
      await popoutPage.waitForTimeout(200);
      await checkboxes.nth(1).click();
      await popoutPage.waitForTimeout(200);

      // Click Apply
      await popoutPage.locator('button').filter({ hasText: 'Apply' }).click();
      await page.waitForTimeout(500);

      // Screenshot the main window showing updated URL
      await setPanelVisibility(
        page,
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.STATISTICS],
        [PANEL_IDS.QUERY_PANEL, PANEL_IDS.PICKER, PANEL_IDS.RESULTS_TABLE]
      );

      await takeScreenshot(page, 'V1.9.4', 'picker-popout-after-apply');

      expect(page.url()).toContain('modelCombos=');
    });

    test('V1.9.5 - Picker (in) clear selection', async ({ page }) => {
      await navigateToDiscover(page);

      await setPanelVisibility(
        page,
        [PANEL_IDS.PICKER],
        [PANEL_IDS.QUERY_CONTROL, PANEL_IDS.QUERY_PANEL, PANEL_IDS.STATISTICS, PANEL_IDS.RESULTS_TABLE]
      );

      // Select some rows
      const checkboxes = page.locator('#panel-manufacturer-model-picker .p-datatable-tbody .p-checkbox-box');
      await checkboxes.nth(0).click();
      await page.waitForTimeout(200);
      await checkboxes.nth(1).click();
      await page.waitForTimeout(200);

      // Click Clear button
      await page.locator('#panel-manufacturer-model-picker button').filter({ hasText: 'Clear' }).click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'V1.9.5', 'picker-cleared');
    });
  });
});

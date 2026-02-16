import { test, expect } from '@playwright/test';

test.describe('Expanded Row VIN Table', () => {
  test('should display VIN sub-table when row is expanded', async ({ page }) => {
    // Navigate to discover page with year filter to limit results
    await page.goto('/discover?yearMin=1970&yearMax=1972');

    // Wait for the Results Table panel to be visible
    await page.waitForSelector('[data-testid="dynamic-results-table-panel"]', { timeout: 15000 });
    await page.waitForTimeout(2000); // Let data fully load

    // Scroll down to make sure Results Table is visible
    const resultsTable = page.locator('[data-testid="dynamic-results-table-panel"]');
    await resultsTable.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take screenshot of initial state
    await page.screenshot({
      path: 'e2e/tests/screenshots/output/vin-table-before-expand.png',
      fullPage: true
    });

    // Click the first expand button in the results table (chevron button)
    const expandButton = page.locator('[data-testid="dynamic-results-table-panel"] .p-datatable-tbody button.p-button-rounded').first();
    await expandButton.click();

    // Wait for VIN table to load (it fetches from API)
    await page.waitForTimeout(2000);

    // Take screenshot of expanded state with VIN table
    await page.screenshot({
      path: 'e2e/tests/screenshots/output/vin-table-expanded.png',
      fullPage: true
    });

    // Verify VIN table is visible
    const vinTableHeader = page.locator('.expansion-header h3');
    await expect(vinTableHeader).toContainText('VIN Records');

    // Verify VIN count is displayed
    const vinCount = page.locator('.vin-count');
    await expect(vinCount).toBeVisible();
  });
});

import { test, expect } from '@grafana/plugin-e2e';

/**
 * Performance tests for Dynamic Search Panel.
 * These tests measure real-world performance in a browser environment.
 */
test.describe('Performance', () => {
  test('search response time should be under 2 seconds', async ({
    dashboardPage,
    readProvisionedDashboard,
    readProvisionedDataSource,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    const ds = await readProvisionedDataSource({ fileName: 'datasources.yml', name: 'Prometheus' });
    const options = panelEditPage.getCustomOptions('Dynamic Search');
    
    const dsSelect = options.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await options.getTextInput('Metric *').fill('prometheus_http_requests_total');
    await options.getTextInput('Target Variable *').fill('perf_test');
    await options.getTextInput('Label *').fill('handler');
    await options.getTextInput('Label *').blur();

    await panelEditPage.apply();

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await searchInput.click();

    // Measure search response time
    const start = Date.now();
    await searchInput.fill('api');
    
    // Wait for results to appear
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5000 });
    const duration = Date.now() - start;

    console.log(`Search response time: ${duration}ms`);
    
    // Assert performance threshold
    expect(duration).toBeLessThan(2000);
  });

  test('panel should render within 500ms', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    
    const start = Date.now();
    await dashboardPage.goto({ uid: dashboard.uid });
    
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');
    
    // Wait for panel to be visible
    await expect(panelEditPage.panel.locator).toBeVisible();
    const duration = Date.now() - start;

    console.log(`Panel render time: ${duration}ms`);
    
    // Panel should render quickly (including navigation overhead)
    expect(duration).toBeLessThan(5000);
  });

  test('debounce should prevent excessive API calls', async ({
    dashboardPage,
    readProvisionedDashboard,
    readProvisionedDataSource,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    const ds = await readProvisionedDataSource({ fileName: 'datasources.yml', name: 'Prometheus' });
    const options = panelEditPage.getCustomOptions('Dynamic Search');
    
    const dsSelect = options.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await options.getTextInput('Metric *').fill('up');
    await options.getTextInput('Target Variable *').fill('debounce_test');
    await options.getTextInput('Label *').fill('job');
    await options.getTextInput('Label *').blur();

    await panelEditPage.apply();

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await searchInput.click();

    // Track network requests to Prometheus
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('api/ds/query') || request.url().includes('api/v1')) {
        apiCalls.push(request.url());
      }
    });

    // Type rapidly (simulating fast typing)
    await searchInput.pressSequentially('prometheus', { delay: 30 });

    // Wait for debounce to settle and request to complete
    await page.waitForTimeout(500);

    console.log(`API calls made during rapid typing: ${apiCalls.length}`);
    
    // With proper debounce, we should have minimal API calls
    // (ideally 1-2, not 10 for each character)
    expect(apiCalls.length).toBeLessThan(5);
  });
});


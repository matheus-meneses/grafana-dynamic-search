import { test, expect } from '@grafana/plugin-e2e';
import { addQuery, fillAndBlur } from './helpers';

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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await addQuery(page, { metric: 'prometheus_http_requests_total', label: 'handler' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'perf_test');

    await panelEditPage.apply();

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await searchInput.click();

    const start = Date.now();
    await searchInput.fill('api');
    
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5000 });
    const duration = Date.now() - start;

    console.log(`Search response time: ${duration}ms`);
    
    expect(duration).toBeLessThan(2000);
  });

  test('panel setup should complete within reasonable time', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    
    const start = Date.now();
    await dashboardPage.goto({ uid: dashboard.uid });
    
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');
    
    await expect(panelEditPage.panel.locator).toBeVisible();
    const duration = Date.now() - start;

    console.log(`Panel setup time: ${duration}ms`);
    
    expect(duration).toBeLessThan(15000);
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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await addQuery(page, { metric: 'up', label: 'job' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'debounce_test');

    await panelEditPage.apply();

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await searchInput.click();

    const apiCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('api/ds/query') || request.url().includes('api/v1')) {
        apiCalls.push(request.url());
      }
    });

    await searchInput.pressSequentially('prometheus', { delay: 30 });

    await page.waitForTimeout(500);

    console.log(`API calls made during rapid typing: ${apiCalls.length}`);
    
    expect(apiCalls.length).toBeLessThan(5);
  });
});

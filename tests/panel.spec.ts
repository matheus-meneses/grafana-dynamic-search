import { test, expect, DataSourcePicker } from '@grafana/plugin-e2e';

test.describe('Dynamic Search Panel', () => {
  
 

  // Test case 2: Verify the panel renders correctly when fully configured
  test('should display search container when properly configured', async ({
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
    // Interact directly with the combobox
    const dsSelect = options.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    // Configure required options
    await options.getTextInput('Metric *').fill('up');
    await options.getTextInput('Target Variable *').fill('test_var');
    await options.getTextInput('Label *').fill('job');
    await options.getTextInput('Label *').blur();

    // Should now show the main wrapper and search container
    // We wait for the warning to disappear first to ensure state transition
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).not.toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-select-container')).toBeVisible();
  });

  
});

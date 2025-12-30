import { test, expect } from '@grafana/plugin-e2e';

test.describe('Dynamic Search Panel', () => {
  
  // Test case 1: Verify the panel shows a warning when it lacks configuration
  test('should display configuration warning when panel is not configured', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    
    // Add a NEW panel to ensure it starts clean/unconfigured
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    // Wait for the panel to render its content
    await expect(panelEditPage.panel.locator).toBeVisible();

    // Since it's a new panel, it should be missing config (Datasource, Metric, etc.)
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();
    await expect(page.getByText('Configuration required')).toBeVisible();
  });

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

  // Test case 3: Verify hint text logic
  test('should display and update hints', async ({
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

    // Initial config
    await options.getTextInput('Metric *').fill('up');
    await options.getTextInput('Target Variable *').fill('test_var');
    await options.getTextInput('Label *').fill('job');
    await options.getTextInput('Label *').blur();

    // Verify default hint
    const hint = page.getByTestId('dynamic-search-panel-hint');
    await expect(hint).toContainText('Min 3 chars');

    // Update Min Characters
    const minCharsInput = options.getNumberInput('Min Characters');
    await minCharsInput.fill('5');
    await minCharsInput.blur();
    await expect(hint).toContainText('Min 5 chars');

    // Update Max Results
    const maxResultsInput = options.getNumberInput('Max Results');
    await maxResultsInput.fill('10');
    await maxResultsInput.blur();
    await expect(hint).toContainText('Max 10');
  });

  // Test case 4: Verify label requirement logic
  test('should show warning if label is missing for label_values query type', async ({
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
    await options.getTextInput('Target Variable *').fill('test_var');
    // Ensure Label is empty (it is by default, but to be sure)
    await options.getTextInput('Label *').fill('');
    await options.getTextInput('Label *').blur();

    // By default query type is label_values. 
    // If we don't provide a label, it should warn.
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    // Now provide a label
    await options.getTextInput('Label *').fill('instance');
    await options.getTextInput('Label *').blur();
    
    // Warning should disappear
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).not.toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
  });

  // Test case 5: Verify Label is not required for label_names query type
  test('should not require label for label_names query type', async ({
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
    await options.getTextInput('Target Variable *').fill('test_var');
    await options.getTextInput('Label *').fill(''); // Empty label
    await options.getTextInput('Label *').blur();

    // Should warn initially because default is label_values
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    // Change Query Type to Label names
    const queryTypeSelect = options.getSelect('Query type');
    await queryTypeSelect.selectOption('Label names');

    // Warning should disappear
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).not.toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
  });

  // Test case 6: Verify Regex validation
  test('should display error for invalid regex', async ({
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
    await options.getTextInput('Target Variable *').fill('test_var');
    await options.getTextInput('Label *').fill('job');
    await options.getTextInput('Label *').blur();

    // Configure invalid regex
    const regexInput = options.element.getByPlaceholder('e.g. /api/(.*)');
    await regexInput.fill('[invalid');
    await regexInput.blur();

    // Verify error message
    await expect(page.getByTestId('dynamic-search-panel-regex-error')).toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-regex-error')).toContainText('Invalid regex');
  });

  // Test case 7: Verify Label field visibility
  test('should hide label field when query type is not label_values', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');
    
    const options = panelEditPage.getCustomOptions('Dynamic Search');
    
    // Default is label_values, Label field should be visible
    await expect(options.getTextInput('Label *')).toBeVisible();
    
    // Change to 'Metrics'
    const queryTypeSelect = options.getSelect('Query type');
    await queryTypeSelect.selectOption('Metrics');
    
    // Label field should be hidden
    await expect(options.getTextInput('Label *')).not.toBeVisible();
    
    // Change back to 'Label values'
    await queryTypeSelect.selectOption('Label values');
    await expect(options.getTextInput('Label *')).toBeVisible();
  });

  // Test case 8: Search with real data (Provisioned Dashboard)
  test('should search and update variable with real data', async ({
    dashboardPage,
    readProvisionedDashboard,
    readProvisionedDataSource,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    
    // Manually configure the panel to be robust against provisioning latency
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    const ds = await readProvisionedDataSource({ fileName: 'datasources.yml', name: 'Prometheus' });
    const options = panelEditPage.getCustomOptions('Dynamic Search');
    
    const dsSelect = options.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await options.getTextInput('Metric *').fill('prometheus_http_requests_total');
    await options.getTextInput('Target Variable *').fill('api');
    await options.getTextInput('Label *').fill('handler');
    await options.getTextInput('Label *').blur();
    
    // Return to dashboard to test the panel in view mode
    await panelEditPage.apply();

    // The dashboard is already configured with prometheus, handler, etc.
    // We just need to find the panel and interact with it.
    
    // In viewing mode, we can look for the panel wrapper directly
    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await searchInput.click();
    
    // Type "api" to search for handlers like /api/v1/query
    await searchInput.fill('api');
    
    // Wait for results to load from Prometheus
    // Prometheus usually has /api/v1/query or similar
    const option = page.getByRole('option').first();
    await expect(option).toBeVisible();
    
    // Click the first option
    await option.click();

    // Verify the URL is updated with the variable "api"
    await expect(page).toHaveURL(/var-api=/);
  });
});

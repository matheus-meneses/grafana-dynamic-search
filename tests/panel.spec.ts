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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('up');
    await variableOptions.getTextInput('Target Variable *').fill('test_var');
    await queryOptions.getTextInput('Label *').fill('job');
    await queryOptions.getTextInput('Label *').blur();

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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');
    const displayOptions = panelEditPage.getCustomOptions('Display');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('up');
    await variableOptions.getTextInput('Target Variable *').fill('test_var');
    await queryOptions.getTextInput('Label *').fill('job');
    await queryOptions.getTextInput('Label *').blur();

    const hint = page.getByTestId('dynamic-search-panel-hint');
    await expect(hint).toContainText('Min 3 chars');

    const minCharsInput = displayOptions.getNumberInput('Min Characters');
    await minCharsInput.fill('5');
    await minCharsInput.blur();
    await expect(hint).toContainText('Min 5 chars');

    const maxResultsInput = displayOptions.getNumberInput('Max Results');
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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('up');
    await variableOptions.getTextInput('Target Variable *').fill('test_var');
    await queryOptions.getTextInput('Label *').fill('');
    await queryOptions.getTextInput('Label *').blur();

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    await queryOptions.getTextInput('Label *').fill('instance');
    await queryOptions.getTextInput('Label *').blur();
    
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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('up');
    await variableOptions.getTextInput('Target Variable *').fill('test_var');
    await queryOptions.getTextInput('Label *').fill('');
    await queryOptions.getTextInput('Label *').blur();

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    const queryTypeSelect = queryOptions.getSelect('Query type');
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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');
    const transformOptions = panelEditPage.getCustomOptions('Transform');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('up');
    await variableOptions.getTextInput('Target Variable *').fill('test_var');
    await queryOptions.getTextInput('Label *').fill('job');
    await queryOptions.getTextInput('Label *').blur();

    const regexInput = transformOptions.element.getByPlaceholder('e.g. /api/(.*)');
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
    
    const queryOptions = panelEditPage.getCustomOptions('Query');
    
    await expect(queryOptions.getTextInput('Label *')).toBeVisible();
    
    const queryTypeSelect = queryOptions.getSelect('Query type');
    await queryTypeSelect.selectOption('Metrics');
    
    await expect(queryOptions.getTextInput('Label *')).not.toBeVisible();
    
    await queryTypeSelect.selectOption('Label values');
    await expect(queryOptions.getTextInput('Label *')).toBeVisible();
  });

  // Test case 8: Verify custom placeholder text
  test('should display custom placeholder text', async ({
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
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');
    const displayOptions = panelEditPage.getCustomOptions('Display');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('up');
    await variableOptions.getTextInput('Target Variable *').fill('test_var');
    await queryOptions.getTextInput('Label *').fill('job');
    await queryOptions.getTextInput('Label *').blur();

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await expect(searchInput).toHaveAttribute('placeholder', 'Type to search...');

    const placeholderInput = displayOptions.getTextInput('Placeholder');
    await placeholderInput.fill('Search for a job...');
    await placeholderInput.blur();

    await expect(searchInput).toHaveAttribute('placeholder', 'Search for a job...');
  });

  // Test case 9: Verify search mode selection
  test('should display search mode options', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    const displayOptions = panelEditPage.getCustomOptions('Display');
    const searchModeSelect = displayOptions.getSelect('Search Mode');

    await searchModeSelect.selectOption('Starts with');
    await searchModeSelect.selectOption('Exact match');
    await searchModeSelect.selectOption('Contains');
  });

  // Test case 10: Search with real data (Provisioned Dashboard)
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
    
    const dataSourceOptions = panelEditPage.getCustomOptions('Data Source');
    const queryOptions = panelEditPage.getCustomOptions('Query');
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select a data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await queryOptions.getTextInput('Metric *').fill('prometheus_http_requests_total');
    await variableOptions.getTextInput('Target Variable *').fill('api');
    await queryOptions.getTextInput('Label *').fill('handler');
    await queryOptions.getTextInput('Label *').blur();
    
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

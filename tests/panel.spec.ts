import { test, expect, Page, Locator } from '@grafana/plugin-e2e';

async function addQuery(page: Page, opts: { metric: string; label?: string }) {
  await page.getByTestId('add-query-button').click();
  const queryCard = page.getByTestId('query-card-0');
  await queryCard.getByPlaceholder('e.g., up, http_requests_total').fill(opts.metric);
  if (opts.label !== undefined && opts.label !== '') {
    await queryCard.getByPlaceholder('e.g., job, instance, handler').fill(opts.label);
  }
  return queryCard;
}

async function fillAndBlur(locator: Locator, value: string) {
  await locator.fill(value);
  await locator.blur();
}

test.describe('Dynamic Search Panel', () => {
  
  test('should display configuration warning when panel is not configured', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    await expect(panelEditPage.panel.locator).toBeVisible();

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();
    await expect(page.getByText('Configuration required')).toBeVisible();
  });

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
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await addQuery(page, { metric: 'up', label: 'job' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'test_var');

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).not.toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-select-container')).toBeVisible();
  });

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
    const variableOptions = panelEditPage.getCustomOptions('Variable');
    const displayOptions = panelEditPage.getCustomOptions('Display');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await addQuery(page, { metric: 'up', label: 'job' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'test_var');

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
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    const queryCard = await addQuery(page, { metric: 'up' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'test_var');

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    await fillAndBlur(queryCard.getByPlaceholder('e.g., job, instance, handler'), 'instance');
    
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).not.toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
  });

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
    const variableOptions = panelEditPage.getCustomOptions('Variable');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    const queryCard = await addQuery(page, { metric: 'up' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'test_var');

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    await queryCard.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Label names' }).click();

    await expect(page.getByTestId('dynamic-search-panel-config-warning')).not.toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
  });

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
    const variableOptions = panelEditPage.getCustomOptions('Variable');
    const transformOptions = panelEditPage.getCustomOptions('Transform');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await addQuery(page, { metric: 'up', label: 'job' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'test_var');

    const regexInput = transformOptions.element.getByPlaceholder('e.g. /api/(.*)');
    await regexInput.fill('[invalid');
    await regexInput.blur();

    await expect(page.getByTestId('dynamic-search-panel-regex-error')).toBeVisible();
    await expect(page.getByTestId('dynamic-search-panel-regex-error')).toContainText('Invalid regex');
  });

  test('should hide label field when query type is not label_values', async ({
    dashboardPage,
    readProvisionedDashboard,
    page,
  }) => {
    const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
    await dashboardPage.goto({ uid: dashboard.uid });
    const panelEditPage = await dashboardPage.addPanel();
    await panelEditPage.setVisualization('Dynamic Search');

    await page.getByTestId('add-query-button').click();
    const queryCard = page.getByTestId('query-card-0');
    const labelInput = queryCard.getByPlaceholder('e.g., job, instance, handler');

    await expect(labelInput).toBeVisible();
    
    await queryCard.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Metrics' }).click();
    
    await expect(labelInput).not.toBeVisible();
    
    await queryCard.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Label values' }).click();
    await expect(labelInput).toBeVisible();
  });

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
    const variableOptions = panelEditPage.getCustomOptions('Variable');
    const displayOptions = panelEditPage.getCustomOptions('Display');

    const dsSelect = dataSourceOptions.element.getByRole('combobox', { name: 'Select data source' });
    await dsSelect.click();
    await page.getByRole('option', { name: ds.name }).click();

    await addQuery(page, { metric: 'up', label: 'job' });
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'test_var');

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await expect(searchInput).toHaveAttribute('placeholder', 'Type to search...');

    const placeholderInput = displayOptions.getTextInput('Placeholder');
    await placeholderInput.fill('Search for a job...');
    await placeholderInput.blur();

    await expect(searchInput).toHaveAttribute('placeholder', 'Search for a job...');
  });

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

  test('should search and update variable with real data', async ({
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
    await fillAndBlur(variableOptions.getTextInput('Target Variable *'), 'api');
    
    await panelEditPage.apply();

    const searchWrapper = page.getByTestId('dynamic-search-panel-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchInput = searchWrapper.getByRole('combobox');
    await searchInput.click();
    
    await searchInput.fill('api');
    
    const option = page.getByRole('option').first();
    await expect(option).toBeVisible();
    
    await option.click();

    await expect(page).toHaveURL(/var-api=/);
  });
});

import { test, expect } from '@grafana/plugin-e2e';

test('should display configuration warning when panel is not configured', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });
  await expect(panelEditPage.panel.locator.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();
});

test('should display search container when configured', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Grafana-Dynamic-Search');
  
  // Set required options to make sure panel is configured
  const options = panelEditPage.getCustomOptions('Grafana-Dynamic-Search');
  await options.getTextInput('Metric *').fill('up');
  await options.getTextInput('Target Variable *').fill('test_var');

  await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
  await expect(page.getByTestId('dynamic-search-panel-select-container')).toBeVisible();
});

test('should display hint about minimum characters', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Grafana-Dynamic-Search');
  
  // Set required options
  const options = panelEditPage.getCustomOptions('Grafana-Dynamic-Search');
  await options.getTextInput('Metric *').fill('up');
  await options.getTextInput('Target Variable *').fill('test_var');

  await expect(page.getByTestId('dynamic-search-panel-hint')).toContainText('Min 3 characters');
});

test('should update hint when min characters option is changed', async ({
    panelEditPage,
    readProvisionedDataSource,
    page,
  }) => {
    const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
    await panelEditPage.datasource.set(ds.name);
    await panelEditPage.setVisualization('Grafana-Dynamic-Search');
    
    const options = panelEditPage.getCustomOptions('Grafana-Dynamic-Search');
    await options.getTextInput('Metric *').fill('up');
    await options.getTextInput('Target Variable *').fill('test_var');
    
    // Change min characters to 5
    const minCharsInput = options.locator.getByLabel('Min Characters');
    await minCharsInput.fill('5');
  
    await expect(page.getByTestId('dynamic-search-panel-hint')).toContainText('Min 5 characters');
  });

  test('should display max results hint when configured', async ({
    panelEditPage,
    readProvisionedDataSource,
    page,
  }) => {
    const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
    await panelEditPage.datasource.set(ds.name);
    await panelEditPage.setVisualization('Grafana-Dynamic-Search');
    
    const options = panelEditPage.getCustomOptions('Grafana-Dynamic-Search');
    await options.getTextInput('Metric *').fill('up');
    await options.getTextInput('Target Variable *').fill('test_var');
    
    // Set max results to 10
    const maxResultsInput = options.locator.getByLabel('Max Results');
    await maxResultsInput.fill('10');
  
    await expect(page.getByTestId('dynamic-search-panel-hint')).toContainText('Max 10 results');
  });

  test('should require label for label_values query', async ({
    panelEditPage,
    readProvisionedDataSource,
    page,
  }) => {
    const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
    await panelEditPage.datasource.set(ds.name);
    await panelEditPage.setVisualization('Grafana-Dynamic-Search');
    
    const options = panelEditPage.getCustomOptions('Grafana-Dynamic-Search');
    await options.getTextInput('Metric *').fill('up');
    await options.getTextInput('Target Variable *').fill('test_var');
    
    // Default query type is label_values, clear the default label 'job'
    await options.getTextInput('Label *').fill('');

    // Should show config warning because label is missing
    await expect(page.getByTestId('dynamic-search-panel-config-warning')).toBeVisible();

    // Fill label again
    await options.getTextInput('Label *').fill('instance');
    
    // Should show panel now
    await expect(page.getByTestId('dynamic-search-panel-wrapper')).toBeVisible();
  });

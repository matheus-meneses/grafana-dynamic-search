import { Page, Locator } from '@grafana/plugin-e2e';

export async function addQuery(page: Page, opts: { metric: string; label?: string }) {
  await page.getByTestId('add-query-button').click();
  const queryCard = page.getByTestId('query-card-0');
  await queryCard.getByPlaceholder('e.g., up, http_requests_total').fill(opts.metric);
  if (opts.label !== undefined && opts.label !== '') {
    await queryCard.getByPlaceholder('e.g., job, instance, handler').fill(opts.label);
  }
  return queryCard;
}

export async function fillAndBlur(locator: Locator, value: string) {
  await locator.fill(value);
  await locator.blur();
}

import { test, expect } from '@playwright/test';
import { dismissWelcomeModal, loadTemplate, clickNode, waitForCompilation, collectConsoleErrors } from './helpers';

test.describe('Trigger Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWelcomeModal(page);
    // Load Issue Triage so trigger node is visible
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);
    await clickNode(page, 'trigger');
  });

  test('shows event type grid with trigger options', async ({ page }) => {
    // Should see section title "Event Type"
    await expect(page.getByText('Event Type')).toBeVisible();

    // Should have trigger option buttons (using labels from fieldDescriptions)
    await expect(page.locator('.panel__section button').filter({ hasText: 'Issue activity' })).toBeVisible();
    await expect(page.locator('.panel__section button').filter({ hasText: 'Pull request activity' })).toBeVisible();
    await expect(page.locator('.panel__section button').filter({ hasText: 'On a schedule' })).toBeVisible();
  });

  test('selecting "issues" event shows activity types', async ({ page }) => {
    // Issues is already selected from Issue Triage template
    // Activity types should be visible
    await expect(page.getByText('Activity Types')).toBeVisible();
    // Use exact match to avoid matching "opened, reopened" chip summary
    await expect(page.getByText('opened', { exact: true })).toBeVisible();
    await expect(page.getByText('closed', { exact: true })).toBeVisible();
    await expect(page.getByText('reopened', { exact: true })).toBeVisible();
  });

  test('selecting "pull_request" event shows PR activity types', async ({ page }) => {
    // Click the Pull Request event card
    await page.locator('.panel__section button').filter({ hasText: 'Pull request activity' }).click();

    await expect(page.getByText('Activity Types')).toBeVisible();
    await expect(page.getByText('synchronize', { exact: true })).toBeVisible();
    await expect(page.getByText('ready_for_review', { exact: true })).toBeVisible();
  });

  test('selecting "schedule" event shows cron input', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.locator('.panel__section button').filter({ hasText: 'On a schedule' }).click();

    // Should show cron schedule input
    await expect(page.getByPlaceholder('e.g. 0 0 * * *')).toBeVisible();

    // Should show preset buttons
    await expect(page.getByRole('button', { name: 'Every hour' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Daily at midnight' })).toBeVisible();

    // Click a preset
    await page.getByRole('button', { name: 'Daily at midnight' }).click();
    await expect(page.getByPlaceholder('e.g. 0 0 * * *')).toHaveValue('0 0 * * *');

    const realErrors = errors.filter(
      (e) => !e.includes('React') && !e.includes('Warning') && !e.includes('DevTools'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('selecting "slash_command" shows command name input', async ({ page }) => {
    await page.locator('.panel__section button').filter({ hasText: 'Slash command' }).click();

    // Should show command name input
    await expect(page.getByText('Command Name')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. review')).toBeVisible();

    // Type a command name
    await page.getByPlaceholder('e.g. review').fill('deploy');

    // Helper text should reflect the command
    await expect(page.getByText('/deploy')).toBeVisible();
  });

  test('activity types can be toggled on and off', async ({ page }) => {
    // Issues event is already selected. Click "edited" activity type chip to select it
    const editedChip = page.getByText('edited', { exact: true });
    await editedChip.click();

    // Click again to deselect
    await editedChip.click();
  });

  test('switching event types shows different controls', async ({ page }) => {
    // Issues already selected, showing Activity Types
    await expect(page.getByText('Activity Types')).toBeVisible();

    // Switch to schedule
    await page.locator('.panel__section button').filter({ hasText: 'On a schedule' }).click();

    // Cron input should appear instead of activity types
    await expect(page.getByPlaceholder('e.g. 0 0 * * *')).toBeVisible();
  });
});

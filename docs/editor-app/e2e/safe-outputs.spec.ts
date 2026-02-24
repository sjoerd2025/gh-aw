import { test, expect } from '@playwright/test';
import { dismissWelcomeModal, loadTemplate, clickNode, waitForCompilation, collectConsoleErrors } from './helpers';

test.describe('Safe Outputs Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWelcomeModal(page);
    // Load Issue Triage so the safeOutputs node is visible on canvas
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);
    await clickNode(page, 'safeOutputs');
  });

  // Scope count assertions to the properties panel to avoid matching the canvas node summary
  function panelCountText(page: import('@playwright/test').Page, text: string) {
    return page.getByLabel('Node properties').getByText(text);
  }

  test('shows actions enabled count', async ({ page }) => {
    // Issue Triage has add-labels and add-comment enabled = 2 actions
    await expect(panelCountText(page, '2 actions enabled')).toBeVisible();
  });

  test('toggling an output changes the count', async ({ page }) => {
    // Currently 2 actions enabled. Find the "Add Comments" checkbox and uncheck it
    const checkbox = page.locator('label').filter({ hasText: /^Add Comments/ }).first().locator('input[type="checkbox"]');
    await checkbox.uncheck();

    await expect(panelCountText(page, '1 action enabled')).toBeVisible();

    // Toggle it back on
    await checkbox.check();
    await expect(panelCountText(page, '2 actions enabled')).toBeVisible();
  });

  test('toggling multiple outputs updates count correctly', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    // Start with 2 (add-labels + add-comment). Enable create-issue
    const createIssueCheckbox = page.locator('label').filter({ hasText: /^Create Issues/ }).first().locator('input[type="checkbox"]');
    await createIssueCheckbox.check();

    await expect(panelCountText(page, '3 actions enabled')).toBeVisible();

    // Disable it again
    await createIssueCheckbox.uncheck();
    await expect(panelCountText(page, '2 actions enabled')).toBeVisible();

    const realErrors = errors.filter(
      (e) => !e.includes('React') && !e.includes('Warning') && !e.includes('DevTools'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('Advanced section can be expanded', async ({ page }) => {
    // The Advanced section should exist
    const advancedButton = page.getByRole('button', { name: /Advanced/i });
    await expect(advancedButton).toBeVisible();

    // Click to expand
    await advancedButton.click();

    // Should now show advanced categories like Labels, Projects, Discussions
    const sectionTitles = page.locator('.panel__section-title');
    const allTitles = await sectionTitles.allTextContents();
    expect(allTitles).toContain('Labels');
    expect(allTitles).toContain('Projects');
    expect(allTitles).toContain('Discussions');
  });

  test('toggling advanced outputs updates count badge', async ({ page }) => {
    // Expand Advanced section
    const advancedButton = page.getByRole('button', { name: /Advanced/i });
    await advancedButton.click();

    // Toggle a truly advanced output: "Create Projects" is in Projects category
    const createProjectCheckbox = page.locator('label').filter({ hasText: /^Create Projects/ }).first().locator('input[type="checkbox"]');
    await createProjectCheckbox.check();

    // Total count should update (was 2, now 3)
    await expect(panelCountText(page, '3 actions enabled')).toBeVisible();
  });
});

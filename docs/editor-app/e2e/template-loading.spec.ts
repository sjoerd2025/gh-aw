import { test, expect } from '@playwright/test';
import { dismissWelcomeModal, loadTemplate, waitForCompilation, collectConsoleErrors } from './helpers';

test.describe('Template Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWelcomeModal(page);
  });

  const templates = [
    { name: 'Issue Triage' },
    { name: 'PR Fix' },
    { name: 'Daily Doc Updater' },
    { name: 'CI Doctor' },
    { name: 'Q - Slash Command' },
    { name: 'Daily Test Improver' },
  ];

  for (const tmpl of templates) {
    test(`loads "${tmpl.name}" template without console errors`, async ({ page }) => {
      const errors = collectConsoleErrors(page);

      await loadTemplate(page, tmpl.name);
      await waitForCompilation(page);

      // Verify no uncaught console errors (filter out benign React/DevTools warnings)
      const realErrors = errors.filter(
        (e) =>
          !e.includes('React') &&
          !e.includes('Warning') &&
          !e.includes('DevTools') &&
          !e.includes('favicon'),
      );
      expect(realErrors).toHaveLength(0);
    });
  }

  test('Issue Triage template compiles to Ready status', async ({ page }) => {
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // Issue Triage is a well-formed template that should compile cleanly
    const statusBadge = page.locator('[aria-label^="Compilation status"]');
    const statusText = await statusBadge.textContent();
    expect(statusText).not.toContain('Error');
  });

  test('loads "Blank Canvas" template', async ({ page }) => {
    await loadTemplate(page, 'Blank Canvas');
    // Blank canvas should not cause errors
    await page.waitForTimeout(500);
  });

  test('template populates workflow name', async ({ page }) => {
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // The workflow name input should have a value
    const nameInput = page.getByLabel('Workflow name');
    await expect(nameInput).toHaveValue('issue-triage');
  });

  test('switching between templates replaces content', async ({ page }) => {
    // Load first template
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    const nameInput = page.getByLabel('Workflow name');
    await expect(nameInput).toHaveValue('issue-triage');

    // Load second template
    await loadTemplate(page, 'PR Fix');
    await waitForCompilation(page);

    await expect(nameInput).toHaveValue('pr-fix');
  });
});

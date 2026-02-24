import { test, expect } from '@playwright/test';
import { dismissWelcomeModal, loadTemplate, clickNode, waitForCompilation, collectConsoleErrors } from './helpers';

test.describe('Tool Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWelcomeModal(page);
    // Load Issue Triage so tools node is visible (has github and web-fetch)
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);
    // Open tools panel
    await clickNode(page, 'tools');
  });

  test('can toggle a tool on and off without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    // Bash is off initially in Issue Triage, toggle it on
    const bashCard = page.locator('.tool-card').filter({ hasText: 'Terminal Commands' }).first();
    await bashCard.click();
    await expect(bashCard).toHaveClass(/active/);

    // Toggle off
    await bashCard.click();
    await expect(bashCard).not.toHaveClass(/active/);

    const realErrors = errors.filter(
      (e) => !e.includes('React') && !e.includes('Warning') && !e.includes('DevTools'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('toggling tool on shows it as active', async ({ page }) => {
    // Toggle bash tool on (it uses label "Terminal Commands")
    const bashCard = page.locator('.tool-card').filter({ hasText: 'Terminal Commands' }).first();
    await bashCard.click();
    await expect(bashCard).toHaveClass(/active/);
  });

  test('toggling tool off removes active state', async ({ page }) => {
    // bash is off; toggle it on then off
    const bashCard = page.locator('.tool-card').filter({ hasText: 'Terminal Commands' }).first();
    await bashCard.click();
    await expect(bashCard).toHaveClass(/active/);

    await bashCard.click();
    await expect(bashCard).not.toHaveClass(/active/);
  });

  test('pre-loaded template has correct tools enabled', async ({ page }) => {
    // Issue Triage has web-fetch and github
    const githubCard = page.locator('.tool-card').filter({ hasText: 'GitHub' }).first();
    await expect(githubCard).toHaveClass(/active/);

    const webFetchCard = page.locator('.tool-card').filter({ hasText: 'Web Fetcher' }).first();
    await expect(webFetchCard).toHaveClass(/active/);

    // bash should NOT be active
    const bashCard = page.locator('.tool-card').filter({ hasText: 'Terminal Commands' }).first();
    await expect(bashCard).not.toHaveClass(/active/);
  });

  test('multiple tools can be enabled simultaneously', async ({ page }) => {
    // Enable a few more tools
    const bashCard = page.locator('.tool-card').filter({ hasText: 'Terminal Commands' }).first();
    await bashCard.click();
    await expect(bashCard).toHaveClass(/active/);

    const editCard = page.locator('.tool-card').filter({ hasText: 'File Editor' }).first();
    await editCard.click();
    await expect(editCard).toHaveClass(/active/);

    // Previously enabled tools should still be active
    const githubCard = page.locator('.tool-card').filter({ hasText: 'GitHub' }).first();
    await expect(githubCard).toHaveClass(/active/);
  });

  test('toggling all tools on and off does not crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const allToolCards = page.locator('.tool-card');
    const count = await allToolCards.count();

    // Toggle all tools on
    for (let i = 0; i < count; i++) {
      const card = allToolCards.nth(i);
      const isActive = await card.evaluate((el) => el.classList.contains('active'));
      if (!isActive) {
        await card.click();
      }
    }

    // Toggle all tools off
    for (let i = 0; i < count; i++) {
      const card = allToolCards.nth(i);
      await card.click();
    }

    const realErrors = errors.filter(
      (e) => !e.includes('React') && !e.includes('Warning') && !e.includes('DevTools'),
    );
    expect(realErrors).toHaveLength(0);
  });
});

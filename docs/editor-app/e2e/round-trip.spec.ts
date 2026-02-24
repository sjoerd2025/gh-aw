import { test, expect } from '@playwright/test';
import { dismissWelcomeModal, loadTemplate, waitForCompilation, clickNode, collectConsoleErrors } from './helpers';

test.describe('Round Trip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWelcomeModal(page);
  });

  test('Issue Triage template produces valid markdown with frontmatter fields', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // Copy markdown to clipboard to inspect it
    await page.getByLabel('Export workflow').click();
    await page.locator('[role="menuitem"]').filter({ hasText: 'Copy Markdown' }).click();

    const markdown = await page.evaluate(() => navigator.clipboard.readText());

    // Should contain YAML frontmatter
    expect(markdown).toContain('---');
    // Should contain key fields
    expect(markdown).toContain('name:');
    expect(markdown).toContain('on:');
    expect(markdown).toContain('engine:');
    expect(markdown).toContain('tools:');
    expect(markdown).toContain('safe-outputs:');
  });

  test('switching to Editor mode shows markdown content', async ({ page }) => {
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // Switch to Editor mode
    await page.getByRole('radio', { name: 'Code editor' }).click();

    // Should see the editor view with markdown content
    await expect(page.locator('.editor-view')).toBeVisible({ timeout: 5_000 });
  });

  test('switching back to Visual mode preserves state', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // Switch to Editor mode
    await page.getByRole('radio', { name: 'Code editor' }).click();
    await page.waitForTimeout(500);

    // Switch back to Visual mode
    await page.getByRole('radio', { name: 'Visual editor' }).click();
    await page.waitForTimeout(500);

    // Nodes should still be present
    await expect(page.locator('.workflow-node').first()).toBeVisible();

    // Workflow name should be preserved
    const nameInput = page.getByLabel('Workflow name');
    await expect(nameInput).toHaveValue('issue-triage');

    const realErrors = errors.filter(
      (e) => !e.includes('React') && !e.includes('Warning') && !e.includes('DevTools'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('modify trigger from issues to schedule', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // Open trigger panel
    await clickNode(page, 'trigger');

    // Change trigger to schedule
    await page.locator('.panel__section button').filter({ hasText: 'On a schedule' }).click();

    // Wait for the schedule input to appear
    const cronInput = page.getByPlaceholder('e.g. 0 0 * * *');
    await expect(cronInput).toBeVisible();
    await cronInput.fill('0 */6 * * *');

    // Wait for recompilation after trigger change
    await page.waitForTimeout(1000);
    await waitForCompilation(page);

    // Export and verify markdown contains schedule
    await page.getByLabel('Export workflow').click();
    await page.locator('[role="menuitem"]').filter({ hasText: 'Copy Markdown' }).click();

    const markdown = await page.evaluate(() => navigator.clipboard.readText());
    // Verify the trigger changed - should now have schedule or cron reference
    expect(markdown).toContain('schedule');
  });

  test('modify workflow name and verify it appears in export', async ({ page }) => {
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // Change the workflow name
    const nameInput = page.getByLabel('Workflow name');
    await nameInput.clear();
    await nameInput.fill('my-custom-workflow');

    await waitForCompilation(page);

    // Export menu should reflect new name
    await page.getByLabel('Export workflow').click();
    await expect(page.getByText('my-custom-workflow.md')).toBeVisible();
    await expect(page.getByText('my-custom-workflow.lock.yml')).toBeVisible();
  });

  test('full round trip: load template, modify tools, export markdown', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // 1. Load template
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);

    // 2. Enable an additional tool
    await clickNode(page, 'tools');
    const bashCard = page.locator('.tool-card').filter({ hasText: 'Terminal Commands' }).first();
    await bashCard.click();
    await expect(bashCard).toHaveClass(/active/);

    await waitForCompilation(page);

    // 3. Copy Markdown and verify it reflects the tool change
    await page.getByLabel('Export workflow').click();
    await page.locator('[role="menuitem"]').filter({ hasText: 'Copy Markdown' }).click();

    const markdown = await page.evaluate(() => navigator.clipboard.readText());
    expect(markdown.length).toBeGreaterThan(50);
    expect(markdown).toContain('name:');
    // Should contain bash tool reference since we enabled it
    expect(markdown).toContain('bash');
  });
});

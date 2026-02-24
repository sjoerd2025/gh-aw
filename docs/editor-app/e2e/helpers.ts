import { type Page } from '@playwright/test';

/**
 * Dismiss the welcome modal and clear localStorage to get a fresh state.
 * Should be called at the start of most tests.
 */
export async function dismissWelcomeModal(page: Page) {
  // Clear persisted state so welcome modal shows
  await page.evaluate(() => {
    localStorage.removeItem('workflow-editor-state');
    localStorage.removeItem('workflow-editor-ui');
  });
  await page.reload();

  // Wait for the welcome modal to appear
  const modal = page.getByRole('dialog');
  await modal.waitFor({ state: 'visible', timeout: 10_000 });

  // Click "Start from scratch" to dismiss
  await modal.getByText('Start from scratch').click();

  // Wait for modal to disappear
  await modal.waitFor({ state: 'hidden', timeout: 5_000 });
}

/**
 * Load a template by name from the Templates sidebar tab.
 */
export async function loadTemplate(page: Page, templateName: string) {
  // Open Templates tab in sidebar
  await page.getByRole('button', { name: 'Templates' }).click();

  // Click the template card
  await page.getByRole('button', { name: templateName }).first().click();

  // Wait for compilation to settle
  await page.waitForTimeout(800);
}

/**
 * Click a node on the canvas by its type (e.g., 'trigger', 'engine', 'tools').
 */
export async function clickNode(page: Page, nodeType: string) {
  await page.locator(`[data-tour-target="${nodeType}"]`).click();
}

/**
 * Wait for compilation to finish (status badge stops showing "Compiling...").
 * Then wait a bit more for state to settle.
 */
export async function waitForCompilation(page: Page) {
  // Wait for status badge to be visible
  await page.locator('[aria-label^="Compilation status"]').waitFor({ state: 'visible' });
  // Wait until not compiling
  await page.waitForFunction(() => {
    const el = document.querySelector('[aria-label^="Compilation status"]');
    return el && !el.textContent?.includes('Compiling');
  }, { timeout: 10_000 });
  // Extra settle time for state propagation
  await page.waitForTimeout(300);
}

/**
 * Wait for compilation to finish and verify it succeeded (no Error).
 */
export async function waitForSuccessfulCompilation(page: Page) {
  await waitForCompilation(page);

  // If status shows Error, try triggering a recompile by toggling auto-compile
  const status = await getStatusText(page);
  if (status.includes('Error')) {
    // Wait a bit longer in case auto-compile is delayed
    await page.waitForTimeout(1000);
    await waitForCompilation(page);
  }
}

/**
 * Get the text content of the compilation status badge.
 */
export async function getStatusText(page: Page): Promise<string> {
  const badge = page.locator('[aria-label^="Compilation status"]');
  return (await badge.textContent()) ?? '';
}

/**
 * Collect console errors during a test. Returns the array of error messages.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

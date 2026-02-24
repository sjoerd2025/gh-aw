import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const SCREENSHOT_DIR = 'screenshots';

// Collect console errors throughout the test
const consoleErrors: string[] = [];
const consoleWarnings: string[] = [];
const pageErrors: string[] = [];

/** Bugs found during testing */
const bugs: string[] = [];

function logBug(description: string) {
  bugs.push(description);
  console.log(`🐛 BUG: ${description}`);
}

test.describe('Visual Editor Full Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to get a fresh state
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // Listen for console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[console.error] ${msg.text()}`);
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(`[console.warn] ${msg.text()}`);
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', (error) => {
      pageErrors.push(`[pageerror] ${error.message}`);
      logBug(`Uncaught page error: ${error.message}`);
    });
  });

  test('01 - Initial load and welcome modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-load.png`, fullPage: true });

    // Welcome modal should be visible
    const modalTitle = page.getByText('Welcome to the Workflow Builder!');
    await expect(modalTitle).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-welcome-modal.png`, fullPage: true });

    // Verify all 3 options
    await expect(page.getByText('Start from scratch')).toBeVisible();
    await expect(page.getByText('Browse templates')).toBeVisible();
    await expect(page.getByText('Take a guided tour')).toBeVisible();
  });

  test('02 - Dismiss welcome modal (Start from scratch)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Start from scratch"
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    // Modal should be gone
    const modalTitle = page.getByText('Welcome to the Workflow Builder!');
    await expect(modalTitle).not.toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-dismiss.png`, fullPage: true });
  });

  test('03 - Header: Visual/Editor toggle', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Click "Editor" mode
    const editorBtn = page.getByRole('radio', { name: 'Code editor' });
    await editorBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-editor-mode.png`, fullPage: true });

    // Click "Visual" mode back
    const visualBtn = page.getByRole('radio', { name: 'Visual editor' });
    await visualBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-visual-mode.png`, fullPage: true });
  });

  test('04 - Header: Workflow name editing', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    const nameInput = page.getByLabel('Workflow name');
    await nameInput.click();
    await nameInput.fill('my-test-workflow');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-workflow-name.png`, fullPage: true });
  });

  test('05 - Header: Compile button', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    const compileBtn = page.getByLabel('Compile workflow');
    await compileBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-after-compile.png`, fullPage: true });
  });

  test('06 - Header: Undo/Redo buttons', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Undo should be disabled initially
    const undoBtn = page.getByLabel('Undo (Ctrl+Z)');
    const redoBtn = page.getByLabel('Redo (Ctrl+Shift+Z)');
    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();

    // Click undo even if disabled, should not crash
    await undoBtn.click({ force: true });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-undo-redo.png`, fullPage: true });
  });

  test('07 - Header: Auto-compile checkbox', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Find the auto-compile checkbox
    const autoLabel = page.locator('label').filter({ hasText: 'Auto' });
    if (await autoLabel.isVisible()) {
      await autoLabel.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-auto-compile-toggled.png`, fullPage: true });
      // Toggle back
      await autoLabel.click();
    } else {
      logBug('Auto-compile checkbox not visible (might be hidden on small viewport)');
    }
  });

  test('08 - Header: Theme toggle', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Find and click the theme toggle
    const themeBtn = page.locator('button[title*="theme"], button[aria-label*="theme"], button[aria-label*="Theme"]');
    if (await themeBtn.count() > 0) {
      await themeBtn.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/08-dark-theme.png`, fullPage: true });

      // Toggle back
      await themeBtn.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/08-light-theme.png`, fullPage: true });
    } else {
      logBug('Theme toggle button not found');
    }
  });

  test('09 - Header: Export menu', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Click export button
    const exportBtn = page.getByLabel('Export workflow');
    await exportBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-export-menu-open.png`, fullPage: true });

    // Verify menu items
    await expect(page.getByText('Download')).toBeVisible();
    await expect(page.getByRole('menuitem').filter({ hasText: '.md' })).toBeVisible();

    // Close by clicking elsewhere
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('10 - Header: Clear canvas (with confirm dialog)', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Set up dialog handler to dismiss confirm
    page.on('dialog', dialog => dialog.dismiss());

    const clearBtn = page.getByLabel('Clear canvas');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/10-after-clear-dismiss.png`, fullPage: true });
    }
  });

  test('11 - Header: New workflow (with confirm dialog)', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    page.on('dialog', dialog => dialog.accept());

    const newBtn = page.getByLabel('Start new workflow');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-new-workflow.png`, fullPage: true });
      // Welcome modal should reappear
      const modalTitle = page.getByText('Welcome to the Workflow Builder!');
      const isBack = await modalTitle.isVisible().catch(() => false);
      if (!isBack) {
        logBug('Welcome modal did not reappear after clicking New Workflow');
      }
    }
  });

  test('12 - Sidebar: Tab switching', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    // Click Blocks tab
    await page.getByText('Blocks', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-sidebar-blocks.png`, fullPage: true });

    // Click Templates tab
    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-sidebar-templates.png`, fullPage: true });

    // Click Imports tab
    await page.getByText('Imports', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-sidebar-imports.png`, fullPage: true });
  });

  test('13 - Sidebar: Toggle open/close', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(300);

    const sidebarToggle = page.getByLabel(/Collapse sidebar|Expand sidebar/);
    if (await sidebarToggle.isVisible()) {
      // Close sidebar
      await sidebarToggle.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/13-sidebar-closed.png`, fullPage: true });

      // Open sidebar
      const expandBtn = page.getByLabel('Expand sidebar');
      if (await expandBtn.isVisible()) {
        await expandBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/13-sidebar-open.png`, fullPage: true });
      }
    }
  });

  test('14 - Templates: Load each template', async ({ page }) => {
    const templateNames = [
      'Issue Triage',
      'PR Fix',
      'Daily Doc Updater',
      'CI Doctor',
      'Q - Slash Command',
      'Daily Test Improver',
      'Blank Canvas',
    ];

    for (let i = 0; i < templateNames.length; i++) {
      // Reset state each time
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Dismiss welcome by choosing "Browse templates"
      await page.getByText('Browse templates').click();
      await page.waitForTimeout(300);

      // Click the template
      const templateCard = page.locator('button').filter({ hasText: templateNames[i] }).first();
      if (await templateCard.isVisible()) {
        await templateCard.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/14-template-${i}-${templateNames[i].replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
      } else {
        logBug(`Template "${templateNames[i]}" not found/visible`);
      }
    }
  });

  test('15 - Canvas: Click trigger node to open panel', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    // Load a template to get nodes on the canvas
    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    const issueTriageBtn = page.locator('button').filter({ hasText: 'Issue Triage' }).first();
    await issueTriageBtn.click();
    await page.waitForTimeout(500);

    // Click a node - try to find nodes by their data-id or role
    // React Flow nodes typically have class "react-flow__node"
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`Found ${nodeCount} nodes on canvas`);

    if (nodeCount === 0) {
      logBug('No nodes found on canvas after loading template');
    }

    for (let i = 0; i < nodeCount; i++) {
      const node = nodes.nth(i);
      const nodeText = await node.textContent().catch(() => '');
      await node.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/15-node-${i}-${(nodeText || 'unknown').slice(0, 20).replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
    }
  });

  test('16 - TriggerPanel: Select each event type', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    // Load Issue Triage template to get trigger node
    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Find and click the trigger node
    const triggerNode = page.locator('.react-flow__node').filter({ hasText: /Trigger|on:/ }).first();
    if (await triggerNode.isVisible()) {
      await triggerNode.click();
      await page.waitForTimeout(400);
    }

    // Now the trigger panel should be open. Try clicking each event type
    const eventTypes = [
      'Issues', 'Pull Request', 'Issue Comment', 'Discussion',
      'Schedule', 'Manual Dispatch', 'Slash Command', 'Push', 'Release',
    ];

    for (const eventType of eventTypes) {
      const eventBtn = page.locator('.panel__section button').filter({ hasText: eventType }).first();
      if (await eventBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await eventBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/16-trigger-${eventType.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
      } else {
        console.log(`Event type button "${eventType}" not found, looking for alternative...`);
      }
    }
  });

  test('17 - TriggerPanel: Activity types toggle', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Click trigger node
    const triggerNode = page.locator('.react-flow__node').filter({ hasText: /Trigger|on:/ }).first();
    if (await triggerNode.isVisible()) {
      await triggerNode.click();
      await page.waitForTimeout(400);
    }

    // Select Issues event type to get activity types
    const issuesBtn = page.locator('button').filter({ hasText: 'Issues' }).first();
    if (await issuesBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await issuesBtn.click();
      await page.waitForTimeout(300);
    }

    // Click activity type chips
    const activityChips = ['opened', 'edited', 'closed', 'reopened', 'labeled'];
    for (const chip of activityChips) {
      const chipLabel = page.locator('label').filter({ hasText: chip });
      if (await chipLabel.isVisible({ timeout: 500 }).catch(() => false)) {
        await chipLabel.click();
        await page.waitForTimeout(200);
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-activity-types-toggled.png`, fullPage: true });
  });

  test('18 - TriggerPanel: Schedule with cron presets', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const triggerNode = page.locator('.react-flow__node').filter({ hasText: /Trigger|on:/ }).first();
    if (await triggerNode.isVisible()) {
      await triggerNode.click();
      await page.waitForTimeout(400);
    }

    // Select Schedule event
    const scheduleBtn = page.locator('button').filter({ hasText: 'Schedule' }).first();
    if (await scheduleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await scheduleBtn.click();
      await page.waitForTimeout(300);

      // Try cron presets
      const presets = ['Every hour', 'Daily at midnight', 'Weekly on Monday', 'Every 6 hours'];
      for (const preset of presets) {
        const presetBtn = page.locator('button').filter({ hasText: preset });
        if (await presetBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await presetBtn.click();
          await page.waitForTimeout(200);
        }
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/18-schedule-cron.png`, fullPage: true });

      // Type custom cron
      const cronInput = page.locator('input[placeholder*="0 0 * * *"]');
      if (await cronInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await cronInput.fill('*/15 * * * *');
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/18-custom-cron.png`, fullPage: true });
      }
    }
  });

  test('19 - TriggerPanel: Slash command name', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const triggerNode = page.locator('.react-flow__node').filter({ hasText: /Trigger|on:/ }).first();
    if (await triggerNode.isVisible()) {
      await triggerNode.click();
      await page.waitForTimeout(400);
    }

    // Select Slash Command event
    const slashBtn = page.locator('button').filter({ hasText: 'Slash Command' }).first();
    if (await slashBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await slashBtn.click();
      await page.waitForTimeout(300);

      const cmdInput = page.locator('input[placeholder*="review"]');
      if (await cmdInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await cmdInput.fill('deploy');
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/19-slash-command.png`, fullPage: true });
      }
    }
  });

  test('20 - TriggerPanel: Advanced section', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const triggerNode = page.locator('.react-flow__node').filter({ hasText: /Trigger|on:/ }).first();
    if (await triggerNode.isVisible()) {
      await triggerNode.click();
      await page.waitForTimeout(400);
    }

    // Expand Advanced section
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced/ }).first();
    if (await advancedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await advancedBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/20-trigger-advanced.png`, fullPage: true });

      // Fill in branches
      const branchesInput = page.locator('input[placeholder*="main"]');
      if (await branchesInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await branchesInput.fill('main, develop');
        await page.waitForTimeout(200);
      }

      // Toggle Skip Bots
      const skipBotsLabel = page.locator('label').filter({ hasText: /Skip Bots|skip.*bot/i }).first();
      if (await skipBotsLabel.isVisible({ timeout: 500 }).catch(() => false)) {
        await skipBotsLabel.click();
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/20-trigger-advanced-filled.png`, fullPage: true });
    }
  });

  test('21 - EnginePanel: Select each engine type', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Find and click the engine node
    const engineNode = page.locator('.react-flow__node').filter({ hasText: /Engine|engine:/i }).first();
    if (await engineNode.isVisible()) {
      await engineNode.click();
      await page.waitForTimeout(400);
    } else {
      logBug('Engine node not found on canvas');
      return;
    }

    const engines = ['Copilot', 'Claude', 'Codex', 'Custom Engine'];
    for (const engine of engines) {
      const engineBtn = page.locator('button').filter({ hasText: engine }).first();
      if (await engineBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await engineBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/21-engine-${engine.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
      } else {
        logBug(`Engine option "${engine}" not found`);
      }
    }
  });

  test('22 - EnginePanel: Model input and max-turns slider', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const engineNode = page.locator('.react-flow__node').filter({ hasText: /Engine|engine:/i }).first();
    if (await engineNode.isVisible()) {
      await engineNode.click();
      await page.waitForTimeout(400);
    }

    // Type model name
    const modelInput = page.locator('input[placeholder*="claude"]').first();
    if (await modelInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modelInput.fill('claude-sonnet-4-20250514');
      await page.waitForTimeout(200);
    }

    // Expand Advanced for max-turns
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced/ }).first();
    if (await advancedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await advancedBtn.click();
      await page.waitForTimeout(300);

      // Adjust max-turns slider
      const slider = page.locator('input[type="range"]').first();
      if (await slider.isVisible({ timeout: 500 }).catch(() => false)) {
        await slider.fill('50');
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/22-engine-advanced.png`, fullPage: true });
      }

      // Type max-turns number directly
      const maxTurnsInput = page.locator('input[type="number"]').first();
      if (await maxTurnsInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await maxTurnsInput.fill('25');
        await page.waitForTimeout(200);
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-engine-model-turns.png`, fullPage: true });
  });

  test('23 - ToolsPanel: Toggle each tool ON and OFF', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Find and click tools node
    const toolsNode = page.locator('.react-flow__node').filter({ hasText: /Tools|tools:/i }).first();
    if (await toolsNode.isVisible()) {
      await toolsNode.click();
      await page.waitForTimeout(400);
    } else {
      logBug('Tools node not found on canvas');
      return;
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-tools-panel-initial.png`, fullPage: true });

    // Find all tool cards (role="switch")
    const toolSwitches = page.locator('[role="switch"]');
    const toolCount = await toolSwitches.count();
    console.log(`Found ${toolCount} tool switches`);

    for (let i = 0; i < toolCount; i++) {
      const tool = toolSwitches.nth(i);
      const toolName = await tool.textContent().catch(() => `tool-${i}`);
      const wasChecked = await tool.getAttribute('aria-checked') === 'true';

      // Toggle ON
      await tool.click();
      await page.waitForTimeout(200);

      // Toggle OFF
      await tool.click();
      await page.waitForTimeout(200);

      // Restore original state
      const isChecked = await tool.getAttribute('aria-checked') === 'true';
      if (isChecked !== wasChecked) {
        await tool.click();
        await page.waitForTimeout(100);
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-tools-after-toggling.png`, fullPage: true });
  });

  test('24 - ToolsPanel: Tool config panels appear', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const toolsNode = page.locator('.react-flow__node').filter({ hasText: /Tools|tools:/i }).first();
    if (await toolsNode.isVisible()) {
      await toolsNode.click();
      await page.waitForTimeout(400);
    }

    // Enable tools with config panels: github, playwright, bash, cache-memory, repo-memory, serena
    const configurableTools = ['GitHub', 'Playwright', 'Bash', 'Cache Memory', 'Repo Memory', 'Serena'];
    for (const toolLabel of configurableTools) {
      const toolCard = page.locator('[role="switch"]').filter({ hasText: new RegExp(toolLabel, 'i') }).first();
      if (await toolCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        const isEnabled = await toolCard.getAttribute('aria-checked') === 'true';
        if (!isEnabled) {
          await toolCard.click();
          await page.waitForTimeout(300);
        }
        await page.screenshot({ path: `${SCREENSHOT_DIR}/24-tool-config-${toolLabel.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
      }
    }
  });

  test('25 - PermissionsPanel: Click read/write for scopes', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Find and click permissions node
    const permNode = page.locator('.react-flow__node').filter({ hasText: /Permissions|permissions:/i }).first();
    if (await permNode.isVisible()) {
      await permNode.click();
      await page.waitForTimeout(400);
    } else {
      logBug('Permissions node not found on canvas');
      return;
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/25-permissions-initial.png`, fullPage: true });

    // Click Write for a few scopes
    const writeButtons = page.locator('[role="radio"][aria-label="Write access"]');
    const writeCount = await writeButtons.count();
    for (let i = 0; i < Math.min(5, writeCount); i++) {
      await writeButtons.nth(i).click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/25-permissions-write-clicked.png`, fullPage: true });

    // Check for Auto badges
    const autoBadges = page.locator('text=Auto');
    const autoCount = await autoBadges.count();
    console.log(`Found ${autoCount} "Auto" badges`);
  });

  test('26 - InstructionsPanel: Type text', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const instrNode = page.locator('.react-flow__node').filter({ hasText: /Instructions|instructions/i }).first();
    if (await instrNode.isVisible()) {
      await instrNode.click();
      await page.waitForTimeout(400);
    } else {
      logBug('Instructions node not found on canvas');
      return;
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/26-instructions-initial.png`, fullPage: true });

    // Find the textarea/editor
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 1000 }).catch(() => false)) {
      await textarea.fill('You are a helpful agent that triages issues.\n\n## Steps\n1. Read the issue\n2. Add labels\n3. Comment with analysis');
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/26-instructions-filled.png`, fullPage: true });
    } else {
      // Maybe it's a contenteditable div?
      const editor = page.locator('[contenteditable="true"]').first();
      if (await editor.isVisible({ timeout: 500 }).catch(() => false)) {
        await editor.fill('You are a helpful agent that triages issues.');
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/26-instructions-filled.png`, fullPage: true });
      } else {
        logBug('Instructions text input not found (no textarea or contenteditable)');
      }
    }
  });

  test('27 - SafeOutputsPanel: Toggle outputs on/off', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const safeNode = page.locator('.react-flow__node').filter({ hasText: /Safe Outputs|safe.outputs/i }).first();
    if (await safeNode.isVisible()) {
      await safeNode.click();
      await page.waitForTimeout(400);
    } else {
      logBug('Safe Outputs node not found on canvas');
      return;
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/27-safe-outputs-initial.png`, fullPage: true });

    // Toggle some checkboxes
    const checkboxes = page.locator('label input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    console.log(`Found ${cbCount} safe output checkboxes`);

    for (let i = 0; i < Math.min(8, cbCount); i++) {
      await checkboxes.nth(i).click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/27-safe-outputs-toggled.png`, fullPage: true });

    // Expand Advanced
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced/ }).first();
    if (await advancedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await advancedBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/27-safe-outputs-advanced.png`, fullPage: true });
    }
  });

  test('28 - NetworkPanel: Add and remove domains', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const netNode = page.locator('.react-flow__node').filter({ hasText: /Network|network:/i }).first();
    if (await netNode.isVisible()) {
      await netNode.click();
      await page.waitForTimeout(400);
    } else {
      logBug('Network node not found on canvas');
      return;
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/28-network-initial.png`, fullPage: true });

    // Add domains
    const domainInput = page.locator('input[placeholder*="api.example.com"]');
    if (await domainInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await domainInput.fill('api.github.com');
      await page.locator('button').filter({ hasText: 'Add' }).first().click();
      await page.waitForTimeout(200);

      await domainInput.fill('example.com');
      await page.locator('button').filter({ hasText: 'Add' }).first().click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/28-network-domains-added.png`, fullPage: true });

      // Remove a domain by clicking the X button on a chip
      const removeBtn = page.locator('button[title*="Remove"]').first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/28-network-domain-removed.png`, fullPage: true });
      }
    }

    // Expand Advanced section for blocked domains
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced/ }).first();
    if (await advancedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await advancedBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/28-network-advanced.png`, fullPage: true });
    }
  });

  test('29 - Editor View: Markdown source editing', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    // Load a template first
    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Switch to Editor mode
    const editorBtn = page.getByRole('radio', { name: 'Code editor' });
    await editorBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/29-editor-view.png`, fullPage: true });

    // Try to find the markdown editor
    const editor = page.locator('textarea, [contenteditable="true"], .cm-editor').first();
    if (await editor.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editor.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/29-editor-focused.png`, fullPage: true });
    }
  });

  test('30 - Keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    // Ctrl+E to toggle view mode
    await page.keyboard.press('Control+e');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-ctrl-e-editor.png`, fullPage: true });

    // Ctrl+E back
    await page.keyboard.press('Control+e');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-ctrl-e-visual.png`, fullPage: true });

    // ? key for help overlay
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-help-overlay.png`, fullPage: true });

    // Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-after-escape.png`, fullPage: true });
  });

  test('31 - SettingsPanel', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const settingsNode = page.locator('.react-flow__node').filter({ hasText: /Settings|settings/i }).first();
    if (await settingsNode.isVisible()) {
      await settingsNode.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/31-settings-panel.png`, fullPage: true });
    }
  });

  test('32 - StepsPanel (if present)', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(500);

    const stepsNode = page.locator('.react-flow__node').filter({ hasText: /Steps|steps/i }).first();
    if (await stepsNode.isVisible()) {
      await stepsNode.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/32-steps-panel.png`, fullPage: true });
    }
  });

  test('33 - Export: Download MD and YAML', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(1000); // Wait for compilation

    // Open export menu
    const exportBtn = page.getByLabel('Export workflow');
    await exportBtn.click();
    await page.waitForTimeout(300);

    // Check if .md download is enabled
    const mdItem = page.getByRole('menuitem').filter({ hasText: '.md' });
    if (await mdItem.isVisible()) {
      const isDisabled = await mdItem.getAttribute('disabled');
      if (isDisabled === null) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
        await mdItem.click();
        const download = await downloadPromise;
        if (download) {
          console.log(`Downloaded: ${download.suggestedFilename()}`);
        }
        await page.waitForTimeout(300);
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/33-export-download.png`, fullPage: true });
  });

  test('34 - Export: Copy YAML and Share Link', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: 'Issue Triage' }).first().click();
    await page.waitForTimeout(1000);

    // Open export, try Copy YAML
    await page.getByLabel('Export workflow').click();
    await page.waitForTimeout(300);

    const copyYamlItem = page.getByRole('menuitem').filter({ hasText: 'Copy YAML' });
    if (await copyYamlItem.isVisible()) {
      await copyYamlItem.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/34-copy-yaml.png`, fullPage: true });

    // Open export, try Copy Share Link
    await page.getByLabel('Export workflow').click();
    await page.waitForTimeout(300);
    const shareLinkItem = page.getByRole('menuitem').filter({ hasText: 'Copy Share Link' });
    if (await shareLinkItem.isVisible()) {
      await shareLinkItem.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/34-share-link.png`, fullPage: true });
  });

  test('35 - Browse templates via Welcome Modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Browse templates"
    await page.getByText('Browse templates').click();
    await page.waitForTimeout(500);

    // Should see Templates tab active in sidebar
    await page.screenshot({ path: `${SCREENSHOT_DIR}/35-browse-templates.png`, fullPage: true });
  });

  test('36 - Guided Tour', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Take a guided tour"
    await page.getByText('Take a guided tour').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/36-guided-tour-start.png`, fullPage: true });

    // Try to advance through tour steps
    for (let step = 0; step < 10; step++) {
      const nextBtn = page.locator('button').filter({ hasText: /Next|Continue|Got it/i }).first();
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/36-guided-tour-step-${step}.png`, fullPage: true });
      } else {
        // Tour might be done
        break;
      }
    }
  });

  test('37 - Error panel visibility on compilation error', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    // Don't load any template - empty workflow should have errors
    await page.waitForTimeout(1000); // Wait for auto-compile

    // Check for error/warning status
    const statusBadge = page.locator('[role="status"], [role="button"]').filter({ hasText: /Error|warning/i });
    if (await statusBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
      await statusBadge.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/37-error-panel.png`, fullPage: true });
  });

  test('38 - Rapid interactions stress test', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Start from scratch').click();
    await page.waitForTimeout(500);

    await page.getByText('Templates', { exact: true }).click();
    await page.waitForTimeout(300);

    // Rapidly switch between templates
    const templateButtons = page.locator('button').filter({ hasText: /Issue Triage|PR Fix|CI Doctor/ });
    for (let cycle = 0; cycle < 3; cycle++) {
      const count = await templateButtons.count();
      for (let i = 0; i < count; i++) {
        await templateButtons.nth(i).click();
        await page.waitForTimeout(100);
      }
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/38-rapid-template-switch.png`, fullPage: true });

    // Rapidly switch view modes
    for (let i = 0; i < 5; i++) {
      await page.getByRole('radio', { name: 'Code editor' }).click();
      await page.waitForTimeout(50);
      await page.getByRole('radio', { name: 'Visual editor' }).click();
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/38-rapid-view-toggle.png`, fullPage: true });
  });

  test('99 - Final summary: collect all console errors', async ({ page }) => {
    // This test just reports collected errors
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach(e => console.log(e));
    }
    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS (uncaught) ===');
      pageErrors.forEach(e => console.log(e));
    }
    if (bugs.length > 0) {
      console.log('\n=== BUGS FOUND ===');
      bugs.forEach(b => console.log(`🐛 ${b}`));
    }
    console.log(`\nTotal console errors: ${consoleErrors.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);
    console.log(`Total bugs identified: ${bugs.length}`);
  });
});

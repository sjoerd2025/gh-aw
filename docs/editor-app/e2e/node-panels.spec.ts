import { test, expect } from '@playwright/test';
import { dismissWelcomeModal, loadTemplate, clickNode, waitForCompilation } from './helpers';

test.describe('Node Panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissWelcomeModal(page);
    // Load a template so most nodes are visible on canvas
    await loadTemplate(page, 'Issue Triage');
    await waitForCompilation(page);
  });

  // Node types that are visible on the Issue Triage template canvas
  // Panel titles come from fieldDescriptions, not the node labels
  const nodeTypes = [
    { type: 'trigger', panelTitle: 'When to Run' },
    { type: 'permissions', panelTitle: 'What the Agent Can Access' },
    { type: 'engine', panelTitle: 'AI Assistant' },
    { type: 'tools', panelTitle: 'Tools & Capabilities' },
    { type: 'instructions', panelTitle: 'Instructions' },
    { type: 'safeOutputs', panelTitle: 'Actions the Agent Can Take' },
    { type: 'network', panelTitle: 'Internet Access' },
  ];

  for (const node of nodeTypes) {
    test(`clicking ${node.type} node opens properties panel with "${node.panelTitle}"`, async ({ page }) => {
      await clickNode(page, node.type);

      // Properties panel should appear with the correct title
      const panelTitle = page.locator('.panel__title');
      await expect(panelTitle).toBeVisible();
      await expect(panelTitle).toContainText(node.panelTitle);
    });
  }

  test('clicking canvas background closes properties panel', async ({ page }) => {
    // Open a node panel first
    await clickNode(page, 'trigger');
    const panelTitle = page.locator('.panel__title');
    await expect(panelTitle).toBeVisible();

    // Click on the canvas background (ReactFlow pane)
    await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } });

    // Panel close button should disappear (panel shows empty state)
    const closeBtn = page.locator('.panel__close-btn');
    await expect(closeBtn).toBeHidden({ timeout: 3_000 });
  });

  test('switching between nodes rapidly updates panel correctly', async ({ page }) => {
    const panelTitle = page.locator('.panel__title');

    // Rapidly click through multiple nodes
    await clickNode(page, 'trigger');
    await expect(panelTitle).toContainText('When to Run');

    await clickNode(page, 'engine');
    await expect(panelTitle).toContainText('AI Assistant');

    await clickNode(page, 'tools');
    await expect(panelTitle).toContainText('Tools & Capabilities');

    await clickNode(page, 'safeOutputs');
    await expect(panelTitle).toContainText('Actions the Agent Can Take');

    // Switch back
    await clickNode(page, 'trigger');
    await expect(panelTitle).toContainText('When to Run');
  });

  test('pressing Escape deselects node and hides properties panel', async ({ page }) => {
    await clickNode(page, 'engine');

    // Properties panel should be visible
    const propertiesPanel = page.locator('#properties-region');
    await expect(propertiesPanel).toBeVisible();

    // Press Escape to deselect the node
    await page.keyboard.press('Escape');

    // Properties panel should be hidden (the entire aside is removed when no node selected)
    await expect(propertiesPanel).toBeHidden({ timeout: 3_000 });

    // The engine node should no longer have the "selected" class
    const engineNode = page.locator('.node-engine');
    await expect(engineNode).not.toHaveClass(/selected/);
  });
});

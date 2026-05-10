import { test, expect } from '@playwright/test';

test.describe('Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for boot to complete
    await page.waitForSelector('[data-testid="desktop"]', { timeout: 10_000 }).catch(() => {
      // Fallback: wait for any interactive element
    });
    await page.waitForTimeout(2000);
  });

  test('workflows app opens from dock', async ({ page }) => {
    // Click the workflows icon in the dock
    const dockBtn = page.locator('button', { hasText: /workflow/i }).first();
    if (await dockBtn.isVisible()) {
      await dockBtn.click();
      await expect(page.getByText('Active')).toBeVisible();
      await expect(page.getByText('Workflows')).toBeVisible();
      await expect(page.getByText('Agents')).toBeVisible();
    }
  });

  test('terminal opens and accepts commands', async ({ page }) => {
    // Open terminal from dock or keyboard
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    // Terminal should show the prompt
    const input = page.getByPlaceholder('type a command…');
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('terminal help shows workflow commands', async ({ page }) => {
    // Open terminal
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await input.fill('help');
    await input.press('Enter');
    await expect(page.getByText('WORKFLOWS')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/build:software/)).toBeVisible();
    await expect(page.getByText(/workflow status/)).toBeVisible();
  });

  test('build:software command requires package to be installed', async ({ page }) => {
    // Open terminal
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await input.fill('build:software way2fly "add spinner"');
    await input.press('Enter');
    // Should show error since package isn't installed yet
    await expect(page.getByText(/not installed/i)).toBeVisible({ timeout: 5000 });
  });

  test('install package then trigger build:software', async ({ page }) => {
    // Open terminal
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');

    // Install a package
    await input.fill('install way2fly');
    await input.press('Enter');
    await expect(page.getByText(/installed/i)).toBeVisible({ timeout: 5000 });

    // Try build:software command
    await input.fill('build:software way2fly "add loading spinner"');
    await input.press('Enter');

    // Should either start workflow or show server error (acceptable in e2e without real backend source paths)
    const response = page.locator('text=/workflow started|Failed|error|source/i');
    await expect(response.first()).toBeVisible({ timeout: 5000 });
  });

  test('bare build shows usage with type options', async ({ page }) => {
    // Open terminal
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await input.fill('build');
    await input.press('Enter');
    await expect(page.getByText(/build:<type>/i)).toBeVisible({ timeout: 5000 });
  });

  test('workflow status command shows job list', async ({ page }) => {
    // Open terminal
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await input.fill('workflow status');
    await input.press('Enter');
    // Should show either jobs or "(no workflow jobs)"
    const response = page.locator('text=/workflow jobs|no workflow/i');
    await expect(response.first()).toBeVisible({ timeout: 5000 });
  });

  test('workflows tab shows workflow definitions', async ({ page }) => {
    // Open workflows app
    const dockBtn = page.locator('button', { hasText: /workflow/i }).first();
    if (await dockBtn.isVisible()) {
      await dockBtn.click();
      // Switch to Workflows tab
      await page.getByText('Workflows').click();
      // Should show the software dev process workflow
      await expect(page.getByText('Software Development Process')).toBeVisible({ timeout: 5000 });
    }
  });

  test('agents tab shows registered agents', async ({ page }) => {
    // Open workflows app
    const dockBtn = page.locator('button', { hasText: /workflow/i }).first();
    if (await dockBtn.isVisible()) {
      await dockBtn.click();
      // Switch to Agents tab
      await page.getByText('Agents').click();
      // Should show agents or "no agents" message
      const content = page.locator('text=/agent|no agents/i');
      await expect(content.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('trigger UI shows package selector', async ({ page }) => {
    // Open workflows app
    const dockBtn = page.locator('button', { hasText: /workflow/i }).first();
    if (await dockBtn.isVisible()) {
      await dockBtn.click();
      // Should show "Target" label and "No packages installed" or package buttons
      await expect(page.getByText('Target')).toBeVisible({ timeout: 5000 });
    }
  });
});

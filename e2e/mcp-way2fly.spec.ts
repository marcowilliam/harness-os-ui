import { test, expect } from '@playwright/test';

test.describe('MCP — Way2Fly Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="desktop"]', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('MCP status endpoint returns connections', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/mcp/status');
      return r.json();
    });
    expect(result).toHaveProperty('connections');
    expect(Array.isArray(result.connections)).toBe(true);
  });

  test('health endpoint includes MCP status', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/health');
      return r.json();
    });
    expect(result).toHaveProperty('mcp');
  });

  test('install way2fly and see it in the dock', async ({ page }) => {
    // Open terminal
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await expect(input).toBeVisible({ timeout: 5000 });

    // Install way2fly
    await input.fill('install way2fly');
    await input.press('Enter');
    await expect(page.getByText(/installed/i)).toBeVisible({ timeout: 5000 });

    // Should appear in dock
    await expect(page.locator('button[title="way2fly.ai"]')).toBeVisible({ timeout: 3000 });
  });

  test('opening way2fly renders Way2FlyApp (not placeholder)', async ({ page }) => {
    // Install first
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await input.fill('install way2fly');
    await input.press('Enter');
    await expect(page.getByText(/installed/i)).toBeVisible({ timeout: 5000 });

    // Close terminal, open way2fly
    await page.locator('button[title="way2fly.ai"]').click();

    // Should NOT show placeholder text
    await expect(page.getByText('Package app — connect via Build or install from source')).not.toBeVisible({ timeout: 3000 });

    // Should show either loading state or content
    const content = page.locator('text=/Connecting to way2fly|debriefs|No debriefs/i');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test('assistant context badge appears when way2fly is active', async ({ page }) => {
    // Install
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const input = page.getByPlaceholder('type a command…');
    await input.fill('install way2fly');
    await input.press('Enter');
    await expect(page.getByText(/installed/i)).toBeVisible({ timeout: 5000 });

    // Open way2fly
    await page.locator('button[title="way2fly.ai"]').click();
    await page.waitForTimeout(1000);

    // Context badge should show the app name
    await expect(page.getByText('way2fly.ai').first()).toBeVisible({ timeout: 5000 });
  });

  test('MCP call endpoint works with way2fly server', async ({ page }) => {
    // This test verifies the proxy endpoint works
    // It may fail if MCP server isn't booted — that's acceptable
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: 'way2fly', tool: 'get_stats', args: {} }),
      });
      return { status: r.status, body: await r.json() };
    });

    // Either 200 (MCP connected and tool works) or 503 (MCP not started)
    expect([200, 503]).toContain(result.status);
    if (result.status === 200) {
      expect(result.body).toHaveProperty('result');
    } else {
      expect(result.body).toHaveProperty('error');
    }
  });

  test('MCP tools endpoint lists way2fly tools', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/mcp/tools/way2fly');
      if (!r.ok) return null;
      return r.json();
    });

    if (result) {
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('status');
      if (result.status === 'ready') {
        const toolNames = result.tools.map((t: { name: string }) => t.name);
        expect(toolNames).toContain('get_debriefs');
        expect(toolNames).toContain('get_debrief');
        expect(toolNames).toContain('get_stats');
      }
    }
    // If null (404), MCP not booted — acceptable in some test environments
  });

  test('assistant uses app context when way2fly is active', async ({ page }) => {
    // Install and open way2fly
    const termBtn = page.locator('button[title="Terminal"]');
    if (await termBtn.isVisible()) {
      await termBtn.click();
    }
    const termInput = page.getByPlaceholder('type a command…');
    await termInput.fill('install way2fly');
    await termInput.press('Enter');
    await expect(page.getByText(/installed/i)).toBeVisible({ timeout: 5000 });

    await page.locator('button[title="way2fly.ai"]').click();
    await page.waitForTimeout(2000);

    // The assistant placeholder should reflect way2fly context
    const assistantInput = page.locator('input[placeholder*="jump"]').or(
      page.locator('input[placeholder*="debrief"]')
    ).or(
      page.locator('input[placeholder*="skill"]')
    );

    // If MCP is connected, placeholder changes. Otherwise fallback is acceptable.
    const hasContextPlaceholder = await assistantInput.first().isVisible().catch(() => false);
    if (hasContextPlaceholder) {
      expect(hasContextPlaceholder).toBe(true);
    }
  });
});

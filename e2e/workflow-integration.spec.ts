import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

/**
 * Full integration test: triggers a real Claude Code workflow to change
 * way2fly's background color, then verifies the file was modified.
 *
 * Prerequisites:
 * - way2fly repo on branch `test/workflow-e2e-bg-color`
 * - harness-os-ui dev server running with HARNESS_PATH=../distributions/marco.os
 * - Claude Code CLI available
 *
 * Run with: npx playwright test e2e/workflow-integration.spec.ts
 */

const WAY2FLY_ROOT = '/projects/my-projects/apps/way2fly/main/frontend/web';
const WAY2FLY_THEME = `${WAY2FLY_ROOT}/src/core/theme/theme.css`;
const ORIGINAL_BG = '#0a0d12';
const TARGET_BG = '#1a1025';

test.describe('Workflow Integration — Real Agent', () => {
  test.setTimeout(300_000); // 5 minutes — agents need time

  test.beforeAll(() => {
    // Ensure way2fly theme file exists
    if (!existsSync(WAY2FLY_THEME)) {
      throw new Error(`way2fly theme not found at ${WAY2FLY_THEME}`);
    }
    // Ensure we're on the test branch
    const branch = execSync('git branch --show-current', { cwd: WAY2FLY_ROOT }).toString().trim();
    if (!branch.includes('test/')) {
      throw new Error(`way2fly should be on a test branch, got: ${branch}`);
    }
    // Reset theme to original state before test
    execSync('git checkout -- src/core/theme/theme.css', { cwd: WAY2FLY_ROOT });
  });

  test('build:software changes way2fly background color via Claude Code agents', async ({ page }) => {
    // Verify original state
    const originalContent = readFileSync(WAY2FLY_THEME, 'utf-8');
    expect(originalContent).toContain(`--bg: ${ORIGINAL_BG}`);

    await page.goto('/');
    await page.waitForTimeout(3000); // Boot sequence

    // Open terminal via dock (title attribute is unique to dock buttons)
    await page.locator('button[title="Terminal"]').click();
    const input = page.getByPlaceholder('type a command…');
    await expect(input).toBeVisible({ timeout: 5000 });

    // Step 1: Install way2fly package
    await input.fill('install way2fly');
    await input.press('Enter');
    await expect(page.getByText(/installed/i)).toBeVisible({ timeout: 5000 });

    // Step 2: Trigger build:software workflow
    await input.fill(`build:software way2fly "Change the --bg CSS variable in src/core/theme/theme.css from ${ORIGINAL_BG} to ${TARGET_BG} (dark purple). Only change this one line, nothing else."`);
    await input.press('Enter');

    // Should start the workflow and show job ID
    await expect(page.getByText(/workflow started/i)).toBeVisible({ timeout: 15_000 });

    // Step 3: Wait for the workflow to complete — poll the API
    const maxWait = 240_000; // 4 minutes for all phases
    const pollInterval = 5_000;
    const startTime = Date.now();
    let finalStatus = '';

    while (Date.now() - startTime < maxWait) {
      const result = await page.evaluate(async () => {
        const r = await fetch('/api/workflow/jobs');
        if (!r.ok) return null;
        return r.json();
      });

      if (result && Array.isArray(result) && result.length > 0) {
        const latest = result[result.length - 1] as { status: string; error?: string };
        finalStatus = latest.status;

        if (latest.status === 'complete') break;
        if (latest.status === 'error') {
          throw new Error(`Workflow failed: ${latest.error || 'unknown error'}`);
        }
      }
      await page.waitForTimeout(pollInterval);
    }

    // Step 4: Assert workflow completed
    expect(finalStatus).toBe('complete');

    // Step 5: Verify the actual file was changed on disk
    const modifiedContent = readFileSync(WAY2FLY_THEME, 'utf-8');
    expect(modifiedContent).toContain(`--bg: ${TARGET_BG}`);
    expect(modifiedContent).not.toContain(`--bg: ${ORIGINAL_BG}`);
  });

  test.afterAll(() => {
    // Restore the original file
    try {
      execSync('git checkout -- src/core/theme/theme.css', { cwd: WAY2FLY_ROOT });
    } catch {
      // Best effort cleanup
    }
  });
});

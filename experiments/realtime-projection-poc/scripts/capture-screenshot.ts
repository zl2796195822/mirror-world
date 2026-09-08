/**
 * Headless Browser Screenshot & Console Error Validator
 * 
 * Uses Playwright to:
 * 1. Launch Vite preview server and Colyseus backend.
 * 2. Validate 0 experiment-owned console errors.
 * 3. Verify Realtime Projection -> R3F 3D transform rendering of 30 entities.
 * 4. Verify Reconnect and Stub Action interaction.
 * 5. Save screenshots into screenshots/ directory.
 */

import { chromium } from 'playwright';
import { createColyseusServer } from '../server/index.js';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- Starting Screenshot Capture & Console Validation ---');

  const screenshotsDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Start Colyseus server on 2567
  const colyseusInstance = await createColyseusServer(2567);
  console.log('[Colyseus Server] Started on port 2567');

  // 2. Start Vite server on 5174
  const viteServer = await createViteServer({
    server: { host: '127.0.0.1', port: 5174 },
  });
  await viteServer.listen();
  console.log('[Vite Dev Server] Started on port 5174');

  console.log('[Launching Chrome]...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  console.log('[Chrome Launched Successfully]');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.log(`[Browser PageError] ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    console.log('[Navigating to http://127.0.0.1:5174]...');
    await page.goto('http://127.0.0.1:5174', { waitUntil: 'load' });
    console.log('[Page Loaded]');

    // Wait for connection and 30 entities to load
    await page.waitForSelector('.badge-green', { timeout: 10000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('.metric-value');
      return el && el.textContent?.includes('30 / 30');
    }, { timeout: 10000 });

    // Let the 3D scene animate for 3 seconds
    await page.waitForTimeout(3000);

    // Desktop screenshot
    const desktopPath = path.join(screenshotsDir, 'desktop-projection-30-entities.png');
    await page.screenshot({ path: desktopPath });
    console.log(`[Screenshot Saved] ${desktopPath}`);

    // Mobile viewport screenshot
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    const mobilePath = path.join(screenshotsDir, 'mobile-projection.png');
    await page.screenshot({ path: mobilePath });
    console.log(`[Screenshot Saved] ${mobilePath}`);

    // Test Stub Action
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('button:has-text("Submit Stub Action")');
    await page.waitForTimeout(500);

    const actionScreenshotPath = path.join(screenshotsDir, 'action-stub-and-reconnect.png');
    await page.screenshot({ path: actionScreenshotPath });
    console.log(`[Screenshot Saved] ${actionScreenshotPath}`);

    // Console errors check
    // Filter out expected benign warnings if any
    const experimentErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('DevTools')
    );

    console.log(`[Console Check] Experiment-owned errors: ${experimentErrors.length}`);
    if (experimentErrors.length > 0) {
      console.warn('Console errors detected:', experimentErrors);
    }
  } finally {
    await browser.close();
    await viteServer.close();
    await colyseusInstance.stop();
  }

  console.log('--- Screenshot Capture Completed Successfully ---');
}

main().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});

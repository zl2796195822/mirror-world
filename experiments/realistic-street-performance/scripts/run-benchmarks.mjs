import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const screenshotsDir = join(__dirname, '../screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 5174;
const DEBUG_PORT = 9222;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await sleep(200);
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.events = [];
    this.consoleLogs = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        } else if (data.method === 'Runtime.consoleAPICalled') {
          this.consoleLogs.push({
            type: data.params.type,
            text: data.params.args.map((a) => a.value ?? a.description ?? '').join(' '),
          });
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.id;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('--- Starting EXP-3D-002 Benchmark Suite ---');

  // 1. Start Vite preview server
  console.log('Starting Vite preview server on port', PORT);
  const vite = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: join(__dirname, '..'),
    stdio: 'pipe',
  });

  vite.stdout.on('data', (d) => process.stdout.write(`[Vite] ${d}`));
  vite.stderr.on('data', (d) => process.stderr.write(`[Vite ERR] ${d}`));

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log('Vite preview is ready.');

    // 2. Start Google Chrome Headless
    console.log('Starting Google Chrome Headless...');
    const chrome = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        `--remote-debugging-port=${DEBUG_PORT}`,
        '--window-size=1440,900',
        '--user-data-dir=/tmp/chrome-exp-3d-002',
        '--disable-background-networking',
        '--disable-default-apps',
        '--no-first-run',
        '--disable-sync',
        'about:blank',
      ],
      { stdio: 'pipe' }
    );

    await sleep(2000);

    const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const versionData = await versionRes.json();
    console.log('Connected to Chrome:', versionData['Browser']);

    const targetsRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No page target found in Chrome');

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('CDP connected.');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    const matrix = [
      // Desktop runs (1440x900)
      { id: 'desktop-day-0', viewport: [1440, 900], weather: 'day', actors: 0, lod: true, instancing: true },
      { id: 'desktop-day-5', viewport: [1440, 900], weather: 'day', actors: 5, lod: true, instancing: true, shots: ['day.png', '5-vrm.png'] },
      { id: 'desktop-day-15', viewport: [1440, 900], weather: 'day', actors: 15, lod: true, instancing: true, shots: ['15-vrm.png'] },
      { id: 'desktop-day-30-lod', viewport: [1440, 900], weather: 'day', actors: 30, lod: true, instancing: true, shots: ['30-vrm.png'] },
      { id: 'desktop-day-30-nolod', viewport: [1440, 900], weather: 'day', actors: 30, lod: false, instancing: true },
      { id: 'desktop-night-5', viewport: [1440, 900], weather: 'night', actors: 5, lod: true, instancing: true, shots: ['night.png'] },
      { id: 'desktop-night-30', viewport: [1440, 900], weather: 'night', actors: 30, lod: true, instancing: true },
      { id: 'desktop-rain-5', viewport: [1440, 900], weather: 'rain', actors: 5, lod: true, instancing: true, shots: ['rain.png'] },
      { id: 'desktop-rain-30', viewport: [1440, 900], weather: 'rain', actors: 30, lod: true, instancing: true },
      { id: 'desktop-day-5-noinstancing', viewport: [1440, 900], weather: 'day', actors: 5, lod: true, instancing: false },

      // Mobile runs (390x844)
      { id: 'mobile-day-5', viewport: [390, 844], weather: 'day', actors: 5, lod: true, instancing: true, shots: ['mobile.png'] },
      { id: 'mobile-day-30-lod', viewport: [390, 844], weather: 'day', actors: 30, lod: true, instancing: true },
    ];

    const results = [];

    for (const testCase of matrix) {
      console.log(`Running test case: ${testCase.id} (weather: ${testCase.weather}, actors: ${testCase.actors}, lod: ${testCase.lod}, instancing: ${testCase.instancing})`);

      // Set viewport
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: testCase.viewport[0],
        height: testCase.viewport[1],
        deviceScaleFactor: testCase.viewport[0] === 390 ? 2 : 1,
        mobile: testCase.viewport[0] === 390,
      });

      const url = `http://127.0.0.1:${PORT}/?weather=${testCase.weather}&actors=${testCase.actors}&lod=${testCase.lod}&instancing=${testCase.instancing}`;
      await cdp.send('Page.navigate', { url });

      // Allow 3.5s for load, VRM initialization, and metrics collection
      await sleep(3500);

      // Extract DOM metrics
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const getVal = (id) => document.querySelector(\`[data-testid="\${id}"]\`)?.textContent?.trim() ?? '';
            return {
              fpsText: getVal('metric-fps'),
              p95Text: getVal('metric-p95'),
              drawTrisText: getVal('metric-draw-calls'),
              gpuResText: getVal('metric-gpu-res'),
              memoryText: getVal('metric-memory'),
              zonesText: getVal('metric-zones'),
              actorsText: getVal('metric-actors'),
              timingText: getVal('metric-timing'),
              scrollWidth: document.documentElement.scrollWidth,
              viewportWidth: window.innerWidth,
            };
          })()
        `,
        returnByValue: true,
      });

      const metrics = evalRes.result?.value ?? {};
      console.log(`Result ${testCase.id}:`, metrics);

      testCase.metrics = metrics;
      results.push(testCase);

      // Capture screenshot if required
      if (testCase.shots) {
        const shotData = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const buf = Buffer.from(shotData.data, 'base64');
        for (const filename of testCase.shots) {
          const outPath = join(screenshotsDir, filename);
          writeFileSync(outPath, buf);
          console.log(`Saved screenshot: ${outPath} (${buf.length} bytes)`);
        }
      }
    }

    // Run in-page compression benchmark
    console.log('Running in-browser compression benchmark...');
    const compEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (async () => {
          const btn = document.querySelector('.benchmark-btn');
          if (btn) btn.click();
          await new Promise(r => setTimeout(r, 2000));
          const rows = Array.from(document.querySelectorAll('.comp-row')).map(r => ({
            name: r.querySelector('.comp-name')?.textContent ?? '',
            val: r.querySelector('.comp-val')?.textContent ?? '',
          }));
          return rows;
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    console.log('Compression benchmark output:', compEval.result?.value);

    // Collect console logs
    console.log('Console logs captured:', cdp.consoleLogs.length);
    const errors = cdp.consoleLogs.filter((l) => l.type === 'error');
    const warnings = cdp.consoleLogs.filter((l) => l.type === 'warning' || l.type === 'warn');
    console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.error('Console errors:', errors);
    }

    // Save final report JSON
    const report = {
      timestamp: new Date().toISOString(),
      browser: versionData['Browser'],
      results,
      compressionSamples: compEval.result?.value ?? [],
      console: {
        errorCount: errors.length,
        errors,
        warningCount: warnings.length,
        warnings,
      },
    };

    writeFileSync(join(__dirname, '../benchmark-results.json'), JSON.stringify(report, null, 2));
    console.log('Benchmark suite finished. Report saved to benchmark-results.json');

    cdp.close();
    chrome.kill();
  } finally {
    vite.kill();
  }
}

main().catch((err) => {
  console.error('Benchmark suite error:', err);
  process.exit(1);
});

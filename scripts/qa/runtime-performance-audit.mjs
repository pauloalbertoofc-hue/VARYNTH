import { chromium } from "@playwright/test";

const baseUrl = process.env.VARYNTH_TEST_BASE_URL || "http://localhost:3000";
const routes = [
  "/dashboard",
  "/download",
  "/login",
  "/admin",
  "/projects",
  "/modules",
  "/modules/activity",
  "/modules/codex",
  "/modules/knowledge",
  "/modules/music",
  "/modules/people",
  "/modules/research",
  "/modules/opportunities",
  "/modules/forge",
  "/modules/graph",
  "/modules/experience",
  "/modules/chronos",
  "/modules/studio",
  "/modules/athena",
  "/modules/vault",
  "/modules/labs",
  "/profile",
  "/modules/trash",
  "/modules/technical-archive",
];
const MAX_NAVIGATION_MS = 20_000;
const MAX_RESOURCES = 250;
const MAX_TRANSFER_BYTES = 12 * 1024 * 1024;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
let failures = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const route of routes) {
    const startedAt = Date.now();
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const navigationMs = Date.now() - startedAt;
    const metrics = await page.evaluate(() => performance.getEntriesByType("resource").reduce((summary, entry) => ({
      resources: summary.resources + 1,
      transferBytes: summary.transferBytes + (entry.transferSize || 0),
    }), { resources: 0, transferBytes: 0 }));
    const failed = navigationMs > MAX_NAVIGATION_MS || metrics.resources > MAX_RESOURCES || metrics.transferBytes > MAX_TRANSFER_BYTES;
    if (failed) {
      failures += 1;
      console.log(`[FAIL] ${route}: ${navigationMs}ms, ${metrics.resources} recursos, ${metrics.transferBytes} bytes`);
    } else {
      console.log(`[PASS] ${route}: ${navigationMs}ms, ${metrics.resources} recursos, ${metrics.transferBytes} bytes`);
    }
  }
} finally {
  await browser.close();
}
if (failures) {
  console.log(`Runtime performance audit failed: ${failures}/${routes.length} rotas acima do orçamento de desenvolvimento.`);
  process.exitCode = 1;
} else {
  console.log(`Runtime performance audit passed: ${routes.length}/${routes.length} rotas dentro do orçamento de desenvolvimento.`);
}

import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const baseUrl = process.env.VARYNTH_TEST_BASE_URL || "http://localhost:3000";
const axeSource = await fs.readFile("node_modules/axe-core/axe.min.js", "utf8");
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
const viewports = [
  ["small-mobile", 360, 800],
  ["large-mobile", 430, 932],
  ["tablet", 768, 1024],
  ["desktop", 1440, 900],
  ["large-desktop", 1920, 1080],
];

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
let violations = 0;
try {
  const page = await browser.newPage();
  await page.addInitScript({ content: axeSource });
  for (const [viewportName, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(250);
      const result = await page.evaluate(async () => window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] },
      }));
      const serious = result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
      violations += serious.length;
      if (serious.length) {
        console.log(`[FAIL] ${viewportName} ${route}: ${serious.map((violation) => `${violation.id} (${violation.impact})`).join(", ")}`);
        for (const violation of serious) {
          for (const node of violation.nodes.slice(0, 3)) console.log(`  ${violation.id}: ${node.html.slice(0, 240)} | ${node.failureSummary}`);
        }
      } else {
        console.log(`[PASS] ${viewportName} ${route}: axe sem violações serious/critical`);
      }
    }
  }
} finally {
  await browser.close();
}
if (violations) process.exitCode = 1;
else console.log(`Runtime accessibility audit passed: ${viewports.length * routes.length}/${viewports.length * routes.length} cenários.`);

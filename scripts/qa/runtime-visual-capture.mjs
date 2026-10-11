import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const baseUrl = process.env.VARYNTH_TEST_BASE_URL || "http://localhost:3000";
const outputDir = process.env.VARYNTH_VISUAL_OUTPUT || "C:/Users/paulo/AppData/Local/Temp/varynth-runtime-visual";
const routes = [
  ["dashboard", "/dashboard"],
  ["download", "/download"],
  ["login", "/login"],
  ["admin", "/admin"],
  ["projects", "/projects"],
  ["modules", "/modules"],
  ["activity", "/modules/activity"],
  ["codex", "/modules/codex"],
  ["knowledge", "/modules/knowledge"],
  ["music", "/modules/music"],
  ["people", "/modules/people"],
  ["research", "/modules/research"],
  ["opportunities", "/modules/opportunities"],
  ["forge", "/modules/forge"],
  ["graph", "/modules/graph"],
  ["experience", "/modules/experience"],
  ["chronos", "/modules/chronos"],
  ["studio", "/modules/studio"],
  ["athena", "/modules/athena"],
  ["vault", "/modules/vault"],
  ["labs", "/modules/labs"],
  ["profile", "/profile"],
  ["trash", "/modules/trash"],
  ["technical-archive", "/modules/technical-archive"],
];
const viewports = [
  ["small-mobile", 360, 800],
  ["large-mobile", 430, 932],
  ["tablet", 768, 1024],
  ["desktop", 1440, 900],
  ["large-desktop", 1920, 1080],
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const [viewportName, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const [routeName, route] of routes) {
      const screenshotPath = `${outputDir}/${viewportName}-${routeName}.png`;
      try {
        await fs.access(screenshotPath);
        console.log(`[SKIPPED] ${viewportName} ${route}`);
        continue;
      } catch {}
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) await page.waitForTimeout(500 * attempt);
        }
      }
      if (lastError) throw lastError;
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      console.log(`[CAPTURED] ${viewportName} ${route}`);
    }
  }
} finally {
  await browser.close();
}
console.log(`Runtime visual capture complete: ${viewports.length * routes.length} screenshots in ${outputDir}`);

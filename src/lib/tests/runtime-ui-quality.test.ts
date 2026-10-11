import { chromium } from "@playwright/test";

const baseUrl = process.env.VARYNTH_TEST_BASE_URL || "http://localhost:3000";
const routes = ["/dashboard", "/projects", "/modules/codex", "/modules/studio", "/modules/athena", "/admin", "/modules/vault", "/modules/labs", "/profile", "/modules/trash", "/modules/technical-archive"];
const viewports = [
  { name: "small-mobile", width: 360, height: 800 },
  { name: "large-mobile", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "large-desktop", width: 1920, height: 1080 },
];
function parseColor(value: string) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((index) => Number.parseInt(hex[1].slice(index, index + 2), 16));
  const rgb = value.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}
function luminance(value: number[]) { return value.map((channel) => channel / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0); }
function contrast(foreground: string, background: string) {
  const fg = parseColor(foreground); const bg = parseColor(background);
  if (!fg || !bg) return null;
  const [bright, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}

async function gotoWithRetry(page: import("playwright").Page, url: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await page.waitForTimeout(500 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of routes) {
        await gotoWithRetry(page, `${baseUrl}${route}`);
        await page.waitForTimeout(500);
        const audit = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const world = root.getPropertyValue("--vly-world").trim();
      const accent = root.getPropertyValue("--vly-accent").trim();
      const contrastValues = ["--vly-text-primary", "--vly-text-secondary", "--vly-text-muted", "--vly-accent-contrast"].map((token) => ({ token, foreground: root.getPropertyValue(token).trim(), background: token === "--vly-accent-contrast" ? accent : world }));
      const controls = [...document.querySelectorAll<HTMLElement>("button, a, input, textarea, select")];
      const unnamed = controls.filter((element) => {
        if (element instanceof HTMLInputElement && ["hidden", "color"].includes(element.type)) return false;
        if (element.getAttribute("aria-hidden") === "true") return false;
        const labelText = element.closest("label")?.textContent?.trim();
        return !(element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim() || element.getAttribute("placeholder") || labelText);
      });
      const active = document.activeElement as HTMLElement | null;
      return {
        width: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        unnamed: unnamed.slice(0, 12).map((element) => element.outerHTML.slice(0, 180)),
        focusVisible: Boolean(active && active !== document.body),
        contrastValues,
      };
        });
        if (audit.width > audit.viewport) throw new Error(`${viewport.name} ${route}: overflow ${audit.width} > ${audit.viewport}`);
        if (audit.unnamed.length) throw new Error(`${viewport.name} ${route}: controles sem nome acessível: ${audit.unnamed.join(" | ")}`);
        const contrastFailures = audit.contrastValues.map((check) => ({ ...check, ratio: contrast(check.foreground, check.background) })).filter((check) => check.ratio !== null && check.ratio < 4.5);
        if (contrastFailures.length) throw new Error(`${viewport.name} ${route}: contraste abaixo de 4.5:1: ${contrastFailures.map((check) => `${check.token}=${check.ratio?.toFixed(2)}`).join(", ")}`);
        if (route === "/modules/vault") {
          const addToVault = page.getByRole("button", { name: /Adicionar ao Vault/ }).first();
          await addToVault.waitFor({ state: "visible", timeout: 10000 });
          await addToVault.click();
          const vaultModalTitle = page.getByText("Adicionar Obra ao Vault", { exact: true });
          try {
            await vaultModalTitle.waitFor({ state: "visible", timeout: 5000 });
          } catch {
            await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
            await page.waitForTimeout(500);
            await page.getByRole("button", { name: /Adicionar ao Vault/ }).first().click();
            await vaultModalTitle.waitFor({ state: "visible", timeout: 20000 });
          }
      await page.getByRole("button", { name: "Fechar modal de adicionar obra" }).click({ force: true });
        }
        if (route === "/modules/labs") {
          const newIdeaButton = page.getByRole("button", { name: /Nova Ideia \/ Experimento/ });
          await newIdeaButton.waitFor({ state: "visible", timeout: 5000 });
          await newIdeaButton.click();
          const newIdeaModalTitle = page.getByText("Nova Ideia para Incubação", { exact: true });
          try {
            await newIdeaModalTitle.waitFor({ state: "visible", timeout: 5000 });
          } catch {
            await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
            await page.waitForTimeout(500);
            await page.getByRole("button", { name: /Nova Ideia \/ Experimento/ }).click();
            await newIdeaModalTitle.waitFor({ state: "visible", timeout: 20000 });
          }
      await page.getByRole("button", { name: "Fechar modal de nova ideia" }).click({ force: true });
        }
        console.log(`[PASS] ${viewport.name} ${route}: sem overflow, controles nomeados e runtime montado`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Runtime UI quality gate passed: ${routes.length * viewports.length}/${routes.length * viewports.length} cenários críticos.`);
}

void main();

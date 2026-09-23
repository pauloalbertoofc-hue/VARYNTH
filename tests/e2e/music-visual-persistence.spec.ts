import { expect, test } from "@playwright/test";

function shortWav(): Buffer {
  const sampleRate = 44_100;
  const samples = sampleRate / 4;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) buffer.writeInt16LE(Math.round(Math.sin(index / 7) * 9_000), 44 + index * 2);
  return buffer;
}

test("keeps a selected GIF cover after the Music library reloads", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/modules/music");

  await page.locator('input[type="file"][accept*="audio"]').setInputFiles([
    { name: "persistent-cover.wav", mimeType: "audio/wav", buffer: shortWav() },
    { name: "second-track.wav", mimeType: "audio/wav", buffer: shortWav() },
  ]);
  await page.getByRole("button", { name: "Biblioteca" }).click();
  await expect(page.getByRole("button", { name: /persistent-cover/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /second-track/i }).first()).toBeVisible({ timeout: 20_000 });
  const mediaTitle = await page.evaluate(() => navigator.mediaSession?.metadata?.title ?? null);
  expect(mediaTitle).toContain("persistent-cover");
  const coverInput = page.locator('input[type="file"][accept*="image/gif"]').first();
  await coverInput.setInputFiles({
    name: "music-cover.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByRole("status").last()).toContainText(/Capa animado salvo de forma permanente nesta faixa/i);
  await page.getByRole("button", { name: "Suave" }).click();
  await expect(page.getByRole("status").last()).toContainText(/Movimento suave aplicado e salvo/i);
  await page.getByLabel("Efeito do ambiente musical").selectOption("rain");
  await expect(page.getByRole("status").last()).toContainText(/Efeito chuva salvo para esta faixa/i);
  await page.locator('input[type="file"][accept*="image/gif"]').last().setInputFiles({
    name: "music-background.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByRole("status").last()).toContainText(/Fundo animado salvo de forma permanente nesta faixa/i);

  await page.reload();
  await expect(page.locator('img[src^="data:image/gif"], img[src*="/artwork?kind="]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-visual-scene="true"] img[src^="data:image/gif"], [data-visual-scene="true"] img[src*="/artwork?kind="]').first()).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca" }).click();
  await expect(page.getByRole("button", { name: "Suave" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Efeito do ambiente musical")).toHaveValue("rain");
  await page.getByRole("button", { name: "Animado" }).click();
  await expect(page.getByRole("button", { name: "Animado" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Tocando agora" }).click();
  const scene = page.locator('[data-visual-scene="true"]');
  await expect(scene).toHaveAttribute("data-particle-effect", "rain");
  await expect(scene).toHaveAttribute("data-motion-duration", "5");
  const backgroundLayer = page.locator('[data-scene-layer="BackgroundLayer"]');
  await expect(backgroundLayer).toHaveCSS("animation-name", /scene-crossfade, scene-drift/);
  const cover = page.locator("[data-cover-motion-duration]");
  await expect(cover).toHaveAttribute("data-cover-motion-duration", "5");
  const initialTransform = await backgroundLayer.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(700);
  const movedTransform = await backgroundLayer.evaluate((element) => getComputedStyle(element).transform);
  expect(movedTransform).not.toBe(initialTransform);
  await page.getByRole("button", { name: "Biblioteca" }).click();
  await page.getByRole("button", { name: "Estático" }).click();
  await expect(page.getByRole("button", { name: "Estático" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(scene).toHaveAttribute("data-motion-duration", "0");
  await expect(backgroundLayer).toHaveCSS("animation-name", "none");
  await expect(cover).toHaveAttribute("data-cover-motion-duration", "0");
});

test("restores a track's saved motion and environment effect on another signed-in device", async ({ browser }) => {
  test.setTimeout(90_000);
  const trackId = "c3d33f84-c9cf-4c62-90ad-a5acfeb0a65f";
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  let accountSettings = { particleType: "dust", particleDensity: 0.3, motionSpeed: 0, reducedMotion: true };
  const settingsUpdates: typeof accountSettings[] = [];
  const artworkSettingsReads: typeof accountSettings[] = [];

  async function openSignedInDevice(expectedMode: "Estático" | "Animado" = "Estático", expectedEffect = "dust") {
    const context = await browser.newContext();
    const page = await context.newPage();
    const artworkRequests: string[] = [];
    page.on("request", (request) => { if (request.url().includes(`/api/music/tracks/${trackId}/artwork`)) artworkRequests.push(request.url()); });
    await page.route("**/api/music/library", async (route) => {
      if (route.request().method() !== "GET") return route.fulfill({ status: 405 });
      return route.fulfill({ json: { uploadPrefix: "music/test-owner/tracks", storageMode: "account", tracks: [{ id: trackId, name: "account-track", artist: "VARYNTH", durationMs: 30_000, mimeType: "audio/mpeg", sizeBytes: 128, addedAt: "2026-09-22T00:00:00.000Z", storageMode: "account" }] } });
    });
    await page.route(`**/api/music/tracks/${trackId}/artwork`, async (route) => { artworkSettingsReads.push({ ...accountSettings }); return route.fulfill({ json: { coverUrl: "/mock-music-art/cover.gif", backgroundUrl: "/mock-music-art/background.gif", visualSettings: accountSettings } }); });
    await page.route("**/api/music/artwork", async (route) => {
      if (route.request().method() !== "POST") return route.fulfill({ status: 405 });
      const body = route.request().postDataJSON() as { trackId?: string; visualSettings?: typeof accountSettings };
      expect(body.trackId).toBe(trackId);
      if (body.visualSettings) { accountSettings = body.visualSettings; settingsUpdates.push(body.visualSettings); }
      return route.fulfill({ json: { ok: true } });
    });
    await page.route(`**/api/music/tracks/${trackId}/audio`, async (route) => route.fulfill({ status: 404 }));
    await page.route("**/mock-music-art/**", async (route) => route.fulfill({ status: 200, contentType: "image/gif", body: gif }));
    await page.goto("/modules/music");
    await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
    await expect(page.getByRole("button", { name: /account-track/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => artworkRequests.length).toBeGreaterThan(0);
    await expect.poll(() => artworkSettingsReads.length).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: expectedMode })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Efeito do ambiente musical")).toHaveValue(expectedEffect);
    return { context, page };
  }

  const firstDevice = await openSignedInDevice();
  await firstDevice.page.getByRole("button", { name: "Animado" }).click();
  await expect(firstDevice.page.getByRole("button", { name: "Animado" })).toHaveAttribute("aria-pressed", "true");
  await expect(firstDevice.page.getByRole("status").last()).toContainText(/Movimento animado aplicado/i);
  await expect.poll(() => settingsUpdates.at(-1)?.motionSpeed).toBe(0.3);
  await firstDevice.page.getByLabel("Efeito do ambiente musical").selectOption("rain");
  await expect(firstDevice.page.getByRole("status").last()).toContainText(/Efeito chuva salvo/i);
  await expect.poll(() => accountSettings).toMatchObject({ particleType: "rain", motionSpeed: 0.3, reducedMotion: false });
  await firstDevice.context.close();

  const secondDevice = await openSignedInDevice("Animado", "rain");
  await expect(secondDevice.page.getByRole("button", { name: "Animado" })).toHaveAttribute("aria-pressed", "true");
  await expect(secondDevice.page.getByLabel("Efeito do ambiente musical")).toHaveValue("rain");
  await secondDevice.page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(secondDevice.page.locator('[data-visual-scene="true"]')).toHaveAttribute("data-particle-effect", "rain");
  await expect(secondDevice.page.locator('[data-visual-scene="true"]')).toHaveAttribute("data-motion-duration", "5");
  await secondDevice.context.close();
});

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
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
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
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
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
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByRole("button", { name: "Estático" }).click();
  await expect(page.getByRole("button", { name: "Estático" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(scene).toHaveAttribute("data-motion-duration", "0");
  await expect(backgroundLayer).toHaveCSS("animation-name", "none");
  await expect(cover).toHaveAttribute("data-cover-motion-duration", "0");
});

test("keeps covers attached to their own tracks when the selection changes", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles([
    { name: "cover-track-one.wav", mimeType: "audio/wav", buffer: shortWav() },
    { name: "cover-track-two.wav", mimeType: "audio/wav", buffer: shortWav() },
  ]);
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  const firstTrack = page.getByRole("button", { name: /cover-track-one/i }).first();
  const secondTrack = page.getByRole("button", { name: /cover-track-two/i }).first();
  await expect(firstTrack).toBeVisible({ timeout: 20_000 });
  await expect(secondTrack).toBeVisible({ timeout: 20_000 });

  const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  const gifWithDistinctComment = Buffer.concat([
    transparentGif.subarray(0, transparentGif.length - 1),
    Buffer.from([0x21, 0xfe, 0x01, 0x42, 0x00]),
    transparentGif.subarray(transparentGif.length - 1),
  ]);
  await page.locator('input[type="file"][accept*="image/gif"]').first().setInputFiles({ name: "cover-one.gif", mimeType: "image/gif", buffer: transparentGif });
  await expect(page.getByRole("status").last()).toContainText(/Capa animado salvo de forma permanente nesta faixa/i);
  await secondTrack.click();
  await page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(page.getByRole("heading", { name: "cover-track-two" })).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByRole("button", { name: "Remover capa" }).click();
  await expect(page.getByRole("status").last()).toContainText(/Capa removido desta faixa/i);
  await page.locator('input[type="file"][accept*="image/gif"]').first().setInputFiles({ name: "cover-two.gif", mimeType: "image/gif", buffer: gifWithDistinctComment });
  await expect(page.getByRole("status").last()).toContainText(/Capa animado salvo de forma permanente nesta faixa/i);

  const storedCovers = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(["tracks", "visualProfiles"], "readonly");
      const [tracks, profiles] = await Promise.all([
        new Promise<Array<{ id: string; name: string }>>((resolve, reject) => {
          const request = transaction.objectStore("tracks").getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
        new Promise<Array<{ trackId: string; coverDataUrl?: string }>>((resolve, reject) => {
          const request = transaction.objectStore("visualProfiles").getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
      ]);
      return tracks.map((track) => ({ name: track.name, cover: profiles.find((profile) => profile.trackId === track.id)?.coverDataUrl }));
    } finally {
      db.close();
    }
  });
  const firstCover = storedCovers.find((track) => /cover-track-one/i.test(track.name))?.cover;
  const secondCover = storedCovers.find((track) => /cover-track-two/i.test(track.name))?.cover;
  expect(firstCover).toMatch(/^data:image\/gif;base64,/);
  expect(secondCover).toMatch(/^data:image\/gif;base64,/);
  expect(secondCover).not.toBe(firstCover);

  await page.reload();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /cover-track-one/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /cover-track-two/i }).first()).toBeVisible({ timeout: 20_000 });
  const reloadedCovers = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(["tracks", "visualProfiles"], "readonly");
      const tracks = await new Promise<Array<{ id: string; name: string }>>((resolve, reject) => {
        const request = transaction.objectStore("tracks").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const profiles = await new Promise<Array<{ trackId: string; coverDataUrl?: string }>>((resolve, reject) => {
        const request = transaction.objectStore("visualProfiles").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return tracks.map((track) => ({ name: track.name, cover: profiles.find((profile) => profile.trackId === track.id)?.coverDataUrl }));
    } finally {
      db.close();
    }
  });
  expect(reloadedCovers.find((track) => /cover-track-one/i.test(track.name))?.cover).toBe(firstCover);
  expect(reloadedCovers.find((track) => /cover-track-two/i.test(track.name))?.cover).toBe(secondCover);
});

test("keeps Euterpe present after playback ends and moves her to a rest spot after three idle minutes", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install({ time: new Date("2026-09-23T12:00:00.000Z") });
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles({
    name: "euterpe-idle-presence.wav",
    mimeType: "audio/wav",
    buffer: shortWav(),
  });
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /euterpe-idle-presence/i }).first()).toBeVisible({ timeout: 20_000 });
  const presence = page.getByTestId("euterpe-presence");
  await expect(presence).toBeVisible();

  await page.getByRole("button", { name: "Tocando agora" }).click();
  await page.getByRole("button", { name: "Reproduzir" }).click();
  await page.waitForFunction(() => document.querySelector("audio")?.ended === true, undefined, { timeout: 10_000 });
  await expect(presence).toBeVisible();

  await page.clock.fastForward(181_000);
  await expect(presence).toHaveAttribute("data-idle-phase", "REST_ELIGIBLE");
  await expect(presence.getByRole("button")).toHaveAttribute("aria-label", /Euterpe, descansando/i);
  await expect(presence).toBeVisible();
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

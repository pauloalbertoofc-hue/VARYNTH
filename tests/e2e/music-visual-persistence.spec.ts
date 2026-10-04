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
  test.setTimeout(90_000);
  await page.goto("/modules/music");

  await page.locator('input[type="file"][accept*="audio"]').setInputFiles([
    { name: "persistent-cover.wav", mimeType: "audio/wav", buffer: shortWav() },
    { name: "second-track.wav", mimeType: "audio/wav", buffer: shortWav() },
  ]);
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /persistent-cover/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /second-track/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
  const mediaTitle = await page.evaluate(() => navigator.mediaSession?.metadata?.title ?? null);
  expect(mediaTitle).toContain("persistent-cover");
  const coverInput = page.locator('input[type="file"][accept*="image/gif"]').first();
  await coverInput.setInputFiles({
    name: "music-cover.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByTestId("music-visual-status")).toContainText(/Capa animado salvo de forma permanente nesta faixa/i);
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "Animado" }).click();
  await expect(page.getByTestId("music-visual-status")).toContainText(/Movimento animado aplicado e salvo/i);
  await page.getByLabel("Efeito do ambiente musical").selectOption("rain");
  await expect(page.getByTestId("music-visual-status")).toContainText(/Efeito chuva salvo para esta faixa/i);
  await page.locator('input[type="file"][accept*="image/gif"]').last().setInputFiles({
    name: "music-background.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByTestId("music-visual-status")).toContainText(/Fundo animado salvo de forma permanente nesta faixa/i);

  await page.reload();
  await expect(page.getByRole("img", { name: "Artwork de persistent-cover" }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
  await expect(page.locator("[data-motion-mode]")).toHaveAttribute("data-motion-mode", "ANIMATED", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Animado" })).toHaveAttribute("aria-pressed", "true", { timeout: 20_000 });
  await expect(page.getByLabel("Efeito do ambiente musical")).toHaveValue("rain");
  await page.getByRole("button", { name: "Animado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Animado", exact: true })).toHaveAttribute("aria-pressed", "true");
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

test("creates and persists an animated local cover and background with visible completion status", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles({
    name: "generated-animated-visual.wav",
    mimeType: "audio/wav",
    buffer: shortWav(),
  });
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /generated-animated-visual/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "Criar visual local", exact: true }).click();

  await expect(page.getByTestId("music-visual-status")).toContainText(/Capa e fundo animados criados localmente e aplicados à faixa/i, { timeout: 20_000 });

  const generated = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const profiles = await new Promise<Array<{ trackId: string; coverDataUrl?: string; backgroundDataUrl?: string }>>((resolve, reject) => {
        const request = db.transaction("visualProfiles", "readonly").objectStore("visualProfiles").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return profiles.find((profile) => profile.coverDataUrl && profile.backgroundDataUrl) ?? null;
    } finally { db.close(); }
  });
  expect(generated?.coverDataUrl).toMatch(/^data:image\/svg\+xml,/);
  expect(generated?.backgroundDataUrl).toMatch(/^data:image\/svg\+xml,/);
  const coverSvg = decodeURIComponent(generated!.coverDataUrl!.slice("data:image/svg+xml,".length));
  const backgroundSvg = decodeURIComponent(generated!.backgroundDataUrl!.slice("data:image/svg+xml,".length));
  expect(coverSvg).toContain("@keyframes orbit");
  expect(backgroundSvg).toContain("@keyframes drift");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source.replaceAll("17s", ".65s").replaceAll("48s", ".65s").replaceAll("9s", ".65s");
    image.id = "music-animation-probe";
    image.style.cssText = "position:fixed;top:8px;left:8px;width:128px;height:128px;z-index:99999";
    document.body.append(image);
    await image.decode();
  }, generated!.coverDataUrl!);
  const motionProbe = page.locator("#music-animation-probe");
  const animationFrameA = await motionProbe.screenshot({ animations: "allow" });
  await page.waitForTimeout(240);
  const animationFrameB = await motionProbe.screenshot({ animations: "allow" });
  expect(animationFrameB.equals(animationFrameA)).toBe(false);

  await page.reload();
  const restored = await page.evaluate(async (trackId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{ coverDataUrl?: string; backgroundDataUrl?: string } | undefined>((resolve, reject) => {
        const request = db.transaction("visualProfiles", "readonly").objectStore("visualProfiles").get(trackId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }, generated!.trackId);
  expect(restored?.coverDataUrl).toBe(generated?.coverDataUrl);
  expect(restored?.backgroundDataUrl).toBe(generated?.backgroundDataUrl);
});

test("connects a private image provider then asks Athena for separate saved Music artwork", async ({ page }) => {
  test.setTimeout(60_000);
  const secret = "sk-test_account_specific_visual_generation_123456789";
  // A real 2×2 WebP lets this test verify browser decoding and player rendering,
  // rather than only checking that a data URL was copied into IndexedDB.
  const webp = "UklGRjQAAABXRUJQVlA4ICgAAABwAQCdASoCAAIAAUAmJaACdAFAAAD+7Qcv/JT/7yv9d24bdJ+p7cAA";
  let configured = false;
  let receivedPrompt: Record<string, unknown> | undefined;
  await page.route("**/api/athena/music/visual", async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ json: { configured, source: configured ? "account" : "none", canConfigure: true, model: "gpt-image-2" } });
    if (method === "PUT") {
      const body = route.request().postDataJSON() as { apiKey?: string };
      expect(body.apiKey).toBe(secret);
      configured = true;
      return route.fulfill({ json: { configured: true, source: "account" } });
    }
    if (method === "POST") {
      receivedPrompt = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ json: { coverDataUrl: `data:image/webp;base64,${webp}`, backgroundDataUrl: `data:image/webp;base64,${webp}`, description: "Athena criou duas artes WebP para a faixa.", palette: [] } });
    }
    return route.fulfill({ status: 405 });
  });

  await page.goto("/modules/music");
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles({ name: "athena-artwork-track.wav", mimeType: "audio/wav", buffer: shortWav() });
  await expect(page.getByRole("button", { name: /athena-artwork-track/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });

  await page.getByText("Conectar geração de imagens à Athena").click();
  await page.getByLabel("Chave de API de imagens").fill(secret);
  await page.getByRole("button", { name: "Conectar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Chave protegida/ })).toBeVisible();
  await expect(page.getByLabel("Chave de API de imagens")).toHaveValue("");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(secret);

  await page.getByLabel("Prompt visual").fill("constelações sobre um oceano noturno");
  await page.getByTestId("create-athena-music-artwork").click();
  await expect(page.getByTestId("music-visual-status")).toContainText(/Athena criou capa e fundo próprios/, { timeout: 20_000 });
  expect(receivedPrompt).toMatchObject({ title: "athena-artwork-track", artist: "Artista desconhecido", prompt: "constelações sobre um oceano noturno" });
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("varynth-music-library"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try { return await new Promise<Array<{ coverDataUrl?: string; backgroundDataUrl?: string }>>((resolve, reject) => { const request = db.transaction("visualProfiles", "readonly").objectStore("visualProfiles").getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
    finally { db.close(); }
  });
  expect(stored.find((profile) => profile.coverDataUrl?.startsWith("data:image/webp"))).toMatchObject({ coverDataUrl: `data:image/webp;base64,${webp}`, backgroundDataUrl: `data:image/webp;base64,${webp}` });

  const generatedCover = page.locator(`img[src="data:image/webp;base64,${webp}"]`).first();
  await expect.poll(() => generatedCover.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(2);
  await page.getByRole("button", { name: "Animado", exact: true }).click();
  await expect(page.getByTestId("music-visual-status")).toContainText(/Movimento animado aplicado e salvo/);
  await page.getByLabel("Efeito do ambiente musical").selectOption("stars");
  await expect(page.getByTestId("music-visual-status")).toContainText(/Efeito estrelas salvo/);
  await page.getByRole("button", { name: "Tocando agora" }).click();
  const scene = page.locator('[data-visual-scene="true"]');
  await expect(scene).toHaveAttribute("data-motion-duration", "5");
  await expect(scene).toHaveAttribute("data-particle-effect", "stars");
  await expect(page.locator("[data-cover-motion-duration]")).toHaveAttribute("data-cover-motion-duration", "5");
  await expect(page.locator(`[data-scene-layer="BackgroundLayer"] > img.scene-art[src="data:image/webp;base64,${webp}"]`)).toBeVisible();
  await expect(page.locator(`.cover-presentation img[src="data:image/webp;base64,${webp}"]`)).toBeVisible();
  await expect(page.locator('[data-scene-layer="BackgroundLayer"]')).toHaveCSS("animation-name", /scene-crossfade, scene-drift/);
});

test("shows an actionable error when Athena has no image provider configured", async ({ page }) => {
  await page.route("**/api/athena/music/visual", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { configured: false, source: "none", canConfigure: false, model: "gpt-image-2" } });
    return route.fulfill({ status: 503, json: { error: "Conecte uma chave de API de imagens nas configurações desta seção. Sem ela, use a composição local gratuita." } });
  });
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles({ name: "missing-provider-track.wav", mimeType: "audio/wav", buffer: shortWav() });
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /missing-provider-track/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
  await page.getByTestId("create-athena-music-artwork").click();
  await expect(page.getByTestId("music-visual-status")).toContainText(/Conecte uma chave de API de imagens/);
  await expect(page.getByTestId("create-athena-music-artwork")).toBeEnabled();
});

test("keeps covers attached to their own tracks when the selection changes", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles([
    { name: "cover-track-one.wav", mimeType: "audio/wav", buffer: shortWav() },
    { name: "cover-track-two.wav", mimeType: "audio/wav", buffer: shortWav() },
  ]);
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  const firstTrack = page.getByRole("button", { name: /cover-track-one/i }).first();
  const secondTrack = page.getByRole("button", { name: /cover-track-two/i }).first();
  await expect(firstTrack).toBeVisible({ timeout: 60_000 });
  await expect(secondTrack).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
  await firstTrack.click();
  await page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(page.getByRole("heading", { name: "cover-track-one" })).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Personalizar visual da faixa" })).toBeVisible({ timeout: 20_000 });

  const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  const gifWithDistinctComment = Buffer.concat([
    transparentGif.subarray(0, transparentGif.length - 1),
    Buffer.from([0x21, 0xfe, 0x01, 0x42, 0x00]),
    transparentGif.subarray(transparentGif.length - 1),
  ]);
  await page.locator('input[type="file"][accept*="image/gif"]').first().setInputFiles({ name: "cover-one.gif", mimeType: "image/gif", buffer: transparentGif });
  await expect(page.getByTestId("music-visual-status")).toContainText(/Capa animado salvo de forma permanente nesta faixa/i);
  await secondTrack.click();
  await page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(page.getByRole("heading", { name: "cover-track-two" })).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Personalizar visual da faixa" })).toBeVisible({ timeout: 20_000 });
  const removeCoverButton = page.getByRole("button", { name: "Remover capa", exact: true });
  await expect(removeCoverButton).toBeVisible({ timeout: 20_000 });
  await removeCoverButton.click();
  await expect(page.getByTestId("music-visual-status")).toContainText(/Capa removido desta faixa/i);
  await page.locator('input[type="file"][accept*="image/gif"]').first().setInputFiles({ name: "cover-two.gif", mimeType: "image/gif", buffer: gifWithDistinctComment });
  await expect(page.getByTestId("music-visual-status")).toContainText(/Capa animado salvo de forma permanente nesta faixa/i);

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

test("applies an animated cover to selected tracks and preserves the exact selection after reload", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles([
    { name: "batch-cover-one.wav", mimeType: "audio/wav", buffer: shortWav() },
    { name: "batch-cover-two.wav", mimeType: "audio/wav", buffer: shortWav() },
    { name: "zz-batch-cover-excluded.wav", mimeType: "audio/wav", buffer: shortWav() },
  ]);
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /batch-cover-one/i }).first()).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Aplicar imagem em").selectOption("SELECTED");
  await page.getByRole("checkbox", { name: "batch-cover-two" }).check();
  const selected = await page.locator('input[type="checkbox"]:checked').count();
  expect(selected).toBe(2, "the current track plus only the explicitly checked target are selected");

  await page.locator('input[type="file"][accept*="image/gif"]').first().setInputFiles({
    name: "shared-animated-cover.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByTestId("music-visual-status")).toContainText(/Capa animado salvo de forma permanente em 2 faixas selecionadas/i);

  const profiles = async () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library", 5);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = database.transaction(["tracks", "visualProfiles"], "readonly");
      const [tracks, visuals] = await Promise.all([
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
      return tracks.map((track) => ({ name: track.name, cover: visuals.find((profile) => profile.trackId === track.id)?.coverDataUrl }));
    } finally { database.close(); }
  });

  const expectedCover = `data:image/gif;base64,${Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64").toString("base64")}`;
  const initial = await profiles();
  expect(initial.find((track) => /batch-cover-one/i.test(track.name))?.cover).toBe(expectedCover);
  expect(initial.find((track) => /batch-cover-two/i.test(track.name))?.cover).toBe(expectedCover);
  expect(initial.find((track) => /zz-batch-cover-excluded/i.test(track.name))?.cover).toBeUndefined();

  await page.reload();
  const restored = await profiles();
  expect(restored.find((track) => /batch-cover-one/i.test(track.name))?.cover).toBe(expectedCover);
  expect(restored.find((track) => /batch-cover-two/i.test(track.name))?.cover).toBe(expectedCover);
  expect(restored.find((track) => /zz-batch-cover-excluded/i.test(track.name))?.cover).toBeUndefined();
});

test("keeps Euterpe present after playback ends and moves her to a rest spot after three idle minutes", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install({ time: new Date() });
  await page.goto("/modules/music");
  await page.locator('input[type="file"][accept*="audio"]').setInputFiles({
    name: "euterpe-idle-presence.wav",
    mimeType: "audio/wav",
    buffer: shortWav(),
  });
  await page.clock.runFor(20_000);
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.getByRole("button", { name: /euterpe-idle-presence/i }).first()).toBeVisible({ timeout: 20_000 });
  const presence = page.getByTestId("euterpe-presence");
  await expect(presence).toBeVisible();

  await page.getByRole("button", { name: "Tocando agora" }).click();
  await page.locator("audio").evaluate((audio: HTMLAudioElement) => audio.dispatchEvent(new Event("ended")));
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
    await expect(page.locator("[data-visual-profile-ready]")).toHaveAttribute("data-visual-profile-ready", "true", { timeout: 20_000 });
    await expect(page.getByRole("button", { name: expectedMode, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Efeito do ambiente musical")).toHaveValue(expectedEffect);
    return { context, page };
  }

  const firstDevice = await openSignedInDevice();
  await firstDevice.page.getByRole("button", { name: "Animado", exact: true }).click();
  await expect(firstDevice.page.getByRole("button", { name: "Animado", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(firstDevice.page.getByTestId("music-visual-status")).toContainText(/Movimento animado aplicado/i);
  await expect.poll(() => settingsUpdates.at(-1)?.motionSpeed).toBe(0.3);
  await firstDevice.page.getByLabel("Efeito do ambiente musical").selectOption("rain");
  await expect(firstDevice.page.getByTestId("music-visual-status")).toContainText(/Efeito chuva salvo/i);
  await expect.poll(() => accountSettings).toMatchObject({ particleType: "rain", motionSpeed: 0.3, reducedMotion: false });
  await firstDevice.context.close();

  const secondDevice = await openSignedInDevice("Animado", "rain");
  await expect(secondDevice.page.getByRole("button", { name: "Animado", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(secondDevice.page.getByLabel("Efeito do ambiente musical")).toHaveValue("rain");
  await secondDevice.page.getByRole("button", { name: "Tocando agora" }).click();
  await expect(secondDevice.page.locator('[data-visual-scene="true"]')).toHaveAttribute("data-particle-effect", "rain");
  await expect(secondDevice.page.locator('[data-visual-scene="true"]')).toHaveAttribute("data-motion-duration", "5");
  await secondDevice.context.close();
});

test("keeps an explicitly removed account cover cleared when another device has stale local artwork", async ({ browser }) => {
  test.setTimeout(90_000);
  const trackId = "9f71c3be-48c4-4f40-a9a7-1590754935b7";
  const gif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  let coverCleared = false;
  let artworkUploadAttempts = 0;

  async function createAccountDevice(seedStaleLocalArtwork: boolean) {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (seedStaleLocalArtwork) {
      await page.goto("/");
      await page.evaluate(async ({ id, staleCover }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("varynth-music-library", 5);
          request.onupgradeneeded = () => {
            for (const store of ["tracks", "dna", "waveforms", "visualIdentities", "playlists", "feedback", "visualProfiles", "preferences", "agentMemory", "identities"]) {
              if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: "id" });
            }
            if (!request.result.objectStoreNames.contains("audio")) request.result.createObjectStore("audio");
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const transaction = db.transaction("visualProfiles", "readwrite");
        transaction.objectStore("visualProfiles").put({
          id, schemaVersion: 1, trackId: id, palette: ["#e879f9", "#818cf8"], accentColor: "#e879f9",
          coverDataUrl: staleCover, backgroundDataUrl: staleCover, particleType: "stars", particleDensity: .3,
          glowIntensity: .3, parallaxIntensity: .1, motionSpeed: .16, shaderPreset: "gradient", mood: "calm",
          beatResponse: .2, bassResponse: .4, midResponse: .3, trebleResponse: .3, reducedMotion: false,
          updatedAt: new Date().toISOString(),
        });
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        db.close();
      }, { id: trackId, staleCover: gif });
    }
    await page.route("**/api/music/library", async (route) => {
      if (route.request().method() !== "GET") return route.fulfill({ status: 405 });
      return route.fulfill({ json: { uploadPrefix: "music/test-owner/tracks", storageMode: "account", tracks: [{ id: trackId, name: "artwork-tombstone-track", artist: "VARYNTH", durationMs: 30_000, mimeType: "audio/mpeg", sizeBytes: 128, addedAt: "2026-10-01T00:00:00.000Z", storageMode: "account" }] } });
    });
    await page.route(`**/api/music/tracks/${trackId}/artwork*`, async (route) => route.fulfill({ json: {
      coverUrl: coverCleared ? undefined : `/mock-music-art/${trackId}-cover.gif`,
      backgroundUrl: `/mock-music-art/${trackId}-background.gif`,
      coverCleared, backgroundCleared: false,
    } }));
    await page.route("**/api/music/artwork", async (route) => {
      if (route.request().method() !== "POST") return route.fulfill({ status: 405 });
      const body = route.request().postDataJSON() as { kind?: string; trackIds?: string[]; assetId?: string; visualSettings?: unknown };
      if (body.kind === "cover" && !body.assetId && body.trackIds?.includes(trackId)) coverCleared = true;
      return route.fulfill({ json: { ok: true } });
    });
    await page.route("**/api/music/artwork/upload", async (route) => {
      artworkUploadAttempts += 1;
      return route.fulfill({ status: 400, json: { error: "Este teste não espera novos uploads." } });
    });
    await page.route(`**/api/music/tracks/${trackId}/audio`, async (route) => route.fulfill({ status: 404 }));
    await page.route("**/mock-music-art/**", async (route) => route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from(gif.split(",")[1], "base64") }));
    return { context, page };
  }

  const first = await createAccountDevice(false);
  await first.page.goto("/modules/music");
  await first.page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(first.page.getByRole("button", { name: /artwork-tombstone-track/i }).first()).toBeVisible({ timeout: 20_000 });
  await first.page.getByRole("button", { name: "Remover capa", exact: true }).click();
  await expect(first.page.getByTestId("music-visual-status")).toContainText(/Capa removido desta faixa/i);
  expect(coverCleared).toBe(true);
  await first.context.close();

  const second = await createAccountDevice(true);
  await second.page.goto("/modules/music");
  await second.page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(second.page.getByRole("button", { name: /artwork-tombstone-track/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => second.page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library", 5);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const profile = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = db.transaction("visualProfiles", "readonly").objectStore("visualProfiles").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return { coverCleared: profile?.coverCleared === true, hasCoverData: typeof profile?.coverDataUrl === "string" };
  }, trackId)).toEqual({ coverCleared: true, hasCoverData: false });
  expect(artworkUploadAttempts).toBe(0);
  const localProfile = await second.page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("varynth-music-library", 5);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const profile = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = db.transaction("visualProfiles", "readonly").objectStore("visualProfiles").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return profile;
  }, trackId);
  expect(localProfile.coverCleared).toBe(true);
  expect(localProfile.coverDataUrl).toBeUndefined();
  expect(localProfile.backgroundDataUrl).toBe(`/mock-music-art/${trackId}-background.gif`);
  await second.context.close();
});

test("keeps Euterpe conversations and Athena sessions separate when the signed-in account changes", async ({ page }) => {
  test.setTimeout(60_000);
  let currentUserId = "music-owner-a";
  await page.route("**/api/auth/session", async (route) => route.fulfill({ json: { user: { id: currentUserId } } }));
  await page.route("**/api/music/library", async (route) => route.fulfill({ json: { uploadPrefix: `music/${currentUserId}/tracks`, storageMode: "account", tracks: [] } }));
  await page.goto("/modules/music");
  const ownerA = await page.evaluate(() => ({
    chat: "varynth_music_curator_chat_v1:account:music-owner-a",
    session: "varynth_music_curator_athena_session_v1:account:music-owner-a",
  }));
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), ownerA.session)).toBeTruthy();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), ownerA.chat)).toContain("Euterpe online");
  await page.evaluate(({ chat, session }) => {
    localStorage.setItem(chat, JSON.stringify([{ id: "private-a", sender: "user", text: "conversa privada da conta A", createdAt: new Date().toISOString() }]));
    localStorage.setItem(session, "athena-session-account-a");
    localStorage.setItem("varynth_music_curator_chat_v1", JSON.stringify([{ id: "legacy-private", sender: "user", text: "histórico antigo sem identidade" }]));
    localStorage.setItem("varynth_music_curator_athena_session_v1", "legacy-athena-session");
  }, ownerA);

  currentUserId = "music-owner-b";
  await page.reload();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("varynth_music_curator_chat_v1:account:music-owner-b"))).toContain("Euterpe online");
  const ownerB = await page.evaluate(() => ({
    chat: localStorage.getItem("varynth_music_curator_chat_v1:account:music-owner-b"),
    session: localStorage.getItem("varynth_music_curator_athena_session_v1:account:music-owner-b"),
    ownerAChat: localStorage.getItem("varynth_music_curator_chat_v1:account:music-owner-a"),
    ownerASession: localStorage.getItem("varynth_music_curator_athena_session_v1:account:music-owner-a"),
    legacyChat: localStorage.getItem("varynth_music_curator_chat_v1"),
    legacySession: localStorage.getItem("varynth_music_curator_athena_session_v1"),
  }));
  expect(ownerB.chat).not.toContain("conversa privada da conta A");
  expect(ownerB.session).toBeTruthy();
  expect(ownerB.session).not.toBe("athena-session-account-a");
  expect(ownerB.ownerAChat).toContain("conversa privada da conta A");
  expect(ownerB.ownerASession).toBe("athena-session-account-a");
  expect(ownerB.legacyChat).toContain("histórico antigo sem identidade");
  expect(ownerB.legacySession).toBe("legacy-athena-session");
});

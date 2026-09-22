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

  await page.locator('input[type="file"][accept*="audio"]').setInputFiles({
    name: "persistent-cover.wav",
    mimeType: "audio/wav",
    buffer: shortWav(),
  });
  await page.getByRole("button", { name: "Biblioteca" }).click();
  await expect(page.getByRole("button", { name: /persistent-cover/i }).first()).toBeVisible({ timeout: 20_000 });
  const coverInput = page.locator('input[type="file"][accept*="image/gif"]').first();
  await coverInput.setInputFiles({
    name: "music-cover.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByRole("status").last()).toContainText(/Capa animado salvo nesta faixa/i);
  await page.locator('input[type="file"][accept*="image/gif"]').last().setInputFiles({
    name: "music-background.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
  });
  await expect(page.getByRole("status").last()).toContainText(/Fundo animado salvo nesta faixa/i);

  await page.reload();
  await expect(page.locator('img[src^="data:image/gif"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-visual-scene="true"] img[src^="data:image/gif"]').first()).toBeVisible();
});

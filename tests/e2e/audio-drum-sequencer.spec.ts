import { expect, test } from "@playwright/test";

function sineWav(frequencyHz: number, durationSeconds = 1): Buffer {
  const sampleRate = 44100;
  const frames = Math.round(sampleRate * durationSeconds);
  const wav = Buffer.alloc(44 + frames * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + frames * 2, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(frames * 2, 40);
  for (let frame = 0; frame < frames; frame++) wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * frequencyHz * frame / sampleRate) * 12000), 44 + frame * 2);
  return wav;
}

function measurePositiveCrossingHz(wav: Buffer, startSeconds: number, durationSeconds = 0.25): number {
  const channels = wav.readUInt16LE(22);
  const sampleRate = wav.readUInt32LE(24);
  const firstFrame = Math.round(startSeconds * sampleRate);
  const frames = Math.round(durationSeconds * sampleRate);
  const sample = (frame: number) => {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) sum += wav.readInt16LE(44 + (frame * channels + channel) * 2);
    return sum / channels;
  };
  let crossings = 0;
  let previous = sample(firstFrame);
  for (let frame = firstFrame + 1; frame < firstFrame + frames; frame++) {
    const current = sample(frame);
    if (previous <= 0 && current > 0) crossings++;
    previous = current;
  }
  return crossings * sampleRate / frames;
}

test("persists a drum pattern and sends its edited hit to the musical project", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/modules/studio");
  await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
  await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
  await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Drum Sequencer");
  await page.getByRole("button", { name: /Criar Projeto/i }).click();
  await page.getByRole("button", { name: "Sound Design" }).click();
  await page.getByRole("button", { name: "Gerar ambience local" }).click();
  await expect(page.getByRole("status").last()).toContainText("Ambience rain procedural real gerado", { timeout: 20_000 });
  await page.getByLabel("Nome do sampler").fill("E2E kick sample");
  await page.getByLabel("Asset do sampler").selectOption({ label: "procedural-ambience-rain-5.0s.wav" });
  await page.getByRole("button", { name: "Adicionar sampler" }).click();
  await expect(page.getByRole("status").first()).toContainText("Sampler salvo no projeto");
  await page.getByRole("button", { name: "Drum Sequencer" }).click();
  await page.getByRole("button", { name: "Novo padrão" }).click();
  await page.getByLabel("Sample para Kick").selectOption({ label: "E2E kick sample" });

  const kick = page.getByRole("button", { name: "Kick passo 1", exact: true });
  await kick.click();
  await expect(kick).toHaveAttribute("aria-pressed", "true");
  const probability = page.getByLabel("Probabilidade do passo");
  await probability.focus();
  await probability.press("ArrowLeft");
  const microtiming = page.getByLabel("Microtiming do passo");
  await microtiming.focus();
  await microtiming.press("ArrowRight");
  await expect(probability).toHaveValue("0.99");
  await expect(microtiming).toHaveValue("1");
  await page.getByRole("button", { name: "Enviar para composição" }).click();
  await expect(page.getByRole("status")).toContainText("1 hit(s) enviados");

  await page.reload();
  await page.getByRole("button", { name: "Drum Sequencer" }).click();
  const restoredKick = page.getByRole("button", { name: "Kick passo 1", exact: true });
  await expect(restoredKick).toHaveAttribute("aria-pressed", "true");
  await restoredKick.click();
  await expect(page.getByLabel("Probabilidade do passo")).toHaveValue("0.99");
  await expect(page.getByLabel("Microtiming do passo")).toHaveValue("1");
  await restoredKick.click();
  await expect(restoredKick).toHaveAttribute("aria-pressed", "true");
  const restoredProbability = page.getByLabel("Probabilidade do passo");
  await restoredProbability.focus();
  await restoredProbability.press("ArrowRight");
  await page.getByRole("button", { name: "Enviar para composição" }).click();
  await page.getByRole("button", { name: "Tocar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible({ timeout: 10_000 });
  const playbackAlerts = (await page.getByRole("alert").allTextContents()).map((text) => text.trim()).filter(Boolean);
  expect(playbackAlerts, `Falha ao reproduzir o sample da bateria: ${playbackAlerts.join(" | ")}`).toEqual([]);
});

test("renders sampler root mapping at C3, C4 and C5 with the expected pitch", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/modules/studio");
  await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
  await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
  await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Melodic Sampler");
  await page.getByRole("button", { name: /Criar Projeto/i }).click();

  const audioChooser = page.waitForEvent("filechooser");
  await page.getByTitle("Importar Arquivo de Áudio").click();
  await (await audioChooser).setFiles({ name: "e2e-a4-reference.wav", mimeType: "audio/wav", buffer: sineWav(440) });
  const referenceClip = page.getByTestId("audio-clip-block").filter({ hasText: "e2e-a4-reference.wav" });
  await expect(referenceClip).toBeVisible({ timeout: 10_000 });
  await referenceClip.click();
  await page.keyboard.press("Delete");
  await expect(referenceClip).toHaveCount(0);

  await page.getByRole("button", { name: "Sound Design" }).click();
  await page.getByLabel("Nome do sampler").fill("E2E melodic sample");
  await page.getByLabel("Asset do sampler").selectOption({ label: "e2e-a4-reference.wav" });
  await page.getByLabel("Root MIDI do sampler").fill("69");
  await page.getByLabel("MIDI mínimo do sampler").fill("48");
  await page.getByLabel("MIDI máximo do sampler").fill("72");
  await page.getByRole("button", { name: "Adicionar sampler" }).click();
  await expect(page.getByRole("status").first()).toContainText("Sampler salvo no projeto");
  await page.getByRole("button", { name: "Timeline" }).click();

  page.once("dialog", (dialog) => void dialog.accept("INSTRUMENT"));
  await page.getByRole("button", { name: "Nova Faixa" }).click();
  const instrumentPicker = page.getByLabel("Instrumento melódico");
  await expect(instrumentPicker).toBeVisible();
  await instrumentPicker.selectOption({ label: "E2E melodic sample" });
  await expect(instrumentPicker.locator("option:checked")).toHaveText("E2E melodic sample");

  await page.reload();
  await page.getByRole("button", { name: "Selecionar faixa Faixa 2" }).click();
  const restoredInstrumentPicker = page.getByLabel("Instrumento melódico");
  await expect(restoredInstrumentPicker).toBeVisible();
  await expect(restoredInstrumentPicker.locator("option:checked")).toHaveText("E2E melodic sample");

  await page.getByRole("button", { name: "Piano Roll" }).click();
  for (const note of [{ label: "C3", midi: 48, beat: 1 }, { label: "C4", midi: 60, beat: 2 }, { label: "C5", midi: 72, beat: 3 }]) {
    const row = page.locator("[data-piano-roll-grid] > div.absolute.left-0").nth(72 - note.midi);
    await row.locator(":scope > div.relative.flex-1").dblclick({ position: { x: note.beat * 56 + 12, y: 10 } });
  }
  await expect(page.locator("[data-piano-note]")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Nota C3, início 1, duração 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nota C4, início 2, duração 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nota C5, início 3, duração 1/ })).toBeVisible();

  await page.getByRole("button", { name: "Exportar projeto" }).click();
  await expect(page.getByText("Exportar Mixagem de Áudio")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Renderizar & Baixar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/e2e-melodic-sampler\.wav$/);
  const stream = await download.createReadStream();
  if (!stream) throw new Error("O WAV exportado não forneceu um stream legível.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const wav = Buffer.concat(chunks);
  expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
  expect(wav.readUInt16LE(34)).toBe(16);
  for (const note of [{ name: "C3", midi: 48, start: 0.5 }, { name: "C4", midi: 60, start: 1 }, { name: "C5", midi: 72, start: 1.5 }]) {
    const expectedHz = 440 * Math.pow(2, (note.midi - 69) / 12);
    const measuredHz = measurePositiveCrossingHz(wav, note.start + 0.12);
    expect(Math.abs(measuredHz - expectedHz), `${note.name}: esperado ${expectedHz.toFixed(2)} Hz, medido ${measuredHz.toFixed(2)} Hz`).toBeLessThan(8);
  }
});

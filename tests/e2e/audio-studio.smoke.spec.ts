import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.describe("Audio Studio browser runtime", () => {
  const wav = () => { const sampleRate = 44100; const samples = sampleRate / 10; const buffer = Buffer.alloc(44 + samples * 2); buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40); for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 8) * 12000), 44 + i * 2); return buffer; };
  const longWav = () => { const sampleRate = 44100; const samples = sampleRate * 4; const buffer = Buffer.alloc(44 + samples * 2); buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40); for (let i = 0; i < samples; i++) { const distance = i % (sampleRate / 2); const click = distance < 900 ? 0.8 * Math.exp(-distance / 180) : 0; buffer.writeInt16LE(Math.round(click * 32767), 44 + i * 2); } return buffer; };
  test("opens the Studio route", async ({ page }) => {
    await page.goto("/modules/studio");
    await expect(page).toHaveURL(/modules\/studio/);
    await expect(page.locator("body")).toContainText(/Audio Studio|Studio/i);
  });

  test("browser exposes Web Audio capabilities", async ({ page }) => {
    await page.goto("/modules/studio");
    const capabilities = await page.evaluate(() => ({ audio: "AudioContext" in window, offline: "OfflineAudioContext" in window, media: Boolean(navigator.mediaDevices) }));
    expect(capabilities.audio).toBeTruthy();
    expect(capabilities.offline).toBeTruthy();
  });

  test("creates an audio project and exposes transport", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Audio Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await expect(page.getByTitle(/Gravar pelo microfone/i)).toBeVisible();
  });

  test("exports the musical model as MusicXML", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E MusicXML");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export MusicXML" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.musicxml$/i);
    const fs = await import("node:fs/promises");
    const content = await fs.readFile((await file.path())!);
    expect(content.toString("utf8")).toContain("score-partwise");
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF" }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
    const pdfBytes = await fs.readFile((await pdf.path())!);
    expect(pdfBytes.toString("ascii", 0, 8)).toBe("%PDF-1.4");
  });

  test("configures a synchronized metronome count-in", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Count In");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await page.getByRole("button", { name: /Metro$/i }).click();
    const countIn = page.getByLabel("Count-in do metrônomo");
    await countIn.click();
    await expect(countIn).toContainText("Count-in 1 comp.");
    await countIn.click();
    await expect(countIn).toContainText("Count-in 2 comp.");
    await countIn.click();
    await expect(countIn).toHaveText("Count-in");
  });

  test("versions synth presets and restores them after reload", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Synth Presets");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    page.once("dialog", (dialog) => { void dialog.accept("Lead E2E"); });
    await page.getByRole("button", { name: "Salvar versão" }).click();
    await expect(page.getByRole("button", { name: "Restaurar Lead E2E" })).toBeVisible();
    page.once("dialog", (dialog) => { void dialog.accept("Lead Renamed"); });
    await page.getByRole("button", { name: "Renomear" }).click();
    await expect(page.getByRole("button", { name: "Restaurar Lead Renamed" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Restaurar Lead Renamed" })).toBeVisible();
  });

  test("edits and persists the visual ADSR envelope", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E ADSR Envelope");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await expect(page.getByLabel("Editor visual ADSR")).toBeVisible();
    await expect(page.getByText("VARYNTH Piano", { exact: true })).toBeVisible();
    await page.getByLabel("Tecla MIDI 60").click();
    await expect(page.getByText(/VARYNTH Piano: nota MIDI 60 liberada/)).toBeVisible();
    await page.getByText("VARYNTH Piano", { exact: true }).click();
    await page.keyboard.down("a");
    await expect(page.getByText(/VARYNTH Piano: nota MIDI 60 ativa/)).toBeVisible();
    await page.keyboard.up("a");
    await expect(page.getByText(/VARYNTH Piano: nota MIDI 60 liberada/)).toBeVisible();
    const sustain = page.getByRole("button", { name: /Sustain pedal/ });
    const sustainBox = await sustain.boundingBox();
    if (!sustainBox) throw new Error("Pedal sustain sem geometria.");
    await page.mouse.move(sustainBox.x + sustainBox.width / 2, sustainBox.y + sustainBox.height / 2);
    await page.mouse.down();
    await expect(page.getByRole("button", { name: /Sustain ativo/ })).toHaveAttribute("aria-pressed", "true");
    await page.mouse.up();
    await expect(sustain).toHaveAttribute("aria-pressed", "false");
    const attack = page.getByLabel("Envelope ataque");
    await attack.fill("0.42");
    await expect(page.getByRole("img", { name: /ataque 0\.42 segundos/i })).toBeVisible();
    await page.getByLabel("LFO rate do synth").fill("2.5");
    await page.getByLabel("LFO depth do synth").fill("0.35");
    await page.reload();
    await expect(page.getByLabel("Envelope ataque")).toHaveValue("0.42");
    await expect(page.getByLabel("LFO rate do synth")).toHaveValue("2.5");
    await expect(page.getByLabel("LFO depth do synth")).toHaveValue("0.35");
    await expect(page.getByRole("img", { name: /ataque 0\.42 segundos/i })).toBeVisible();
  });

  test("opens mixer and project asset panels", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Mixer Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await page.getByRole("button", { name: "Mixer" }).click();
    await expect(page.locator("div.text-amber-300", { hasText: "Master" })).toBeVisible();
    const output = page.getByLabel("Voz Principal output bus");
    await expect(output).toHaveValue("master");
    await page.getByRole("button", { name: "+ Bus/Aux" }).click();
    await expect(page.locator("div.text-cyan-300", { hasText: "Bus 1" })).toBeVisible();
    await output.selectOption({ label: "Bus 1" });
    await expect(output).toHaveValue(/bus-/);
    await expect(page.getByLabel("Bus 1 output bus")).toHaveValue("master");
    await page.getByRole("button", { name: "Voz Principal add send" }).click();
    const sendDestination = page.getByLabel(/Voz Principal send .* destination/);
    await expect(sendDestination).toHaveValue(/bus-/);
    await expect(page.getByText("Pré-fader")).toBeVisible();
    const busSolo = page.getByRole("button", { name: "Bus 1 solo" });
    await busSolo.click();
    await expect(busSolo).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Assets/i }).click();
    await expect(page.getByText(/Nenhum asset de áudio vinculado/i)).toBeVisible();
  });

  test("builds independent ambience layers from local assets and exports a layer stem", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Ambience Layers");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "rain-bed.wav", mimeType: "audio/wav", buffer: wav() });
    await page.getByRole("button", { name: "Ambience Layers" }).click();
    await expect(page.getByRole("heading", { name: "Ambience · Camadas independentes" })).toBeVisible();
    await page.getByRole("button", { name: "Nova camada" }).click();
    const layerName = page.getByRole("textbox", { name: "Nome da camada Ambience 1" });
    await layerName.fill("Rain bed");
    const volume = page.getByRole("slider", { name: "Volume da camada Rain bed" });
    await volume.fill("72");
    const pan = page.getByRole("slider", { name: "Pan da camada Rain bed" });
    await pan.fill("-35");
    const mute = page.getByRole("button", { name: "Silenciar camada Rain bed" });
    await mute.click();
    await expect(page.getByRole("button", { name: "Ativar camada Rain bed" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Solo camada Rain bed" }).click();
    await expect(page.getByRole("button", { name: "Desisolar camada Rain bed" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Nova camada" }).click();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Assets", exact: true }).first().click();
    await expect(page.getByText("rain-bed.wav", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Inserir" }).click();
    await expect(page.getByText(/1 clips · rain-bed\.wav/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Volume" })).toBeVisible();
    await page.getByRole("button", { name: "+ Volume" }).click();
    await expect(page.getByLabel("Automação TRACK_VOLUME")).toBeVisible();
    await page.getByRole("button", { name: "Timeline", exact: true }).first().click();
    const rainClips = page.getByTestId("audio-clip-block").filter({ hasText: "rain-bed.wav" });
    await expect(rainClips).toHaveCount(2); // original import plus the ambience-layer reference
    await expect(rainClips.first()).toBeVisible();
    await expect(rainClips.last()).toBeVisible();
    await page.getByTitle("Exportar projeto").click();
    await page.getByRole("button", { name: "Stems" }).click();
    await page.getByLabel("Rain bed").check();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Renderizar & Baixar/i }).click();
    expect((await download).suggestedFilename()).toMatch(/rain-bed\.wav$/);
  });

  test("opens Voice and Analysis modes without simulating generated audio", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: () => Promise.reject(new DOMException("permission denied by e2e", "NotAllowedError")) });
    });
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Voice Analysis Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await page.getByRole("button", { name: "Voice" }).click();
    await expect(page.getByRole("heading", { name: /Voice Studio/i })).toBeVisible();
    await page.getByLabel("Versão do perfil vocal").fill("Euterpe Voice v2");
    await page.getByLabel("Versão do perfil vocal").blur();
    await expect(page.getByText(/Euterpe Voice v2/)).toBeVisible();
    await page.getByLabel("Processamento vocal Noise Gate").check();
    await page.getByLabel("Ganho do EQ vocal em dB").fill("3");
    await page.getByLabel("Threshold do compressor").fill("0.55");
    await page.getByPlaceholder(/Digite a fala da Euterpe/i).fill("Olá, esta é uma take de teste.");
    await page.getByRole("button", { name: "Registrar rascunho" }).click();
    await expect(page.getByRole("status")).toContainText(/Take de rascunho registrada/i);
    await expect(page.getByRole("button", { name: "Processar localmente" })).toBeDisabled();
    await page.getByLabel("Forma escrita da nova pronúncia").fill("VARYNTH");
    await page.getByLabel("Pronúncia da nova entrada").fill("va-rin-te");
    await page.getByRole("button", { name: "Adicionar entrada" }).click();
    await expect(page.getByLabel("Forma escrita 1")).toHaveValue("VARYNTH");
    await page.getByRole("button", { name: "☆ Favoritar" }).click();
    await expect(page.getByRole("button", { name: "★ Favorita" })).toBeVisible();
    await expect(page.getByLabel("Versão do perfil vocal")).toHaveValue("Euterpe Voice v2");
    await expect(page.getByLabel("Processamento vocal Noise Gate")).toBeChecked();
    await expect(page.getByLabel("Ganho do EQ vocal em dB")).toHaveValue("3");
    await expect(page.getByLabel("Threshold do compressor")).toHaveValue("0.55");
    await page.getByRole("textbox", { name: /Anotação do take/ }).fill("Comparar dicção e ritmo");
    await page.getByRole("button", { name: "A/B A" }).click();
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: "Voice" })).toBeVisible();
    await page.getByRole("button", { name: "Voice" }).click();
    await expect(page.getByRole("button", { name: "★ Favorita" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Anotação do take/ })).toHaveValue("Comparar dicção e ritmo");
    await expect(page.getByRole("button", { name: "A/B A" })).toHaveClass(/bg-cyan-700/);
    await expect(page.getByLabel("Forma escrita 1")).toHaveValue("VARYNTH");
    await expect(page.getByLabel("Pronúncia 1")).toHaveValue("va-rin-te");
    await page.getByRole("button", { name: "Analysis" }).click();
    await expect(page.getByRole("heading", { name: "Analysis", exact: true })).toBeVisible();
    await expect(page.getByLabel("Espectro real")).toBeAttached();
    await page.getByRole("button", { name: "Ativar microfone" }).click();
    await expect(page.locator("p[role='alert']")).toContainText("Permissão de microfone negada");
    await expect(page.getByRole("button", { name: "Ativar microfone" })).toBeVisible();
  });

  test("generates a real local procedural noise asset", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Procedural Noise");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await page.getByRole("button", { name: "Sound Design" }).click();
    await page.getByLabel("Duração (s)").fill("0.1");
    await page.getByLabel("Tipo de ambience").selectOption("forest");
    await page.getByLabel("Intensidade do ambience").fill("0.8");
    await page.getByLabel("Densidade do ambience").fill("0.6");
    await page.getByRole("button", { name: "Gerar ambience local" }).click();
    await expect(page.getByRole("status")).toContainText(/Ambience forest procedural real gerado/i);
    await page.getByRole("button", { name: "Ruído rosa" }).click();
    await expect(page.getByRole("status")).toContainText(/Ruído pink local gerado/i);
  });

  test("measures integrated loudness from a selected local audio clip", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Loudness Analysis");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "loudness-tone.wav", mimeType: "audio/wav", buffer: longWav() });
    await page.getByTestId("audio-clip-block").click();
    await page.getByRole("button", { name: "Analysis" }).click();
    await expect(page.getByText("Selecione um ou mais clipes na timeline para medir o loudness.")).toHaveCount(0);
    await page.getByRole("button", { name: /Analisar selecionados \(1\)/ }).click();
    await expect(page.getByText("LUFS integrado", { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Tempo estimado 120 BPM/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("listitem").getByText("loudness-tone.wav")).toBeVisible();
  });

  test("changes master and automation controls", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Controls Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await expect(page.getByText(/Automação/i).first()).toBeVisible();
    await page.getByRole("button", { name: /\+ Volume/i }).click();
    await expect(page.getByLabel(/Automação TRACK_VOLUME/i)).toBeVisible();
    await page.getByRole("button", { name: "Mixer" }).click();
    const master = page.getByLabel("Master volume");
    await master.fill("0.75");
    await expect(master).toHaveValue("0.75");
  });

  test("imports a real WAV and exposes it as an asset", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Import Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "tone.wav", mimeType: "audio/wav", buffer: wav() });
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("tone.wav", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    const search = page.getByRole("textbox", { name: "Pesquisar assets de áudio" });
    await search.fill("tone");
    await expect(page.getByText("tone.wav", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Filtrar por taxa de amostragem")).toHaveValue("");
    await page.getByLabel("Filtrar por taxa de amostragem").selectOption("44100");
    await page.getByLabel("Filtrar por número de canais").selectOption("1");
    await page.getByLabel("Duração mínima do asset (ms)").fill("99");
    await page.getByLabel("Duração máxima do asset (ms)").fill("101");
    await expect(page.getByText("tone.wav", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await page.getByRole("button", { name: "Editar metadados" }).click();
    await page.getByLabel("Categoria do projeto para tone.wav").fill("Ambience");
    await page.getByLabel("Tags do projeto para tone.wav").fill("rain, storm, rain");
    await page.getByLabel("Personagem do projeto para tone.wav").fill("Euterpe");
    await page.getByLabel("BPM do projeto para tone.wav").fill("96");
    await page.getByLabel("Tonalidade do projeto para tone.wav").fill("A minor");
    await page.getByLabel("Declaração de licença para tone.wav").fill("CC0 (user claim)");
    await page.getByLabel("Atribuição para tone.wav").fill("Audio fixture source");
    await page.getByLabel("Notas do projeto para tone.wav").fill("Local ambience annotation");
    await page.getByRole("button", { name: "Salvar metadados do projeto" }).click();
    await expect(page.getByText("#storm", { exact: true })).toBeVisible();
    await expect(page.getByText(/Declaração do projeto \(não verificada\): CC0 \(user claim\)/)).toBeVisible();
    await expect(page.getByText("Salvo", { exact: true })).toBeAttached({ timeout: 5000 });
    await search.fill("asset-que-nao-existe");
    await expect(page.getByRole("status")).toContainText("Nenhum asset corresponde aos filtros.");
    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(page.getByText("tone.wav", { exact: true }).first()).toBeVisible();
    await page.getByTitle("Sumário / Estrutura (Outline)").click();
    await page.getByTestId("audio-clip-block").click();
    await page.getByLabel("Grupo de variação").fill("footsteps");
    await page.getByLabel("Peso da variação").fill("2.5");
    await page.getByLabel("Seed da variação").fill("17");
    await page.getByLabel("Política de seleção da variação").selectOption("weighted");
    await page.getByLabel("Variável da condição").fill("weather");
    await page.getByLabel("Valor da condição").fill("rain");
    await page.getByRole("button", { name: "Adicionar condição" }).click();
    await expect(page.getByText("weather EQUALS rain")).toBeVisible();
    await page.getByLabel("Evento volume mínimo").fill("0.4");
    await page.getByLabel("Evento volume máximo").fill("0.9");
    await page.getByLabel("Evento velocidade mínimo").fill("0.8");
    await page.getByLabel("Evento velocidade máximo").fill("1.2");
    await page.getByLabel("Tags Game Audio do clip").fill("Metal, bright, metal");
    await page.getByLabel("Loop deste clip").check();
    await page.getByLabel("Início do loop em ms").fill("20");
    await page.getByLabel("Fim do loop em ms").fill("80");
    await page.getByLabel("Crossfade do loop em ms").fill("10");
    const gameAudioDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar Game Audio" }).click();
    const gameAudioFile = await gameAudioDownload;
    expect(gameAudioFile.suggestedFilename()).toMatch(/game-audio\.json$/);
    await expect(page.getByRole("status")).toContainText("1 assets, 1 eventos");
    const gameAudioPath = await gameAudioFile.path();
    expect(gameAudioPath).toBeTruthy();
    const packageJson = await readFile(gameAudioPath!, "utf8");
    const exportedPackage = JSON.parse(packageJson) as { assets: Array<{ tags: string[] }>; events: Array<{ id: string; conditions?: Array<{ variableId: string; operator: string; value: string }> }>; variationGroups: Array<{ selectionMode?: string; variations: Array<{ tags: string[] }> }> };
    expect(exportedPackage.events).toHaveLength(1);
    expect(exportedPackage.events[0]?.conditions).toEqual([{ variableId: "weather", operator: "EQUALS", value: "rain" }]);
    expect(exportedPackage.variationGroups).toMatchObject([{ id: "footsteps", seed: 17, selectionMode: "weighted", variations: [{ assetId: expect.any(String), weight: 2.5 }] }]);
    expect(exportedPackage.events[0]).toMatchObject({ volumeRange: [0.4, 0.9], pitchRange: [0.8, 1.2] });
    expect(exportedPackage.events[0]).toMatchObject({ loop: { startMs: 20, endMs: 80, crossfadeMs: 10, loopable: true } });
    expect(exportedPackage.variationGroups[0]?.variations[0]?.tags).toEqual(expect.arrayContaining(["Metal", "bright"]));
    expect(exportedPackage.variationGroups[0]?.variations[0]?.tags.filter((tag) => tag.toLowerCase() === "metal")).toHaveLength(1);
    expect(exportedPackage.assets[0]?.tags).toEqual(expect.arrayContaining(["Metal", "bright"]));
    const bundleDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar Bundle", exact: true }).click();
    const bundleFile = await bundleDownload;
    expect(bundleFile.suggestedFilename()).toMatch(/game-audio-bundle\.zip$/);
    const bundleBytes = await readFile((await bundleFile.path())!);
    expect(bundleBytes.toString("binary", 0, 2)).toBe("PK");
    expect(bundleBytes.toString("binary")).toContain("manifest.json");
    expect(bundleBytes.toString("binary")).toContain("game-audio.json");

    await page.getByRole("button", { name: "Game Audio Browser" }).click();
    await expect(page.getByRole("heading", { name: "Game Audio · Grupos e eventos" })).toBeVisible();
    await expect(page.getByText("Pacote local válido para exportação de metadados.")).toBeVisible();
    await page.getByLabel("Pesquisar grupos e eventos Game Audio").fill("metal");
    await expect(page.getByText("Metal · bright")).toBeVisible();
    await page.getByRole("button", { name: "Abrir clip" }).click();
    await expect(page.getByLabel("Tags Game Audio do clip")).toHaveValue("Metal, bright");

    await page.getByTitle("Voltar ao Studio Hub").click({ force: true });
    await page.goto("/modules/studio?studio=AUDIO");
    await expect(page.getByRole("button", { name: /Game Studio \(Studio 6\)/i })).toBeVisible();
    await page.getByRole("button", { name: /Game Studio \(Studio 6\)/i }).click();
    await page.getByRole("button", { name: "Novo Jogo" }).click();
    await page.getByText("Projeto 2D em Branco", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Importar Game Audio" })).toBeVisible();
    const packageChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Importar Bundle" }).click();
    await (await packageChooser).setFiles((await bundleFile.path())!);
    await expect(page.getByText(/Game Audio ativo: 1 assets · 1 eventos · 1 grupos/i)).toBeVisible();
    await page.getByLabel("Ação").selectOption("PLAY_AUDIO");
    const eventPicker = page.getByLabel("Evento de áudio da regra Iniciar Jogo");
    await eventPicker.selectOption(exportedPackage.events[0].id);
    await page.getByRole("button", { name: "Play Mode (Sandbox)" }).click();
    await expect(page.getByText(new RegExp(`\\[ACTION_AUDIO_EVENT\\].*${exportedPackage.events[0].id}`))).toBeVisible();
    await expect(page.locator("p[role='status']").filter({ hasText: "Reproduzindo asset" })).toBeVisible();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await page.getByRole("button", { name: "Executar", exact: true }).click();
    await expect(page.locator("p[role='status']").filter({ hasText: "Reproduzindo asset" })).toBeVisible();
  });

  test("edits and persists spatial audio for a selected clip", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Spatial Audio");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "spatial.wav", mimeType: "audio/wav", buffer: wav() });
    await page.getByTitle("Sumário / Estrutura (Outline)").click();
    await page.getByTestId("audio-clip-block").click();
    await page.getByLabel("Posição x").fill("2.5");
    await page.getByLabel("Posição y").fill("-1");
    await page.getByLabel("Posição z").fill("4");
    await page.getByLabel("Distância de referência").fill("2");
    await page.getByLabel("Distância máxima").fill("80");
    await page.getByLabel("Fator de rolloff").fill("1.5");
    await expect(page.getByLabel("Posição x")).toHaveValue("2.5");
    await page.reload();
    await page.getByTestId("audio-clip-block").click();
    await expect(page.getByLabel("Posição x")).toHaveValue("2.5");
    await expect(page.getByLabel("Distância máxima")).toHaveValue("80");
  });

  test("persists project-scoped asset annotations and measured technical filters after reload", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Asset Metadata Persistence");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "room-tone.wav", mimeType: "audio/wav", buffer: wav() });
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("room-tone.wav", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Filtrar por taxa de amostragem")).toContainText("44100 Hz");
    await expect(page.getByLabel("Filtrar por número de canais")).toContainText("1 ch");
    await expect(page.getByText("100ms", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "Editar metadados" }).click();
    await page.getByLabel("Categoria do projeto para room-tone.wav").fill("Room Tone");
    await page.getByLabel("Tags do projeto para room-tone.wav").fill("interior, quiet");
    await page.getByLabel("Declaração de licença para room-tone.wav").fill("CC0 (user claim)");
    await page.getByLabel("Atribuição para room-tone.wav").fill("Studio field recording");
    await page.getByRole("button", { name: "Salvar metadados do projeto" }).click();
    await expect(page.getByText("#quiet", { exact: true })).toBeVisible();
    await expect(page.getByText("Salvo", { exact: true })).toBeAttached({ timeout: 5000 });
    await page.reload();
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("#quiet", { exact: true })).toBeVisible();
    await expect(page.getByText(/Declaração do projeto \(não verificada\): CC0 \(user claim\)/)).toBeVisible();
    await expect(page.getByLabel("Filtrar por taxa de amostragem")).toContainText("44100 Hz");
    await expect(page.getByLabel("Filtrar por número de canais")).toContainText("1 ch");
  });

  test("flushes a pending audio edit during pagehide before its debounce expires", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Audio Pagehide Recovery");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "pagehide-tone.wav", mimeType: "audio/wav", buffer: wav() });
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    const assetCard = page.locator("article").filter({ hasText: "pagehide-tone.wav" });
    await assetCard.getByRole("button", { name: "Editar metadados" }).click();
    await page.getByLabel("Tags do projeto para pagehide-tone.wav").fill("crash-recovery");
    await page.getByRole("button", { name: "Salvar metadados do projeto" }).click();
    await expect(page.getByText("Salvando...").locator("..")).toHaveClass(/animate-pulse/);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    await page.reload();
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("#crash-recovery", { exact: true })).toBeVisible();
  });

  test("rejects audio with unknown duration without creating a guessed 15-second clip", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Unknown Duration Import");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "unreadable.wav", mimeType: "audio/wav", buffer: Buffer.from("not a RIFF audio container") });
    await expect(page.locator('[role="alert"]').filter({ hasText: "[AUDIO_DURATION_UNKNOWN]" })).toBeVisible();
    await expect(page.getByTestId("audio-clip-block")).toHaveCount(0);
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("Nenhum asset de áudio vinculado.")).toBeVisible();
  });

  test("recovers real duration when inserting a legacy asset whose duration metadata is missing", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Legacy Asset Duration Recovery");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "legacy-room-tone.wav", mimeType: "audio/wav", buffer: wav() });
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("legacy-room-tone.wav", { exact: true }).first()).toBeVisible();

    // Simulate an older valid asset record that predates reliable duration metadata;
    // the binary remains in IndexedDB and must be measured by the browser decoder.
    await page.evaluate(() => {
      const key = "varynth_assets_registry_v4";
      const assets = JSON.parse(localStorage.getItem(key) || "[]");
      const asset = assets.find((item: { name?: string }) => item.name === "legacy-room-tone.wav");
      if (!asset) throw new Error("Legacy WAV fixture was not registered");
      delete asset.metadata?.durationMs;
      localStorage.setItem(key, JSON.stringify(assets));
    });
    await page.reload();
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    const assetCard = page.locator("article").filter({ hasText: "legacy-room-tone.wav" });
    await expect(assetCard.getByText("Duração não medida")).toBeVisible();
    await assetCard.getByRole("button", { name: "Inserir" }).click();
    await expect(assetCard.getByRole("button", { name: "Inserido ✓" })).toBeVisible();
    const recoveredClips = page.getByTestId("audio-clip-block").filter({ hasText: "legacy-room-tone.wav" });
    await expect(recoveredClips).toHaveCount(2);
    await expect(recoveredClips.last()).toBeVisible();
    await expect(assetCard.getByText("100ms", { exact: false })).toBeVisible();
  });

  test("applies Game Audio variation settings atomically to a multi-clip selection", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Batch Game Audio");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    for (const filename of ["batch-grass.wav", "batch-gravel.wav"]) {
      const chooser = page.waitForEvent("filechooser");
      await page.getByTitle("Importar Arquivo de Áudio").click();
      await (await chooser).setFiles({ name: filename, mimeType: "audio/wav", buffer: wav() });
    }
    const grass = page.getByTestId("audio-clip-block").filter({ hasText: "batch-grass.wav" });
    const gravel = page.getByTestId("audio-clip-block").filter({ hasText: "batch-gravel.wav" });
    await expect(grass).toBeVisible();
    await expect(gravel).toBeVisible();
    const gravelBounds = await gravel.boundingBox();
    expect(gravelBounds).toBeTruthy();
    await page.mouse.move(gravelBounds!.x + gravelBounds!.width / 2, gravelBounds!.y + gravelBounds!.height / 2);
    await page.mouse.down();
    await page.mouse.move(gravelBounds!.x + gravelBounds!.width / 2 + 260, gravelBounds!.y + gravelBounds!.height / 2, { steps: 8 });
    await page.mouse.up();
    await grass.click();
    await gravel.click({ modifiers: ["Control"] });
    await expect(page.getByLabel("Edição em lote Game Audio")).toBeVisible();
    await page.getByLabel("Grupo de variação em lote").fill("surface-steps");
    await page.getByLabel("Seed de variação em lote").fill("41");
    await page.getByLabel("Peso em lote").fill("2.75");
    await page.getByLabel("Tags Game Audio em lote").fill("wood, dry, WOOD");
    await page.getByLabel("Volume mínimo em lote").fill("0.25");
    await page.getByLabel("Volume máximo em lote").fill("0.85");
    await page.getByLabel("Velocidade mínimo em lote").fill("0.9");
    await page.getByLabel("Velocidade máximo em lote").fill("1.1");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar Game Audio" }).click();
    const file = await download;
    const json = JSON.parse(await readFile((await file.path())!, "utf8")) as { variationGroups: Array<{ id: string; seed?: number; variations: Array<{ weight: number; tags: string[] }> }>; events: Array<{ volumeRange: number[]; pitchRange: number[] }> };
    expect(json.variationGroups).toMatchObject([{ id: "surface-steps", seed: 41, variations: [{ weight: 2.75, tags: expect.arrayContaining(["wood", "dry"]) }, { weight: 2.75, tags: expect.arrayContaining(["wood", "dry"]) }] }]);
    expect(json.variationGroups[0]?.variations.every((variation) => variation.tags.filter((tag) => tag.toLowerCase() === "wood").length === 1)).toBeTruthy();
    expect(json.events).toHaveLength(2);
    expect(json.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ volumeRange: [0.25, 0.85], pitchRange: [0.9, 1.1] }),
      expect.objectContaining({ volumeRange: [0.25, 0.85], pitchRange: [0.9, 1.1] }),
    ]));
  });

  test("enables a source-relative loop on an imported clip", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Loop Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "loop-tone.wav", mimeType: "audio/wav", buffer: wav() });
    const clip = page.getByTestId("audio-clip-block").filter({ hasText: "loop-tone.wav" });
    await expect(clip).toBeVisible({ timeout: 10_000 });
    await clip.click();
    const loopToggle = page.getByRole("checkbox", { name: "Loop deste clip" });
    await expect(loopToggle).toBeVisible();
    await loopToggle.check();
    await expect(loopToggle).toBeChecked();
    await page.getByLabel("Início do loop em ms").fill("20");
    await page.getByLabel("Fim do loop em ms").fill("80");
    await page.getByLabel("Crossfade do loop em ms").fill("10");
    await expect(page.getByLabel("Crossfade do loop em ms")).toHaveValue("10");
    await page.getByTitle("Reproduzir (Espaço)").click();
    await expect(page.getByTitle("Pausar (Espaço)")).toBeVisible();
    await page.getByTitle("Pausar (Espaço)").click();
    await page.getByTitle("Exportar projeto").click();
    await expect(page.getByText("Exportar Mixagem de Áudio", { exact: true })).toBeVisible();
    const [renderDownload] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: /Renderizar & Baixar/i }).click(),
    ]);
    const renderedBytes = await readFile((await renderDownload.path())!);
    expect(renderedBytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(renderedBytes.length).toBeGreaterThan(44);
  });

  test("imports MIDI into structured tracks and opens musical editors", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E MIDI Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const midi = Buffer.from([0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xe0,0x4d,0x54,0x72,0x6b,0,0,0,19,0,0xff,0x51,3,0x07,0xa1,0x20,0,0x90,60,100,0x83,0x60,0x80,60,0,0,0xff,0x2f,0]);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import MIDI" }).click();
    await (await chooser).setFiles({ name: "melody.mid", mimeType: "audio/midi", buffer: midi });
    await expect(page.getByRole("main").getByText("MIDI 1", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await expect(page.getByText(/Piano Roll/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Timeline" }).click();
    await page.getByRole("button", { name: "Score" }).click();
    await expect(page.getByText(/Score View|Partitura/i).first()).toBeVisible();
    const scoreNote = page.getByRole("button", { name: /Nota C4, início 0, duração 1/ }).first();
    await expect(scoreNote).toBeVisible();
    await scoreNote.click();
    await page.getByRole("button", { name: "Adicionar acorde" }).click();
    await expect(page.getByRole("button", { name: /Nota E4, início 0, duração 1/ })).toBeVisible();
    await page.getByRole("spinbutton", { name: "Duração da nota na partitura" }).fill("2");
    await expect(page.getByRole("button", { name: /Nota C4, início 0, duração 2/ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Timeline" }).click();
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await expect(page.getByRole("button", { name: /Nota C4, início 0, duração 2/ })).toBeVisible();
  });

  test("persists a composed MIDI project through a full browser reload", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Audio Persistence Roundtrip");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const wavChooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await wavChooser).setFiles({ name: "persistent-source.wav", mimeType: "audio/wav", buffer: wav() });
    await expect(page.getByTestId("audio-clip-block").filter({ hasText: "persistent-source.wav" })).toBeVisible({ timeout: 10_000 });
    const midi = Buffer.from([0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xe0,0x4d,0x54,0x72,0x6b,0,0,0,19,0,0xff,0x51,3,0x07,0xa1,0x20,0,0x90,60,100,0x83,0x60,0x80,60,0,0,0xff,0x2f,0]);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import MIDI" }).click();
    await (await chooser).setFiles({ name: "persistent.mid", mimeType: "audio/midi", buffer: midi });
    await expect(page.getByRole("main").getByText("MIDI 1", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await expect(page.getByRole("button", { name: /Nota C4, início 0, duração 1/ })).toBeVisible();
    await page.getByRole("button", { name: "Voice" }).click();
    await page.getByPlaceholder(/Digite a fala da Euterpe/i).fill("Take local que deve sobreviver ao reload.");
    await page.getByRole("button", { name: "Registrar rascunho" }).click();
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("varynth_audio_state_")).some((key) => {
      try {
        const state = JSON.parse(localStorage.getItem(key) || "null");
        return state?.tracks?.some((track: { clips?: Array<{ assetId?: string; sourceEndMs?: number }> }) => track.clips?.some((clip) => Boolean(clip.assetId) && clip.sourceEndMs === 100)) && state?.tracks?.some((track: { type?: string }) => track.type === "MIDI") && state?.music?.clips?.some((clip: { notes?: unknown[] }) => (clip.notes?.length || 0) > 0) && state?.voiceTakes?.some((take: { text?: string }) => take.text === "Take local que deve sobreviver ao reload.");
      } catch { return false; }
    })), { timeout: 10_000 }).toBeTruthy();
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((candidate) => candidate.startsWith("varynth_audio_state_") && (() => {
        try { const state = JSON.parse(localStorage.getItem(candidate) || "null"); return state?.voiceTakes?.some((take: { text?: string }) => take.text === "Take local que deve sobreviver ao reload."); } catch { return false; }
      })());
      if (!key) throw new Error("Snapshot de áudio não encontrado para simular schema legado.");
      const legacy = JSON.parse(localStorage.getItem(key) || "null");
      legacy.projectSchemaVersion = 1;
      delete legacy.buses;
      delete legacy.masterBus;
      delete legacy.automation;
      localStorage.setItem(key, JSON.stringify(legacy));
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "E2E Audio Persistence Roundtrip" })).toBeAttached({ timeout: 10_000 });
    await expect(page.getByRole("main").getByText("MIDI 1", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await expect(page.getByRole("button", { name: /Nota C4, início 0, duração 1/ })).toBeVisible();
    await page.getByRole("button", { name: /Nota C4, início 0, duração 1/ }).click();
    await page.getByRole("spinbutton", { name: "Duração da nota" }).fill("2");
    await expect(page.getByRole("button", { name: /Nota C4, início 0, duração 2/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("varynth_audio_state_")).some((key) => {
      try { const state = JSON.parse(localStorage.getItem(key) || "null"); return state?.projectSchemaVersion === 4 && state?.music?.clips?.some((clip: { notes?: Array<{ durationBeats?: number }> }) => clip.notes?.some((note) => note.durationBeats === 2)); } catch { return false; }
    })), { timeout: 10_000 }).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("heading", { name: "E2E Audio Persistence Roundtrip" })).toBeAttached({ timeout: 10_000 });
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await expect(page.getByRole("button", { name: /Nota C4, início 0, duração 2/ })).toBeVisible();
    await page.getByTitle("Reproduzir (Espaço)").click();
    await expect(page.getByTitle("Pausar (Espaço)")).toBeVisible();
    await page.getByTitle("Pausar (Espaço)").click();
    await page.getByTitle("Exportar projeto").click();
    await expect(page.getByRole("heading", { name: "Exportar Mixagem de Áudio" })).toBeVisible();
    await page.getByRole("button", { name: "Renderizar & Baixar" }).click();
    await expect(page.getByText("Mixagem Baixada!")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Voice" }).click();
    await expect(page.getByText("Take local que deve sobreviver ao reload.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Assets Físicos e Anexos" }).click();
    await expect(page.getByText("persistent-source.wav", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview", exact: true }).last().click();
    await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  });

  test("edits existing Piano Roll notes with direct fields, duplicate and delete", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Piano Roll Editing");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import MIDI" }).click();
    const midi = Buffer.from([0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xe0,0x4d,0x54,0x72,0x6b,0,0,0,19,0,0xff,0x51,3,0x07,0xa1,0x20,0,0x90,60,100,0x83,0x60,0x80,60,0,0,0xff,0x2f,0]);
    await (await chooser).setFiles({ name: "editable.mid", mimeType: "audio/midi", buffer: midi });
    await expect(page.getByRole("main").getByText("MIDI 1", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await page.getByLabel("Tônica musical").selectOption("D");
    await page.getByLabel("Escala musical").selectOption("dorian");
    await page.reload();
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await expect(page.getByLabel("Tônica musical")).toHaveValue("D");
    await expect(page.getByLabel("Escala musical")).toHaveValue("dorian");
    const note = page.getByRole("button", { name: /Nota C4, início 0, duração 1/ });
    await expect(note).toBeVisible();
    const noteBox = await note.boundingBox();
    if (!noteBox) throw new Error("Nota MIDI sem geometria renderizada.");
    await page.mouse.move(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(noteBox.x + noteBox.width / 2 + 40, noteBox.y + noteBox.height / 2 - 24, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole("button", { name: /Nota C#4, início 1, duração 1/ })).toBeVisible();
    const movedNote = page.getByRole("button", { name: /Nota C#4, início 1, duração 1/ });
    const resizeHandle = movedNote.locator('[aria-label="Redimensionar nota"]');
    const handleBox = await resizeHandle.boundingBox();
    if (!handleBox) throw new Error("Alça de resize da nota sem geometria renderizada.");
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 40, handleBox.y + handleBox.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole("button", { name: /Nota C#4, início 1, duração/ })).toBeVisible();
    await page.getByRole("button", { name: /Nota C#4, início 1, duração/ }).click();
    await page.getByRole("spinbutton", { name: "Início da nota" }).fill("0.5");
    await page.getByRole("spinbutton", { name: "Duração da nota" }).fill("1.5");
    await expect(page.getByRole("button", { name: /Nota C#4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.getByLabel("Tuplet atual").fill("3");
    await page.getByLabel("Tuplet normal").fill("2");
    await expect(page.getByLabel("Tuplet atual")).toHaveValue("3");
    await expect(page.getByLabel("Tuplet normal")).toHaveValue("2");
    await expect(page.getByLabel("Articulação da nota")).toBeVisible();
    await expect(page.getByLabel("Expressão da nota")).toBeVisible();
    await expect(page.getByTitle("Desfazer (Ctrl+Z)")).toBeEnabled();
    await page.getByRole("button", { name: "Transpor nota um semitom acima" }).click();
    await expect(page.getByRole("button", { name: /Nota D4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.getByTitle("Desfazer (Ctrl+Z)").click();
    await expect(page.getByRole("button", { name: /Nota C#4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.getByTitle("Refazer (Ctrl+Y)").click();
    await expect(page.getByRole("button", { name: /Nota D4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.waitForTimeout(1000);
    await page.reload();
    await page.getByRole("button", { name: "Piano Roll" }).click();
    await page.getByTitle("Desfazer (Ctrl+Z)").click();
    await expect(page.getByRole("button", { name: /Nota C#4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.getByTitle("Refazer (Ctrl+Y)").click();
    await expect(page.getByRole("button", { name: /Nota D4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.getByRole("button", { name: /Nota D4, início 0\.5, duração 1\.5/ }).click();
    await page.getByRole("button", { name: "Duplicar", exact: true }).click();
    await expect(page.getByText(/2 notas · 1 selecionadas/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Nota D4, início 2, duração 1\.5/ })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar seleção" }).click();
    await page.getByRole("button", { name: /Nota D4, início 0\.5, duração 1\.5/ }).click();
    await expect(page.getByText(/2 notas · 2 selecionadas/)).toBeVisible();
    await expect(page.getByLabel("Lane visual de velocity")).toBeVisible();
    await page.getByRole("button", { name: /Humanizar selecionadas/ }).click();
    const revertHumanize = page.getByRole("button", { name: "Reverter humanização" });
    await expect(revertHumanize).toBeEnabled();
    await revertHumanize.click();
    await expect(revertHumanize).toBeDisabled();
    await page.getByRole("button", { name: /Quantizar selecionadas \(2\)/ }).click();
    const revertQuantize = page.getByRole("button", { name: "Reverter quantização" });
    await expect(revertQuantize).toBeEnabled();
    await revertQuantize.click();
    await expect(revertQuantize).toBeDisabled();
    await page.getByRole("slider", { name: "Velocity" }).fill("110");
    await expect(page.getByRole("button", { name: /Nota D4, início 0\.5, duração 1\.5/ })).toBeVisible();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByText(/0 notas · 0 selecionadas/)).toBeVisible();
  });

  test("persists musical loop region in measure units", async ({ page }) => {
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Musical Loop Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const enabled = page.getByRole("checkbox", { name: "Loop musical ativo" });
    const startBar = page.getByRole("spinbutton", { name: "Compasso inicial do loop" });
    const endBar = page.getByRole("spinbutton", { name: "Compasso final do loop" });
    await startBar.fill("2");
    await endBar.fill("6");
    await enabled.check();
    await expect(enabled).toBeChecked();
    await expect(startBar).toHaveValue("2");
    await expect(endBar).toHaveValue("6");
  });

  test("musical loop wraps the audio transport at the configured measure boundary", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Loop Transport Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    await page.getByRole("spinbutton", { name: "Compasso final do loop" }).fill("2");
    await page.getByRole("checkbox", { name: "Loop musical ativo" }).check();
    await page.getByTitle("Reproduzir (Espaço)").click();
    await page.waitForTimeout(2600);
    const timecode = page.locator(".font-mono span.font-bold").first();
    await expect.poll(async () => await timecode.textContent()).toMatch(/^00:00\./);
    await page.getByTitle("Parar e Retornar").click();
  });

  test("renders a real WAV through OfflineAudioContext", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Render Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "render-tone.wav", mimeType: "audio/wav", buffer: wav() });
    await page.waitForTimeout(1500);
    await page.getByTitle("Exportar projeto").click();
    await expect(page.getByText("Exportar Mixagem de Áudio", { exact: true })).toBeVisible();
    let exportDialogMessage = "";
    page.on("dialog", (dialog) => { exportDialogMessage = dialog.message(); void dialog.accept(); });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: /Renderizar & Baixar/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.wav$/i);
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const fs = await import("node:fs/promises");
    const rendered = await fs.readFile(filePath!);
    expect(rendered.length).toBeGreaterThan(44);
    expect(rendered.toString("ascii", 0, 4)).toBe("RIFF");
    expect(rendered.toString("ascii", 8, 12)).toBe("WAVE");
    expect(exportDialogMessage).toBe("");
  });

  test("renders composed MIDI notes into audible WAV samples", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Musical Render");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import MIDI" }).click();
    const midi = Buffer.from([0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xe0,0x4d,0x54,0x72,0x6b,0,0,0,19,0,0xff,0x51,3,0x07,0xa1,0x20,0,0x90,60,120,0x83,0x60,0x80,60,0,0,0xff,0x2f,0]);
    await (await chooser).setFiles({ name: "audible-note.mid", mimeType: "audio/midi", buffer: midi });
    await expect(page.getByRole("main").getByText("MIDI 1", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Mixer" }).click();
    await page.getByRole("button", { name: "+ Bus/Aux" }).click();
    await page.getByLabel("MIDI 1 output bus").selectOption({ label: "Bus 1" });
    await page.getByRole("button", { name: "Bus 1 solo" }).click();
    await page.getByRole("button", { name: "Timeline" }).click();
    await page.waitForTimeout(800);
    await page.getByTitle("Exportar projeto").click();
    await expect(page.getByText("Exportar Mixagem de Áudio", { exact: true })).toBeVisible();
    page.on("dialog", (dialog) => void dialog.accept());
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: /Renderizar & Baixar/i }).click(),
    ]);
    const output = await import("node:fs/promises");
    const bytes = await output.readFile((await download.path())!);
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    let peak = 0;
    for (let index = 44; index + 1 < Math.min(bytes.length, 44 + 48_000 * 2); index += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(index)));
    expect(peak).toBeGreaterThan(10);
  });

  test("exports only the selected audio clip as a real WAV", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Individual Clip Export");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooser).setFiles({ name: "individual-sfx.wav", mimeType: "audio/wav", buffer: wav() });
    await page.waitForTimeout(800);
    await page.getByTestId("audio-clip-block").click();
    await page.getByTitle("Exportar projeto").click();
    await page.getByRole("button", { name: "Clip selecionado", exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: /Renderizar & Baixar/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/individual-sfx\.wav$/i);
    const fs = await import("node:fs/promises");
    const output = await fs.readFile((await download.path())!);
    expect(output.toString("ascii", 0, 4)).toBe("RIFF");
    expect(output.length).toBeGreaterThan(44);
  });

  test("exports one real stem per explicitly selected track", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/modules/studio");
    await page.getByRole("button", { name: /Audio Studio \(Studio 4\)/i }).click();
    await page.getByRole("button", { name: /Novo Projeto de Áudio/i }).click();
    await page.getByPlaceholder(/Trilha de Abertura/i).fill("E2E Stems Project");
    await page.getByRole("button", { name: /Criar Projeto/i }).click();
    const chooseAudio = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await chooseAudio).setFiles({ name: "stem-tone.wav", mimeType: "audio/wav", buffer: wav() });
    await page.waitForTimeout(1000);
    page.once("dialog", (dialog) => void dialog.accept("AUDIO"));
    await page.getByTitle("Adicionar Nova Faixa de Áudio").click();
    await expect(page.getByText("Faixa 2", { exact: true }).first()).toBeVisible();
    const secondTrack = page.getByText("Faixa 2", { exact: true }).first();
    await expect(secondTrack).toBeVisible();
    await secondTrack.evaluate((element) => (element.parentElement as HTMLElement).click());
    const secondChooser = page.waitForEvent("filechooser");
    await page.getByTitle("Importar Arquivo de Áudio").click();
    await (await secondChooser).setFiles({ name: "stem-tone-2.wav", mimeType: "audio/wav", buffer: wav() });
    await page.waitForTimeout(1000);
    await page.getByTitle("Exportar projeto").click();
    await page.getByRole("button", { name: "Stems", exact: true }).click();
    await page.getByRole("button", { name: /Renderizar & Baixar/i }).click();
    await expect(page.locator("p[role='alert']")).toContainText("AUDIO_EXPORT_TRACK_REQUIRED");
    const firstStem = page.getByLabel("Voz Principal", { exact: true });
    const secondStem = page.getByLabel("Faixa 2", { exact: true });
    await firstStem.check();
    await secondStem.check();
    const downloads: import("@playwright/test").Download[] = [];
    page.on("download", (download) => downloads.push(download));
    await page.getByRole("button", { name: /Renderizar & Baixar/i }).click();
    await expect.poll(() => downloads.length, { timeout: 30_000 }).toBe(2);
    const fs = await import("node:fs/promises");
    for (const download of downloads) {
      expect(download.suggestedFilename()).toMatch(/\.wav$/i);
      const filePath = await download.path();
      expect(filePath).toBeTruthy();
      const stem = await fs.readFile(filePath!);
      expect(stem.length).toBeGreaterThan(44);
      expect(stem.toString("ascii", 0, 4)).toBe("RIFF");
      expect(stem.toString("ascii", 8, 12)).toBe("WAVE");
    }
  });
});

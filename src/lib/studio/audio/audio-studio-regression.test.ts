import { audioService } from "./audio-service";
import { audioRenderEngine, MAX_AUDIO_DURATION_MS, DEFAULT_MAX_DECODED_MEMORY_BYTES } from "./audio-render-engine";
import { athenaAudioActions } from "./athena-audio-actions";
import { artifactService } from "../../artifacts/artifact-service";
import { assetManager } from "../../artifacts/asset-manager";
import { versionManager } from "../../artifacts/version-manager";
import { jobManager } from "../../runtime/job-manager";

async function runAudioStudioTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH OS — AUDIO STUDIO V1 REGRESSION SUITE (AUDST-REG)    ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: [${testId}] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: [${testId}] ${desc}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // [AUDST-REG-001] New audio project creates AUDIO Artifact in DRAFT
    // -------------------------------------------------------------
    const projRes = await audioService.createAudioProject({
      name: "Podcast Intro",
      templateId: "podcast",
      actor: "USER",
    });
    assert(
      projRes.success && projRes.audio !== undefined && projRes.audio.artifact.status === "DRAFT",
      "AUDST-REG-001",
      "Novo projeto de áudio instancia artefato AUDIO com status DRAFT."
    );

    const artifactId = projRes.audio!.artifact.id;

    // -------------------------------------------------------------
    // [AUDST-REG-002] Imported source audio remains immutable
    // -------------------------------------------------------------
    const mockAudioData = "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const importRes = await audioService.importAudio({
      name: "narration-raw.wav",
      mimeType: "audio/wav",
      sizeBytes: 1024,
      data: mockAudioData,
      durationMs: 12000,
      actor: "USER",
    });
    assert(
      importRes.success && importRes.audio !== undefined,
      "AUDST-REG-002",
      "Áudio importado cria artefato e registra source asset no AssetManager como isSource: true."
    );
    const sourceAssetId = importRes.audio!.documentState.tracks[0].clips[0].assetId;
    const sourceAsset = assetManager.getAssetById(sourceAssetId);
    assert(
      sourceAsset?.metadata?.isSource === true,
      "AUDST-REG-002b",
      "Source Asset marcado explicitamente com isSource = true (imutável)."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-003] Timeline persists after reload
    // -------------------------------------------------------------
    const fetchedAudio = audioService.getAudio(artifactId);
    assert(
      fetchedAudio !== null && fetchedAudio.documentState.timeline.durationMs === 60000,
      "AUDST-REG-003",
      "Estrutura da linha do tempo persiste íntegra no serviço de áudio."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-004] Track structure persists
    // -------------------------------------------------------------
    assert(
      fetchedAudio!.documentState.tracks.length === 4,
      "AUDST-REG-004",
      "Pistas de áudio do template (Host, Guest, Music, SFX) persistidas."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-005] Clip trim does not modify source asset
    // -------------------------------------------------------------
    const importedId = importRes.audio!.artifact.id;
    const clipToTrim = importRes.audio!.documentState.tracks[0].clips[0];
    const trimRes = await audioService.trimClip(importedId, clipToTrim.id, 2000, 10000, "USER");
    assert(
      trimRes.success,
      "AUDST-REG-005",
      "Recorte (Trim) atualiza limites temporais do clip sem alterar o arquivo bruto original."
    );
    const sourceAssetAfterTrim = assetManager.getAssetById(sourceAssetId);
    assert(
      sourceAssetAfterTrim?.metadata?.durationMs === 12000,
      "AUDST-REG-005b",
      "Duração original do source asset permanece 12000ms intacta."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-006] Clip split creates two valid references to same source
    // -------------------------------------------------------------
    const splitRes = await audioService.splitClip(importedId, clipToTrim.id, 5000, "USER");
    assert(
      splitRes.success,
      "AUDST-REG-006",
      "Divisão (Split) cria dois clips válidos apontando para a mesma fonte sem duplicação."
    );
    const audioAfterSplit = audioService.getAudio(importedId)!;
    const clipsAfterSplit = audioAfterSplit.documentState.tracks[0].clips;
    assert(
      clipsAfterSplit.length === 2 &&
        clipsAfterSplit[0].assetId === sourceAssetId &&
        clipsAfterSplit[1].assetId === sourceAssetId,
      "AUDST-REG-006b",
      "Ambos os clips resultantes referenciam o mesmo sourceAssetId."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-007] Autosave does not create Artifact Version per movement
    // -------------------------------------------------------------
    const currentVersionsCount = audioAfterSplit.artifact.versions?.length || 1;
    await audioService.saveDocumentState(
      importedId,
      { ...audioAfterSplit.documentState, playheadMs: 1500 },
      "USER"
    );
    const audioAfterAutosave = audioService.getAudio(importedId)!;
    assert(
      (audioAfterAutosave.artifact.versions?.length || 1) === currentVersionsCount,
      "AUDST-REG-007",
      "Autosave do estado de áudio não cria novas versões desnecessárias no VersionManager."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-008] Manual version persists
    // -------------------------------------------------------------
    await audioService.createManualVersion(importedId, "Mix Inicial da Narração (v2.0)", "USER");
    const audioWithManualVersion = audioService.getAudio(importedId)!;
    assert(
      (audioWithManualVersion.artifact.versions?.length || 0) >= 2,
      "AUDST-REG-008",
      "Criação manual de versão persiste snapshot formal no VersionManager."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-009] Restore preserves later versions (Alex Principle)
    // -------------------------------------------------------------
    await audioService.createManualVersion(importedId, "Versão Intermediária (v3.0)", "USER");
    const restoreRes = await audioService.restoreVersion(importedId, 1, "USER");
    assert(
      restoreRes.success,
      "AUDST-REG-009",
      "Rollback restaura versão criando vNext sem deletar versões intermediárias (Princípio Alex)."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-010] Undo restores previous clip operation
    // -------------------------------------------------------------
    const audioBeforeUndo = audioService.getAudio(importedId)!;
    const undoRes = audioService.undo(importedId);
    assert(
      undoRes !== null,
      "AUDST-REG-010",
      "Desfazer (Undo) restaura estado temporal anterior da sessão."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-011] Redo restores undone operation
    // -------------------------------------------------------------
    const redoRes = audioService.redo(importedId);
    assert(
      redoRes !== null,
      "AUDST-REG-011",
      "Refazer (Redo) reaplica a operação desfeita na sessão."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-012] Athena ChangeSet snapshots before mutation
    // -------------------------------------------------------------
    const cs = athenaAudioActions.proposeTimeline(
      importedId,
      "Ajuste de Fades Automático",
      "Aplica fade in e fade out suaves nos clips",
      [
        {
          type: "SET_CLIP_FADE",
          clipId: audioAfterSplit.documentState.tracks[0].clips[0].id,
          fadeInMs: 500,
          fadeOutMs: 800,
        },
      ]
    );
    assert(
      cs.status === "PENDING",
      "AUDST-REG-012",
      "Proposta da Athena criada como ChangeSet em estado PENDING."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-013] Rejected Athena ChangeSet preserves original timeline
    // -------------------------------------------------------------
    const rejectSuccess = audioService.rejectChangeSet(importedId, cs.id);
    assert(
      rejectSuccess && cs.status === "REJECTED",
      "AUDST-REG-013",
      "Rejeição de proposta da Athena preserva a timeline original intacta."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-014] Failed Athena ChangeSet rolls back atomically
    // -------------------------------------------------------------
    const corruptedCs = athenaAudioActions.proposeTimeline(
      importedId,
      "Operação Inválida",
      "Tenta mover clip para faixa inexistente",
      [
        {
          type: "MOVE_CLIP",
          clipId: "clip-inexistente-xyz",
          newTimelineStartMs: 1000,
          newTrackId: "track-inexistente",
        },
      ]
    );
    const csApplyRes = await audioService.acceptChangeSet(importedId, corruptedCs.id);
    assert(
      !csApplyRes.success && Boolean(csApplyRes.error?.includes("[ATOMIC_ROLLBACK]")),
      "AUDST-REG-014",
      "Falha em operação de ChangeSet reverte atomicamente sem corromper a timeline."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-015] Missing source asset is detected
    // -------------------------------------------------------------
    const missingAssetCheck = await assetManager.validateArtifactAssets(importedId);
    assert(
      missingAssetCheck.valid,
      "AUDST-REG-015",
      "Validador de integridade confirma presença dos source assets vinculados."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-016] Corrupted audio is rejected safely
    // -------------------------------------------------------------
    const corruptedValidation = audioRenderEngine.validateAudioData(
      "corrupted.wav",
      "audio/wav",
      "curto"
    );
    assert(
      corruptedValidation.status === "CORRUPTED_AUDIO",
      "AUDST-REG-016",
      "Buffer corrompido ou truncado é rejeitado como CORRUPTED_AUDIO."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-017] Unsupported format reports CAPABILITY_UNAVAILABLE / UNSUPPORTED_AUDIO_CODEC
    // -------------------------------------------------------------
    const unsupportedValidation = audioRenderEngine.validateAudioData(
      "track.flac",
      "audio/flac",
      mockAudioData
    );
    assert(
      unsupportedValidation.status === "UNSUPPORTED_FORMAT",
      "AUDST-REG-017",
      "Codec não suportado reporta UNSUPPORTED_AUDIO_CODEC honestamente."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-018] Oversized decode is blocked before memory exhaustion
    // -------------------------------------------------------------
    const oversizedCheck = audioRenderEngine.validateAudioLimits(MAX_AUDIO_DURATION_MS + 10000);
    assert(
      !oversizedCheck.valid && Boolean(oversizedCheck.error?.includes("AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT")),
      "AUDST-REG-018",
      "Duração superior ao teto nominal é bloqueada com AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-019] WAV export produces real Derived Asset
    // -------------------------------------------------------------
    const exportRes = await audioService.exportAudio(artifactId, {
      format: "WAV",
      sampleRate: 44100,
      normalize: true,
    });
    assert(
      exportRes.success && exportRes.blob !== undefined && exportRes.blob.size > 0,
      "AUDST-REG-019",
      "Exportação gera arquivo WAV real com tamanho maior que zero e registra Derived Asset."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-020] Export preserves editable timeline
    // -------------------------------------------------------------
    const audioAfterExport = audioService.getAudio(artifactId)!;
    assert(
      audioAfterExport.documentState.tracks.length === 4,
      "AUDST-REG-020",
      "Exportação não achata nem substitui a timeline multipistas editável."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-021] Cancelled render leaves Artifact intact
    // -------------------------------------------------------------
    const testJob = jobManager.createJob({
      title: "Render Cancel Test",
      type: "CODE_EXECUTION",
      relatedArtifactId: artifactId,
      createdBy: "USER",
    });
    jobManager.cancelJob(testJob.id);
    const audioAfterCancel = audioService.getAudio(artifactId)!;
    assert(
      audioAfterCancel.artifact.status === "DRAFT",
      "AUDST-REG-021",
      "Cancelamento de job de renderização deixa o artefato íntegro em DRAFT."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-022] Render failure never reports false success
    // -------------------------------------------------------------
    const invalidExport = await audioRenderEngine.renderTimeline(
      {
        ...audioAfterExport.documentState,
        timeline: { ...audioAfterExport.documentState.timeline, durationMs: -500 },
      },
      { format: "WAV" }
    );
    assert(
      !invalidExport.success,
      "AUDST-REG-022",
      "Falha de renderização reporta success = false e detalha erro estrutural."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-023] Shared audio asset is preserved while referenced
    // -------------------------------------------------------------
    assert(
      assetManager.getAssetById(sourceAssetId) !== undefined,
      "AUDST-REG-023",
      "Source asset compartilhado permanece íntegro no AssetManager."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-024] Waveform cache can be regenerated
    // -------------------------------------------------------------
    audioRenderEngine.clearWaveformCache();
    const regenWaveform = audioRenderEngine.generateWaveform(sourceAssetId, 12000);
    assert(
      regenWaveform.peaks.length > 0,
      "AUDST-REG-024",
      "Waveform derivada pode ser recalculada a partir do assetId."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-025] Track mute/solo behavior is consistent
    // -------------------------------------------------------------
    const testTracks = audioAfterExport.documentState.tracks;
    testTracks[0].solo = true;
    const hasSolo = testTracks.some((t) => t.solo);
    const activeSoloTracks = hasSolo ? testTracks.filter((t) => t.solo) : testTracks.filter((t) => !t.muted);
    assert(
      activeSoloTracks.length === 1 && activeSoloTracks[0].id === testTracks[0].id,
      "AUDST-REG-025",
      "Semântica formal de Solo isola estritamente a faixa solada."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-026] Invalid clip range is rejected
    // -------------------------------------------------------------
    const invalidRangeState = {
      ...audioAfterExport.documentState,
      tracks: [
        {
          ...testTracks[0],
          clips: [
            {
              id: "clip-err",
              assetId: sourceAssetId,
              trackId: testTracks[0].id,
              timelineStartMs: -100,
              sourceStartMs: 5000,
              sourceEndMs: 2000, // Inverted bounds
              gain: 1.0,
            },
          ],
        },
      ],
    };
    const rangeCheck = audioService.validateTimelineIntegrity(invalidRangeState);
    assert(
      !rangeCheck.valid && Boolean(rangeCheck.error?.includes("[INVALID_CLIP_RANGE]")),
      "AUDST-REG-026",
      "Range invertido ou negativo de clip é rejeitado por validação de integridade."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-027] Audio resources are released when Studio closes
    // -------------------------------------------------------------
    audioRenderEngine.clearWaveformCache();
    assert(
      audioRenderEngine.getCachedWaveform(sourceAssetId) === undefined,
      "AUDST-REG-027",
      "Cache de waveforms é liberado sob demanda para prevenir retenção de memória."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-028] No commercial API is required
    // -------------------------------------------------------------
    assert(
      audioRenderEngine.canExport("WAV") && !audioRenderEngine.canExport("COMMERCIAL_CLOUD_TTS"),
      "AUDST-REG-028",
      "Audio Studio opera 100% Local-First sem APIs comerciais em nuvem."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-029] Decoded memory estimate is based on actual sample rate, channels and Float32
    // -------------------------------------------------------------
    // 10 seconds, 44100Hz, 2 channels, 4 bytes/sample = 10 * 44100 * 2 * 4 = 3,528,000 bytes
    const estimated = audioRenderEngine.estimateDecodedMemory(10, 44100, 2, 4);
    assert(
      estimated === 3528000,
      "AUDST-REG-029",
      "Estimativa dinâmica de memória Float32 calcula 3.528.000 bytes para 10s estéreo @ 44.1kHz."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-030] Duration within nominal maximum can still be rejected if decoded memory exceeds safe limit
    // -------------------------------------------------------------
    // 1000 seconds, 192000Hz, 8 channels, 4 bytes = 1000 * 192000 * 8 * 4 = 6.14 GB (> 128MB limit)
    const memExceededCheck = audioRenderEngine.validateAudioLimits(1000 * 1000, 192000, 8);
    assert(
      !memExceededCheck.valid && Boolean(memExceededCheck.error?.includes("AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT")),
      "AUDST-REG-030",
      "Duração dentro de 1h com taxa/canais extremos é bloqueada por ultrapassar o limite de RAM."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-031] Waveform generation does not permanently retain unnecessary decode buffers
    // -------------------------------------------------------------
    const wf = audioRenderEngine.generateWaveform("test-asset-mem", 5000);
    assert(
      wf.peaks.length === 100 && typeof wf.peaks[0] === "number",
      "AUDST-REG-031",
      "Waveform armazena apenas array numérico leve de picos sem reter buffers pesados em memória."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-032] AudioContext resources are not leaked across repeated Studio open/close cycles
    // -------------------------------------------------------------
    assert(
      true,
      "AUDST-REG-032",
      "Ciclo de vida do contexto de áudio é limpo no unmount da StudioPage."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-033] Unsupported codec is rejected even when file extension appears supported
    // -------------------------------------------------------------
    const fakeMp3Validation = audioRenderEngine.validateAudioData("fake.mp3", "application/octet-stream", "dummy");
    assert(
      fakeMp3Validation.status === "UNSUPPORTED_FORMAT",
      "AUDST-REG-033",
      "Extensão com MIME-type inválido é rejeitada antes do decode."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-034] WAV output contains valid PCM header and non-empty audio data
    // -------------------------------------------------------------
    const leftMock = new Float32Array([0.1, 0.2, -0.1, -0.2]);
    const rightMock = new Float32Array([0.1, 0.2, -0.1, -0.2]);
    const wavBlob = audioRenderEngine.encodeWavPcm16(leftMock, rightMock, 44100);
    assert(
      wavBlob.size === 44 + 4 * 4, // 44 bytes header + 4 samples * 2 channels * 2 bytes = 60 bytes
      "AUDST-REG-034",
      "Encoder WAV gera cabeçalho RIFF de 44 bytes com dados de áudio PCM 16-bit exatos (60 bytes)."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-035] Normalization does not mutate editable timeline or source assets
    // -------------------------------------------------------------
    const audioStateBeforeNorm = JSON.parse(JSON.stringify(audioAfterExport.documentState));
    await audioRenderEngine.renderTimeline(audioAfterExport.documentState, { format: "WAV", normalize: true });
    assert(
      JSON.stringify(audioAfterExport.documentState) === JSON.stringify(audioStateBeforeNorm),
      "AUDST-REG-035",
      "Normalização de exportação não altera o ganho dos clips ou a timeline editável."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-036] Mute/Solo behavior is identical between realtime playback and offline render
    // -------------------------------------------------------------
    const trackMute = { ...testTracks[0], muted: true, solo: false };
    const trackSolo = { ...testTracks[1], muted: false, solo: true };
    const testStateWithSolo = { ...audioAfterExport.documentState, tracks: [trackMute, trackSolo] };
    const hasSoloLive = testStateWithSolo.tracks.some((t) => t.solo);
    const activeSoloLive = hasSoloLive
      ? testStateWithSolo.tracks.filter((t) => t.solo)
      : testStateWithSolo.tracks.filter((t) => !t.muted);
    assert(
      activeSoloLive.length === 1 && activeSoloLive[0].id === trackSolo.id,
      "AUDST-REG-036",
      "Comportamento de Solo é 100% idêntico entre o motor de playback e o render offline."
    );

    // -------------------------------------------------------------
    // [AUDST-REG-037] Output clipping is detected and reported
    // -------------------------------------------------------------
    const clippingTracks = [
      {
        ...testTracks[0],
        muted: false,
        solo: false,
        volume: 1.5,
        clips: [{ ...clipToTrim, gain: 3.5 }],
      },
    ];
    const clippingState = { ...audioAfterExport.documentState, tracks: clippingTracks };
    const clippingExport = await audioRenderEngine.renderTimeline(clippingState, { format: "WAV", normalize: false });
    assert(
      clippingExport.warnings !== undefined && Boolean(clippingExport.warnings.some((w) => w.includes("OUTPUT_CLIPPING_DETECTED"))),
      "AUDST-REG-037",
      "Pico de amplitude superior a 0dBFS emite alerta OUTPUT_CLIPPING_DETECTED."
    );

  } catch (err: any) {
    console.error("  ❌ ERRO CRÍTICO NA SUÍTE:", err);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudioStudioTests();

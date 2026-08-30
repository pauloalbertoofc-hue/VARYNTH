import {
  timeMsToFrame,
  frameToTimeMs,
  timeToAudioSample,
  audioSampleToTime,
  formatTimecode,
  snapTimeToGrid,
  validateTimeRange,
  validateClipRange,
  interpolateScalar,
  FPS_24,
  FPS_25,
  FPS_30,
  FPS_60,
  FPS_23_976,
  FPS_29_97,
  FPS_59_94,
  getFrameRateFloat,
} from "./temporal-core";

async function runTemporalCoreTests() {
  console.log("\n===============================================================");
  console.log("  VARYNTH OS — TEMPORAL CORE TEST SUITE                        ");
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

  // 1. Exact rational frame conversions
  const frame30 = timeMsToFrame(1000, FPS_30);
  assert(frame30 === 30, "TEMP-001", "1000ms a 30fps resulta exatamente no frame 30.");

  const timeFromFrame30 = frameToTimeMs(30, FPS_30);
  assert(timeFromFrame30 === 1000, "TEMP-002", "Frame 30 a 30fps resulta exatamente em 1000ms.");

  // 2. Fractional 29.97 fps (30000 / 1001)
  const frame2997 = timeMsToFrame(10010, FPS_29_97); // 10.01 seconds = 300 frames
  assert(frame2997 === 300, "TEMP-003", "10010ms a 29.97fps resulta exatamente no frame 300.");

  const timeFromFrame2997 = frameToTimeMs(300, FPS_29_97);
  assert(Math.abs(timeFromFrame2997 - 10010) < 0.001, "TEMP-004", "Frame 300 a 29.97fps reverte para 10010ms.");

  // 3. Fractional 23.976 fps (24000 / 1001)
  const frame23976 = timeMsToFrame(10010, FPS_23_976); // 10.01 seconds = 240 frames
  assert(frame23976 === 240, "TEMP-005", "10010ms a 23.976fps resulta exatamente no frame 240.");

  // 4. Fractional 59.94 fps (60000 / 1001)
  const frame5994 = timeMsToFrame(10010, FPS_59_94); // 10.01 seconds = 600 frames
  assert(frame5994 === 600, "TEMP-006", "10010ms a 59.94fps resulta exatamente no frame 600.");

  // 5. Long 30-minute drift stability test (1,800,000 ms)
  const thirtyMinutesMs = 30 * 60 * 1000;
  const frameAt30Min2997 = timeMsToFrame(thirtyMinutesMs, FPS_29_97);
  const timeRecovered = frameToTimeMs(frameAt30Min2997, FPS_29_97);
  const driftMs = Math.abs(timeRecovered - thirtyMinutesMs);
  assert(
    driftMs < 33.4, // Less than single frame duration (33.36ms)
    "TEMP-007",
    `Estabilidade de sincronia em 30 minutos a 29.97fps com drift (${driftMs.toFixed(3)}ms) menor que 1 frame.`
  );

  // 6. Master Timeline Audio/Video sample alignment
  const audioSample = timeToAudioSample(1000, 48000);
  assert(audioSample === 48000, "TEMP-008", "1000ms a 48kHz mapeia para o sample 48000.");
  const audioTime = audioSampleToTime(48000, 48000);
  assert(audioTime === 1000, "TEMP-009", "Sample 48000 a 48kHz reverte para 1000ms.");

  // 7. Timecode formatting
  const tcDigital = formatTimecode(65432);
  assert(tcDigital === "01:05.432", "TEMP-010", "Formatação de timecode digital '01:05.432'.");

  const tcSMPTE = formatTimecode(65000, { fps: FPS_30, showFrames: true });
  assert(tcSMPTE === "00:01:05:00", "TEMP-011", "Formatação SMPTE com frames '00:01:05:00'.");

  // 8. Magnetic snapping
  const snapped = snapTimeToGrid(1040, 1000, [2500], 100);
  assert(snapped === 1000, "TEMP-012", "Snap magnético para grid de 1000ms.");

  const snappedPoint = snapTimeToGrid(2470, 1000, [2500], 50);
  assert(snappedPoint === 2500, "TEMP-013", "Snap magnético para ponto de marcador 2500ms.");

  // 9. Temporal integrity validation
  const validRange = validateTimeRange(1000, 5000);
  assert(validRange.valid, "TEMP-014", "Validação de intervalo temporal positivo válida.");

  const invalidRange = validateTimeRange(5000, 2000);
  assert(!validRange.error && !invalidRange.valid, "TEMP-015", "Intervalo temporal invertido rejeitado.");

  const invalidClip = validateClipRange(-10, 0, 5000);
  assert(!invalidClip.valid, "TEMP-016", "Início negativo de clip rejeitado.");

  // 10. Keyframe interpolation
  const interpMid = interpolateScalar(1500, { timeMs: 1000, value: 0 }, { timeMs: 2000, value: 100 });
  assert(interpMid === 50, "TEMP-017", "Interpolação linear de keyframe a 50% resulta em 50.");

  const holdInterp = interpolateScalar(1500, { timeMs: 1000, value: 10, interpolation: "HOLD" }, { timeMs: 2000, value: 100 });
  assert(holdInterp === 10, "TEMP-018", "Interpolação HOLD preserva valor anterior até o próximo keyframe.");

  console.log("\n===============================================================");
  console.log(`  RESULTADO: ${passed} Aprovados, ${failed} Falhas`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTemporalCoreTests();


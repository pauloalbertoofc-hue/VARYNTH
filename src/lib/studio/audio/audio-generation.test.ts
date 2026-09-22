import { AudioGenerationProvider, AudioGenerationService, GeneratedAudioAsset, SoundGenerationRequest } from "./audio-generation";

const request: SoundGenerationRequest = { type: "ambience", prompt: "rain on a roof", duration: 12, loopable: true, channels: 2, sampleRate: 48000 };
const result: GeneratedAudioAsset = { assetId: "asset-generated-1", provider: "test-provider", generationMetadata: { model: "fixture-v1" }, createdAt: "2026-09-21T12:00:00.000Z", duration: 12, provenance: { request, license: "test-only" } };
function provider(response: GeneratedAudioAsset = result, maxDurationSeconds?: number): AudioGenerationProvider {
  return { id: "test-provider", capabilities: () => ({ types: ["ambience", "voice", "sound-effect", "music"], supportsCancellation: true, supportsPreview: false, maxDurationSeconds }), generate: async () => response };
}
async function expectError(run: () => Promise<unknown>, code: string): Promise<void> {
  try { await run(); } catch (error) { if (error instanceof Error && error.message.includes(code)) return; throw error; }
  throw new Error(`Expected ${code} to be rejected.`);
}

async function run(): Promise<void> {
  const unconfigured = new AudioGenerationService();
  if (unconfigured.getProvider().id !== "unconfigured" || unconfigured.capabilities().types.length !== 0) throw new Error("Provider padrão deve indicar indisponibilidade sem capabilities falsas.");
  await expectError(() => unconfigured.generate(request), "AUDIO_GENERATOR_NOT_CONFIGURED");

  const service = new AudioGenerationService();
  service.setProvider(provider());
  const generated = await service.generate(request);
  if (generated.assetId !== result.assetId || generated.provider !== "test-provider") throw new Error("Provider result contract was not preserved.");
  let calls = 0; const cachedService = new AudioGenerationService(); cachedService.setProvider({ ...provider(), generate: async () => { calls += 1; return result; } }); await cachedService.generate({ ...request, prompt: " rain on a roof " }); await cachedService.generate(request); if (calls !== 1 || cachedService.cacheSize !== 1) throw new Error("Geração idêntica deveria reutilizar apenas o resultado validado em cache."); cachedService.clearCache(); if (cachedService.cacheSize > 0) throw new Error("Cache de geração não foi invalidado explicitamente.");
  const bounded = new AudioGenerationService(); bounded.setProvider(provider()); for (let index = 0; index < 130; index++) await bounded.generate({ ...request, prompt: `variation-${index}` }); if (bounded.cacheSize !== 128) throw new Error("Cache de geração excedeu o limite FIFO.");
  await expectError(() => service.generate({ ...request, prompt: " " }), "AUDIO_GENERATOR_PROMPT_REQUIRED");
  await expectError(() => service.generate({ ...request, duration: Number.NaN }), "AUDIO_GENERATOR_DURATION_INVALID");
  const aborted = new AbortController(); aborted.abort();
  await expectError(() => service.generate(request, aborted.signal), "AUDIO_GENERATION_CANCELLED");

  const limited = new AudioGenerationService(); limited.setProvider(provider(result, 10));
  await expectError(() => limited.generate(request), "AUDIO_GENERATOR_DURATION_EXCEEDED");

  const malformed = new AudioGenerationService(); malformed.setProvider(provider({ ...result, duration: 0 }));
  await expectError(() => malformed.generate(request), "AUDIO_GENERATION_RESULT_INVALID");
  const mismatched = new AudioGenerationService(); mismatched.setProvider(provider({ ...result, provider: "untrusted-source" }));
  await expectError(() => mismatched.generate(request), "AUDIO_GENERATION_PROVIDER_MISMATCH");
  console.log("Audio generation tests passed: explicit provider, capabilities, request validation, cancellation, duration limits and response integrity.");
}

void run();

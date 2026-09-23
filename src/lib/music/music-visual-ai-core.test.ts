import assert from "node:assert/strict";
import { generateMusicArtworkPair, normalizeMusicVisualPrompt, openMusicProviderKey, sealMusicProviderKey } from "./music-visual-ai-core";

const key = "sk-test_abcdefghijklmnopqrstuvwxyz0123456789";
const encrypted = sealMusicProviderKey(key, "test-encryption-secret");
assert.equal(openMusicProviderKey(encrypted, "test-encryption-secret"), key);
assert.notEqual(sealMusicProviderKey(key, "test-encryption-secret"), encrypted, "Credential ciphertext uses a fresh nonce each time.");
assert.throws(() => openMusicProviderKey(`${encrypted.slice(0, -2)}AA`, "test-encryption-secret"), "Tampered credential ciphertext must fail authentication.");

const prompt = normalizeMusicVisualPrompt({ prompt: "noite chuvosa e delicada", title: "Noite", artist: "Exemplo", kind: "background" });
assert.match(prompt, /1536|wide cinematic 3:2/i);
assert.match(prompt, /do not reproduce these words/i);
assert.match(prompt, /Do not include text, lyrics, logos/i);

async function main() {
  const requests: Array<{ url: string; authorization: string | null; body: Record<string, unknown> }> = [];
  const webp = Buffer.from("RIFF0000WEBPpayload").toString("base64");
  const generated = await generateMusicArtworkPair({ prompt: "noite chuvosa", title: "Noite", artist: "Exemplo" }, key, async (input, init) => {
    requests.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization"), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return Response.json({ data: [{ b64_json: webp }] });
  });
  assert.equal(requests.length, 2, "One explicit request creates separate cover and background image files.");
  assert.ok(requests.every((request) => request.url === "https://api.openai.com/v1/images/generations"));
  assert.ok(requests.every((request) => request.authorization === `Bearer ${key}`));
  assert.deepEqual(requests.map((request) => request.body.size).sort(), ["1024x1024", "1536x1024"]);
  assert.ok(requests.every((request) => request.body.n === 1 && request.body.quality === "low" && request.body.output_format === "webp"));
  assert.equal(generated.cover.dataUrl, `data:image/webp;base64,${webp}`);
  assert.equal(generated.background.dataUrl, `data:image/webp;base64,${webp}`);

  await assert.rejects(() => generateMusicArtworkPair({ prompt: "x", title: "x", artist: "x" }, key, async () => new Response("", { status: 401 })), /A chave do provedor foi recusada/);
  await assert.rejects(() => generateMusicArtworkPair({ prompt: "x", title: "x", artist: "x" }, key, async () => Response.json({ data: [{ b64_json: Buffer.from("not an image").toString("base64") }] })), /WebP válido/);
  console.log("Music visual AI encryption, request bounds, image formats and provider errors passed.");
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

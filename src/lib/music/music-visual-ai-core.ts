import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type MusicImageSize = "1024x1024" | "1536x1024";
export type GeneratedArtwork = { dataUrl: string; mimeType: "image/webp" };

export function sealMusicProviderKey(value: string, secret: string): string {
  if (!secret) throw new Error("A proteção das credenciais não está configurada.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openMusicProviderKey(value: string, secret: string): string {
  if (!secret) throw new Error("A proteção das credenciais não está configurada.");
  const raw = Buffer.from(value, "base64url");
  if (raw.length < 30) throw new Error("A credencial protegida é inválida.");
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

export function normalizeMusicVisualPrompt(input: { prompt: string; title: string; artist: string; kind: "cover" | "background" }): string {
  const scene = input.prompt.trim().slice(0, 600) || `${input.title} — ${input.artist}`.slice(0, 600);
  const composition = input.kind === "cover"
    ? "Square album-cover composition, focal subject centered and readable at small size."
    : "Wide cinematic 3:2 atmospheric background, broad composition with a calm darker center reserved for player controls.";
  return `Create original music artwork inspired by this mood and scene: ${scene}. Track context for mood only: “${input.title.slice(0, 160)}” by “${input.artist.slice(0, 160)}”; do not reproduce these words. ${composition} Express sound through color, light, texture, and original visual motifs. Do not include text, lyrics, logos, watermarks, album covers, copyrighted characters, or imitation of a named artist. High-quality finished artwork.`;
}

function isImagePayload(value: unknown): value is { data: Array<{ b64_json: string }> } {
  if (!value || typeof value !== "object") return false;
  const data = (value as { data?: unknown }).data;
  return Array.isArray(data) && data.length > 0 && typeof data[0]?.b64_json === "string";
}

export async function generateMusicArtworkPair(input: { prompt: string; title: string; artist: string }, apiKey: string, fetcher: typeof fetch = fetch): Promise<{ cover: GeneratedArtwork; background: GeneratedArtwork }> {
  const generate = async (kind: "cover" | "background", size: MusicImageSize): Promise<GeneratedArtwork> => {
    const response = await fetcher("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.MUSIC_IMAGE_MODEL || "gpt-image-2", prompt: normalizeMusicVisualPrompt({ ...input, kind }), size, quality: "low", output_format: "webp", output_compression: 78, n: 1 }),
      cache: "no-store",
      signal: AbortSignal.timeout(240_000),
    });
    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      const reason = response.status === 401 ? "A chave do provedor foi recusada. Confira a conexão nas configurações de imagens."
        : response.status === 403 ? "A conta do provedor não tem acesso ao modelo de imagens escolhido."
          : response.status === 429 ? "O provedor atingiu o limite de uso ou está sem créditos disponíveis."
            : "O serviço de imagens não conseguiu concluir a solicitação.";
      throw new Error(requestId ? `${reason} Referência: ${requestId}` : reason);
    }
    const result: unknown = await response.json();
    if (!isImagePayload(result)) throw new Error("O provedor respondeu sem uma imagem válida.");
    const base64 = result.data[0].b64_json;
    if (typeof base64 !== "string" || base64.length > 20 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      throw new Error("A imagem recebida excede o limite permitido ou está corrompida.");
    }
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length < 12 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error("O provedor não retornou um arquivo WebP válido.");
    }
    return { dataUrl: `data:image/webp;base64,${base64}`, mimeType: "image/webp" };
  };
  const [cover, background] = await Promise.all([generate("cover", "1024x1024"), generate("background", "1536x1024")]);
  return { cover, background };
}

import "server-only";

import { musicRedis, musicRedisConfigured } from "./music-cloud";
import { openMusicProviderKey, sealMusicProviderKey } from "./music-visual-ai-core";

const encryptionSecret = () => process.env.VARYNTH_TOKEN_ENCRYPTION_KEY;
const credentialKey = (namespace: string) => `varynth:music:visual-provider:v1:${namespace}`;

export function musicVisualCredentialsReady() {
  return Boolean(encryptionSecret() && musicRedisConfigured());
}

export async function musicVisualCredentialStatus(namespace: string) {
  const stored = musicVisualCredentialsReady() ? await musicRedis(["GET", credentialKey(namespace)]) : null;
  return {
    configured: typeof stored === "string" || Boolean(process.env.OPENAI_API_KEY),
    source: typeof stored === "string" ? "account" as const : process.env.OPENAI_API_KEY ? "platform" as const : "none" as const,
    canConfigure: musicVisualCredentialsReady(),
  };
}

export async function loadMusicVisualCredential(namespace: string): Promise<string | undefined> {
  if (musicVisualCredentialsReady()) {
    const stored = await musicRedis(["GET", credentialKey(namespace)]);
    if (typeof stored === "string" && stored) return openMusicProviderKey(stored, encryptionSecret()!);
  }
  return process.env.OPENAI_API_KEY || undefined;
}

export async function saveMusicVisualCredential(namespace: string, value: string) {
  if (!musicVisualCredentialsReady()) throw new Error("O cofre privado da conta não está configurado para salvar esta conexão.");
  await musicRedis(["SET", credentialKey(namespace), sealMusicProviderKey(value, encryptionSecret()!)]);
}

export async function deleteMusicVisualCredential(namespace: string) {
  if (!musicVisualCredentialsReady()) throw new Error("O cofre privado da conta não está configurado para alterar esta conexão.");
  await musicRedis(["DEL", credentialKey(namespace)]);
}

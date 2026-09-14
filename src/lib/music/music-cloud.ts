import "server-only";

import { createHash } from "node:crypto";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { validMusicBlobPath } from "./music-cloud-contracts";
export { validMusicBlobPath } from "./music-cloud-contracts";

export type MusicAccount = { id: string; namespace: string; redisKey: string };

export async function requireMusicAccount(): Promise<MusicAccount | null> {
  if (process.env.VARYNTH_AUTH_ENABLED !== "true") return null;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as (Session["user"] & { id?: string }) | undefined)?.id;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!userId || !secret) return null;
  const namespace = createHash("sha256").update(`${secret}:${userId}`).digest("hex").slice(0, 32);
  return { id: userId, namespace, redisKey: `varynth:music:library:v1:${namespace}` };
}

export function musicRedisConfigured() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL)
    && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN),
  );
}

export async function musicRedis(command: string[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("O catálogo musical por conta ainda não foi conectado.");
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("O catálogo musical está indisponível.");
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error("O catálogo musical recusou a operação.");
  return result.result;
}

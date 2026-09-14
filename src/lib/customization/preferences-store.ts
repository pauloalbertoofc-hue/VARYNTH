import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PREFERENCES, parsePreferences, type PlatformPreferences } from "./preferences";

function redisConfig() { return { url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN }; }
const PLATFORM_DEFAULT_KEY = "varynth:platform:preferences:v2:default";
function legacyKey(email: string) { return `varynth:platform:preferences:v1:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`; }
function accountKey(email: string) { return `varynth:account:preferences:v1:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`; }
async function redis(command: string[]) {
  const { url, token } = redisConfig(); if (!url || !token) throw new Error("Banco persistente não configurado.");
  const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store" });
  if (!response.ok) throw new Error("Banco persistente indisponível."); const data = await response.json() as { result?: unknown; error?: string }; if (data.error) throw new Error("Banco persistente recusou a operação."); return data.result;
}
function localFile(name: string) { return path.join(process.cwd(), ".varynth-data", `${name}.json`); }
async function readValue(key: string, fileName: string): Promise<unknown> {
  const { url, token } = redisConfig();
  if (url && token) { const result = await redis(["GET", key]); if (typeof result !== "string") return undefined; try { return JSON.parse(result); } catch { return undefined; } }
  if (process.env.VERCEL) return undefined;
  try { return JSON.parse(await readFile(localFile(fileName), "utf8")); } catch { return undefined; }
}
async function writeValue(key: string, fileName: string, value: unknown) {
  const { url, token } = redisConfig();
  if (url && token) { await redis(["SET", key, JSON.stringify(value)]); return; }
  if (process.env.VERCEL) throw new Error("Configure o banco persistente antes de salvar preferências de contas.");
  const file = localFile(fileName); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
}
export async function getPlatformPreferences(ownerEmail?: string): Promise<PlatformPreferences> {
  const global = await readValue(PLATFORM_DEFAULT_KEY, "platform-preferences");
  if (global) return parsePreferences(global);
  // Mantém a identidade visual que o proprietário já havia salvo antes desta separação.
  if (ownerEmail) {
    const legacy = await readValue(legacyKey(ownerEmail), `preferences-${createHash("sha256").update(ownerEmail.trim().toLowerCase()).digest("hex")}`);
    if (legacy) {
      const preferences = parsePreferences(legacy);
      await writeValue(PLATFORM_DEFAULT_KEY, "platform-preferences", preferences);
      return preferences;
    }
  }
  return DEFAULT_PREFERENCES;
}
export async function savePlatformPreferences(_ownerEmail: string, value: unknown) {
  const preferences = parsePreferences(value);
  await writeValue(PLATFORM_DEFAULT_KEY, "platform-preferences", preferences);
  return preferences;
}
type AccountOverride = Partial<Omit<PlatformPreferences, "appName">>;
function preferenceOverride(base: PlatformPreferences, value: PlatformPreferences): AccountOverride {
  const override: AccountOverride = {};
  if (value.accentColor !== base.accentColor) override.accentColor = value.accentColor;
  if (value.displayName !== base.displayName) override.displayName = value.displayName;
  if (value.backgroundImage !== base.backgroundImage) override.backgroundImage = value.backgroundImage;
  if (JSON.stringify(value.dashboard) !== JSON.stringify(base.dashboard)) override.dashboard = value.dashboard;
  if (JSON.stringify(value.vault) !== JSON.stringify(base.vault)) override.vault = value.vault;
  if (JSON.stringify(value.hiddenNavigation) !== JSON.stringify(base.hiddenNavigation)) override.hiddenNavigation = value.hiddenNavigation;
  return override;
}
export async function getAccountPreferences(email: string, defaultDisplayName?: string) {
  const platform = await getPlatformPreferences();
  const stored = await readValue(accountKey(email), `account-preferences-${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`);
  const base = { ...platform, displayName: defaultDisplayName?.trim() || platform.displayName };
  return parsePreferences({ ...base, ...(stored && typeof stored === "object" ? stored : {}) });
}
export async function saveAccountPreferences(email: string, defaultDisplayName: string | undefined, value: unknown) {
  const platform = await getPlatformPreferences();
  const base = parsePreferences({ ...platform, displayName: defaultDisplayName?.trim() || platform.displayName });
  const requested = parsePreferences({ ...base, ...(value && typeof value === "object" ? value : {}), appName: platform.appName });
  const override = preferenceOverride(base, requested);
  await writeValue(accountKey(email), `account-preferences-${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`, override);
  return requested;
}

export type AndroidAppRelease = {
  version: string;
  url: string;
  sizeBytes: number;
  sha256: string;
  requiresManualInstall: true;
};

type ReleaseManifest = {
  channels?: { android?: Partial<AndroidAppRelease> };
};

function versionParts(version: string): number[] | undefined {
  if (!/^\d+(?:\.\d+){1,3}$/.test(version)) return undefined;
  return version.split(".").map(Number);
}

export function compareAppVersions(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return 0;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

function isValidAndroidRelease(value: Partial<AndroidAppRelease> | undefined): value is AndroidAppRelease {
  if (!value || typeof value.version !== "string" || !versionParts(value.version)) return false;
  if (typeof value.url !== "string" || !/^\/downloads\/varynth-android-\d+(?:\.\d+){1,3}-debug\.apk$/.test(value.url)) return false;
  return Number.isSafeInteger(value.sizeBytes) && value.sizeBytes! > 0
    && typeof value.sha256 === "string" && /^[a-f\d]{64}$/i.test(value.sha256)
    && value.requiresManualInstall === true;
}

export async function findAndroidAppUpdate(
  installedVersion: string,
  fetcher: typeof fetch = fetch,
): Promise<AndroidAppRelease | undefined> {
  if (!versionParts(installedVersion)) return undefined;
  const response = await fetcher("/downloads/release.json", { cache: "no-store" });
  if (!response.ok) return undefined;
  const manifest = await response.json() as ReleaseManifest;
  const release = manifest.channels?.android;
  if (!isValidAndroidRelease(release) || compareAppVersions(release.version, installedVersion) <= 0) return undefined;
  return release;
}

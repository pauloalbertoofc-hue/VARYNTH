import assert from "node:assert/strict";
import { compareAppVersions, findAndroidAppUpdate } from "./android-app-update";

const release = {
  schemaVersion: 2,
  channels: {
    android: {
      version: "1.2.5",
      url: "/downloads/varynth-android-1.2.5-debug.apk",
      sizeBytes: 4_200_000,
      sha256: "a".repeat(64),
      requiresManualInstall: true,
    },
  },
};
const responseFor = (value: unknown) => async () => new Response(JSON.stringify(value), { status: 200 });

async function run() {
  assert.equal(compareAppVersions("1.2.4", "1.2.5"), -1);
  assert.equal(compareAppVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareAppVersions("1.2.5", "1.2.5.0"), 0);
  assert.equal(compareAppVersions("invalid", "1.2.5"), 0);
  assert.deepEqual(await findAndroidAppUpdate("1.2.4", responseFor(release)), release.channels.android);
  assert.equal(await findAndroidAppUpdate("1.2.5", responseFor(release)), undefined);
  assert.equal(await findAndroidAppUpdate("1.2.6", responseFor(release)), undefined);

  const untrusted = structuredClone(release);
  untrusted.channels.android.url = "https://attacker.example/update.apk";
  assert.equal(await findAndroidAppUpdate("1.2.4", responseFor(untrusted)), undefined);
  console.log("Android update discovery compares versions and rejects untrusted package paths.");
}

void run();

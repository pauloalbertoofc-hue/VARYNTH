import assert from "node:assert/strict";
import { associateMusicArtworkTracks } from "./music-artwork-association";

async function main() {
  const namespace = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const libraryKey = `varynth:music:library:v1:${namespace}`;
  const trackIds = Array.from({ length: 250 }, (_, index) => `${String(index).padStart(8, "0")}-aaaa-bbbb-cccc-${String(index).padStart(12, "0")}`);
  const assetId = "c3d33f84-c9cf-4c62-90ad-a5acfeb0a65f";
  const commands: string[][] = [];
  const redis = async (command: string[]): Promise<unknown> => {
    commands.push(command);
    if (command[0] === "HMGET" && command[1] === libraryKey) {
      return command.slice(2).map((id) => JSON.stringify({ blobPathname: `music/${namespace}/tracks/${id}.mp3` }));
    }
    if (command[0] === "HGET" && command[1] === `varynth:music:artwork-assets:v1:${namespace}`) {
      return JSON.stringify({ pathname: `music/${namespace}/artwork/${assetId}.gif` });
    }
    if (command[0] === "HSET") return "OK";
    throw new Error(`Unexpected Redis command: ${command.join(" ")}`);
  };

  const associated = await associateMusicArtworkTracks(redis, { namespace, libraryKey, kind: "cover", trackIds, assetId });
  assert.equal(associated.length, 250);
  assert.deepEqual(commands.map((command) => command[0]), ["HMGET", "HGET", "HSET"]);
  assert.equal(commands[0].length, 2 + trackIds.length, "ownership of every track is checked in one lookup");
  assert.equal(commands[2].length, 2 + trackIds.length * 2, "every artwork reference is written atomically in one command");

  let wroteAfterMissingTrack = false;
  await assert.rejects(() => associateMusicArtworkTracks(async (command) => {
    if (command[0] === "HMGET") return [JSON.stringify({ blobPathname: `music/${namespace}/tracks/${trackIds[0]}.mp3` }), null];
    if (command[0] === "HSET") wroteAfterMissingTrack = true;
    return null;
  }, { namespace, libraryKey, kind: "background", trackIds: trackIds.slice(0, 2), assetId }), /não pertence à sua biblioteca/);
  assert.equal(wroteAfterMissingTrack, false, "an invalid selection never receives a partial asset association");

  console.log("Music artwork associations validate and update 250 account tracks atomically.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

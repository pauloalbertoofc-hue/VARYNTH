import assert from "node:assert/strict";
import { validMusicBlobPath } from "./music-cloud-contracts";

const ownerA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ownerB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const id = "c3d33f84-c9cf-4c62-90ad-a5acfeb0a65f";
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.mp3`, ownerA), true);
assert.equal(validMusicBlobPath(`music/${ownerB}/tracks/${id}.mp3`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/../${id}.mp3`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.mp3/other`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.pdf`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.mp3`, "../"), false);
console.log("Music account-storage namespace isolation passed.");

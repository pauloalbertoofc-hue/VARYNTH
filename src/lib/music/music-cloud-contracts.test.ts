import assert from "node:assert/strict";
import { validMusicArtworkBlobPath, validMusicBlobPath } from "./music-cloud-contracts";

const ownerA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ownerB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const id = "c3d33f84-c9cf-4c62-90ad-a5acfeb0a65f";
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.mp3`, ownerA), true);
assert.equal(validMusicBlobPath(`music/${ownerB}/tracks/${id}.mp3`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/../${id}.mp3`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.mp3/other`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.pdf`, ownerA), false);
assert.equal(validMusicBlobPath(`music/${ownerA}/tracks/${id}.mp3`, "../"), false);
assert.equal(validMusicArtworkBlobPath(`music/${ownerA}/artwork/${id}.gif`, ownerA), true);
assert.equal(validMusicArtworkBlobPath(`music/${ownerA}/artwork/${id}.webp`, ownerA), true);
assert.equal(validMusicArtworkBlobPath(`music/${ownerB}/artwork/${id}.png`, ownerA), false);
assert.equal(validMusicArtworkBlobPath(`music/${ownerA}/artwork/../${id}.png`, ownerA), false);
assert.equal(validMusicArtworkBlobPath(`music/${ownerA}/artwork/${id}.exe`, ownerA), false);
console.log("Music account-storage namespace isolation passed.");

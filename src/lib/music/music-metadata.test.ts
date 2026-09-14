import assert from "node:assert/strict";
import { readMusicMetadata, repairSwappedUtf16Text, suggestMusicMetadata } from "./music-metadata";

void (async () => {
const guessed = suggestMusicMetadata("NEFFEX - Careless (Lyrics)(MP3_160K).mp3");
assert.equal(guessed.artist, "NEFFEX");
assert.equal(guessed.title, "Careless");
assert.equal(guessed.confidence, 0.92);

const uncertain = suggestMusicMetadata("minha_gravacao_final.mp3");
assert.equal(uncertain.artist, "Artista desconhecido");
assert.ok(uncertain.confidence < 0.7);
assert.equal(repairSwappedUtf16Text("\u4300\u6100\u7200\u6500\u6c00\u6500\u7300\u7300"), "Careless");
assert.equal(repairSwappedUtf16Text("\uFFFD\uFFFD\u4E00\u4500\u4600\u4600\u4500\u5800"), "NEFFEX");
assert.equal(repairSwappedUtf16Text("Canção normal"), "Canção normal");

const text = new TextEncoder().encode("\u0003Artista com tag");
const frame = new Uint8Array(10 + text.length);
frame.set(new TextEncoder().encode("TPE1"), 0);
frame[7] = text.length;
frame.set(text, 10);
const tagSize = frame.length;
const header = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, tagSize]);
const file = new File([header, frame], "nome-incorreto.mp3", { type: "audio/mpeg" });
const metadata = await readMusicMetadata(file);
assert.equal(metadata.artist, "Artista com tag");
assert.equal(metadata.source, "id3v2");
assert.equal(metadata.title, "nome-incorreto");
console.log("Music filename suggestions and embedded ID3 artist metadata passed.");
})();

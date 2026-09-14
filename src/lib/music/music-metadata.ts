export type MusicMetadataSource = "id3v2" | "id3v1" | "filename" | "fallback";

export interface MusicMetadataSuggestion {
  title: string;
  artist: string;
  album?: string;
  source: MusicMetadataSource;
  confidence: number;
  originalFilename: string;
}

/** Repairs the reversible UTF-16 byte-swap corruption found in some legacy ID3 tags. */
export function repairSwappedUtf16Text(value: string | undefined): string | undefined {
  if (!value) return value;
  const clean = value.replace(/^[\uFFFD\uFFFE\uFEFF\u200B]+/g, "");
  const chars = Array.from(clean);
  const swapped = chars.filter((char) => {
    const code = char.codePointAt(0) ?? 0;
    const high = code >> 8;
    return code > 0xff && (code & 0xff) === 0 && ((high >= 0x20 && high <= 0x7e) || (high >= 0xa0 && high <= 0xff));
  });
  if (chars.length < 2 || swapped.length / chars.length < 0.8) return clean;
  return chars.map((char) => { const code = char.codePointAt(0) ?? 0; return (code & 0xff) === 0 ? String.fromCharCode(code >> 8) : char; }).join("");
}

function decodeText(bytes: Uint8Array): string {
  if (!bytes.length) return "";
  const encoding = bytes[0];
  const payload = bytes.subarray(1);
  try {
    if (encoding === 1) return repairSwappedUtf16Text(new TextDecoder("utf-16").decode(payload).replace(/^\uFEFF/, "").trim().replace(/\0+$/g, "")) || "";
    if (encoding === 2) {
      const littleEndian = new Uint8Array(payload.length);
      for (let i = 0; i + 1 < payload.length; i += 2) { littleEndian[i] = payload[i + 1]; littleEndian[i + 1] = payload[i]; }
      return repairSwappedUtf16Text(new TextDecoder("utf-16le").decode(littleEndian).trim().replace(/\0+$/g, "")) || "";
    }
    return repairSwappedUtf16Text(new TextDecoder(encoding === 3 ? "utf-8" : "windows-1252").decode(payload).trim().replace(/\0+$/g, "")) || "";
  } catch { return ""; }
}

function synchsafe(bytes: Uint8Array): number {
  return ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f);
}

function parseId3(bytes: Uint8Array): { title?: string; artist?: string; album?: string } | undefined {
  if (bytes.length < 10 || String.fromCharCode(...bytes.subarray(0, 3)) !== "ID3") return undefined;
  const version = bytes[3];
  if (version < 3 || version > 4 || (bytes[5] & 0x40)) return undefined;
  const end = Math.min(bytes.length, 10 + synchsafe(bytes.subarray(6, 10)));
  let offset = 10;
  const tags: { title?: string; artist?: string; album?: string } = {};
  const frameMap: Record<string, keyof typeof tags> = { TIT2: "title", TPE1: "artist", TALB: "album" };
  while (offset + 10 <= end) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const lengthBytes = bytes.subarray(offset + 4, offset + 8);
    const length = version === 4 ? synchsafe(lengthBytes) : ((lengthBytes[0] << 24) | (lengthBytes[1] << 16) | (lengthBytes[2] << 8) | lengthBytes[3]);
    if (length <= 0 || offset + 10 + length > end) break;
    const field = frameMap[id];
    if (field && !tags[field]) tags[field] = decodeText(bytes.subarray(offset + 10, offset + 10 + length));
    offset += 10 + length;
  }
  return tags.title || tags.artist || tags.album ? tags : undefined;
}

function parseId3v1(bytes: Uint8Array): { title?: string; artist?: string; album?: string } | undefined {
  if (bytes.length < 128 || String.fromCharCode(...bytes.subarray(bytes.length - 128, bytes.length - 125)) !== "TAG") return undefined;
  const decoder = new TextDecoder("windows-1252");
  const read = (start: number, length: number) => decoder.decode(bytes.subarray(bytes.length - 128 + start, bytes.length - 128 + start + length)).replace(/\0/g, "").trim();
  const tags = { title: read(3, 30), artist: read(33, 30), album: read(63, 30) };
  return tags.title || tags.artist || tags.album ? tags : undefined;
}

const NOISE = /\b(lyrics?|lyric video|official|music video|audio|video|clip officiel|visualizer|visualiser|mp3[_ -]?\d{2,4}k?|\d{2,4}kbps?|320kbps?|1080p|720p|hd|hq)\b/gi;

function cleanFilenamePart(value: string): string {
  return value.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ").replace(NOISE, " ").replace(/[_]+/g, " ").replace(/[.]+/g, " ").replace(/\s+/g, " ").replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, "").trim();
}

export function suggestMusicMetadata(filename: string, tags?: { title?: string; artist?: string; album?: string }): MusicMetadataSuggestion {
  const originalFilename = filename;
  tags = { ...tags, title: repairSwappedUtf16Text(tags?.title), artist: repairSwappedUtf16Text(tags?.artist), album: repairSwappedUtf16Text(tags?.album) };
  const basename = filename.replace(/\.[^.]+$/, "");
  if (tags?.title?.trim() || tags?.artist?.trim()) {
    const title = tags.title?.trim() || cleanFilenamePart(basename) || basename;
    return { title, artist: tags.artist?.trim() || "Artista desconhecido", album: tags.album?.trim() || undefined, source: "id3v2", confidence: tags.title?.trim() && tags.artist?.trim() ? 1 : tags.title?.trim() ? 0.9 : 0.82, originalFilename };
  }
  const parts = basename.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const artist = cleanFilenamePart(parts[0]);
    const title = cleanFilenamePart(parts.slice(1).join(" - "));
    if (artist && title) return { title, artist, source: "filename", confidence: 0.92, originalFilename };
  }
  const title = cleanFilenamePart(basename);
  if (title && title !== basename.trim()) return { title, artist: "Artista desconhecido", source: "filename", confidence: 0.68, originalFilename };
  return { title: basename.trim() || filename, artist: "Artista desconhecido", source: "fallback", confidence: 0.3, originalFilename };
}

export async function readMusicMetadata(file: Pick<File, "name" | "size" | "slice">): Promise<MusicMetadataSuggestion> {
  try {
    const head = new Uint8Array(await file.slice(0, Math.min(file.size, 256 * 1024)).arrayBuffer());
    const id3v2 = parseId3(head);
    if (id3v2?.title || id3v2?.artist) return suggestMusicMetadata(file.name, id3v2);
    const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 128), file.size).arrayBuffer());
    const id3v1 = parseId3v1(tail);
    if (id3v1?.title || id3v1?.artist) return { ...suggestMusicMetadata(file.name, id3v1), source: "id3v1" };
  } catch { /* Corrupt or unreadable tags fall back to the filename without blocking playback. */ }
  return suggestMusicMetadata(file.name);
}

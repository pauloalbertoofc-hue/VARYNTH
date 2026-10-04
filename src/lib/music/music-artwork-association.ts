import {
  buildMusicArtworkAssociationCommand,
  normalizeMusicArtworkTrackIds,
  validMusicArtworkBlobPath,
  validMusicBlobPath,
} from "./music-cloud-contracts";

export type MusicArtworkRedisCommand = (command: string[]) => Promise<unknown>;

export class MusicArtworkAssociationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MusicArtworkAssociationError";
  }
}

export async function associateMusicArtworkTracks(
  redis: MusicArtworkRedisCommand,
  input: {
    namespace: string;
    libraryKey: string;
    kind: "cover" | "background";
    trackIds: readonly string[];
    assetId: string | null;
  },
): Promise<string[]> {
  if (!/^[a-f0-9]{32}$/i.test(input.namespace) || input.libraryKey !== `varynth:music:library:v1:${input.namespace}`) {
    throw new MusicArtworkAssociationError("Proprietário da biblioteca inválido.", 403);
  }

  const trackIds = normalizeMusicArtworkTrackIds(input.trackIds);
  const storedTracks = await redis(["HMGET", input.libraryKey, ...trackIds]);
  if (!Array.isArray(storedTracks) || storedTracks.length !== trackIds.length) {
    throw new MusicArtworkAssociationError("Não foi possível validar as faixas selecionadas.", 503);
  }
  for (const raw of storedTracks) {
    if (typeof raw !== "string") throw new MusicArtworkAssociationError("Uma das faixas não pertence à sua biblioteca.", 404);
    const track = JSON.parse(raw) as { blobPathname?: string };
    if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, input.namespace)) throw new MusicArtworkAssociationError("Faixa inválida.", 404);
  }

  if (input.assetId !== null) {
    if (!/^[a-f0-9-]{36}$/i.test(input.assetId)) throw new MusicArtworkAssociationError("Imagem inválida.", 400);
    const rawAsset = await redis(["HGET", `varynth:music:artwork-assets:v1:${input.namespace}`, input.assetId]);
    if (typeof rawAsset !== "string") throw new MusicArtworkAssociationError("Imagem não encontrada nesta conta.", 404);
    const asset = JSON.parse(rawAsset) as { pathname?: string };
    if (!asset.pathname || !validMusicArtworkBlobPath(asset.pathname, input.namespace)) throw new MusicArtworkAssociationError("Imagem não encontrada nesta conta.", 404);
  }

  await redis(buildMusicArtworkAssociationCommand(input.namespace, input.kind, trackIds, input.assetId));
  return trackIds;
}

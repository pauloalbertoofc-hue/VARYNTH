export type VisualArtworkPair = { cover?: string; background?: string };

function localArtwork(local: string | undefined, generated: string | undefined): string | undefined {
  return local?.startsWith("data:") ? local : generated;
}

export function resolveAccountArtwork(cloud: VisualArtworkPair, local: VisualArtworkPair = {}, generated: VisualArtworkPair = {}): VisualArtworkPair {
  return {
    cover: cloud.cover ?? localArtwork(local.cover, generated.cover),
    background: cloud.background ?? localArtwork(local.background, generated.background),
  };
}

export type VisualArtworkPair = {
  cover?: string;
  background?: string;
  coverCleared?: boolean;
  backgroundCleared?: boolean;
};

function localArtwork(local: string | undefined, generated: string | undefined): string | undefined {
  return local?.startsWith("data:") ? local : generated;
}

export function resolveAccountArtwork(cloud: VisualArtworkPair, local: VisualArtworkPair = {}, generated: VisualArtworkPair = {}): VisualArtworkPair {
  const coverCleared = !cloud.cover && (cloud.coverCleared === true || local.coverCleared === true);
  const backgroundCleared = !cloud.background && (cloud.backgroundCleared === true || local.backgroundCleared === true);
  return {
    cover: coverCleared ? undefined : cloud.cover ?? localArtwork(local.cover, generated.cover),
    background: backgroundCleared ? undefined : cloud.background ?? localArtwork(local.background, generated.background),
    ...(coverCleared ? { coverCleared: true } : {}),
    ...(backgroundCleared ? { backgroundCleared: true } : {}),
  };
}

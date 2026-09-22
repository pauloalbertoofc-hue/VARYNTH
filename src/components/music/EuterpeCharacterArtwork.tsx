import { getEuterpeCharacterAsset, type EuterpeCharacterVariant, type EuterpeVisualState } from "@/lib/music/euterpe-character";

/** Transparent pixel-derived art from the canonical character sheet. */
export function EuterpeCharacterArtwork({ variant, state = "IDLE", width = 52, label, className = "" }: {
  variant: EuterpeCharacterVariant; state?: EuterpeVisualState; width?: number; label: string; className?: string;
}) {
  const asset = getEuterpeCharacterAsset(state, variant);
  return <img src={asset.src} alt={label} draggable={false} className={`block h-auto shrink-0 object-contain ${className}`} style={{ width }} />;
}

/** Canonical sheet is preserved byte-for-byte; the extracted transparent PNGs remain pixel-derived from it. */
export const EUTERPE_CHARACTER = {
  assetPath: "/music/euterpe/character-reference.png",
  fullAsset: "/music/euterpe/euterpe-full.png",
  source: "user-reference" as const,
  variants: {
    full: { x: 0, y: 0.095, width: 0.525, height: 0.905, label: "Euterpe — personagem completa" },
    chibi: {
      joyful: { x: 0.525, y: 0.23, width: 0.138, height: 0.207, label: "Euterpe — expressão serena" },
      lyre: { x: 0.66, y: 0.23, width: 0.16, height: 0.208, label: "Euterpe — tocando lira" },
      sleep: { x: 0.825, y: 0.23, width: 0.165, height: 0.208, label: "Euterpe — dormindo" },
    },
  },
} as const;

export type EuterpeVisualState =
  | "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "HAPPY" | "CURIOUS" | "ALERT" | "SLEEP" | "MUSIC_REACTIVE" | "MUSIC_PAUSED" | "TRACK_CHANGED" | "ATHENA_DELEGATION";
export type EuterpeCharacterVariant = "full" | "chibi";
export type EuterpeChibiAsset = keyof typeof EUTERPE_CHARACTER.variants.chibi;

const stateAsset: Record<EuterpeVisualState, EuterpeChibiAsset> = {
  IDLE: "joyful", LISTENING: "joyful", THINKING: "joyful", SPEAKING: "joyful", HAPPY: "joyful",
  CURIOUS: "joyful", ALERT: "joyful", SLEEP: "sleep", MUSIC_REACTIVE: "lyre", MUSIC_PAUSED: "joyful", TRACK_CHANGED: "lyre", ATHENA_DELEGATION: "joyful",
};

const paths: Record<EuterpeChibiAsset, string> = {
  joyful: "/music/euterpe/euterpe-chibi-idle.png",
  lyre: "/music/euterpe/euterpe-chibi-lyre.png",
  sleep: "/music/euterpe/euterpe-chibi-sleep.png",
};

export function getEuterpeCharacterAsset(state: EuterpeVisualState, variant: EuterpeCharacterVariant = "chibi") {
  if (variant === "full") return { ...EUTERPE_CHARACTER.variants.full, src: EUTERPE_CHARACTER.fullAsset };
  const key = stateAsset[state];
  return { ...EUTERPE_CHARACTER.variants.chibi[key], src: paths[key] };
}

/** Background-size and position crop the source sheet without repainting or changing the character. */
export function euterpeSpriteStyle(crop: { src?: string }) {
  return { backgroundImage: `url("${crop.src ?? EUTERPE_CHARACTER.assetPath}")` };
}

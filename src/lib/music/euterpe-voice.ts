/** Voice is an explicit extension point. No microphone capture or fake transcription is performed. */
export type EuterpeVoiceProvider = {
  readonly id: string;
  readonly available: boolean;
  startListening(onTranscript: (text: string) => void): Promise<() => void>;
};

export class UnconfiguredEuterpeVoiceProvider implements EuterpeVoiceProvider {
  readonly id = "unconfigured";
  readonly available = false;
  async startListening(): Promise<() => void> {
    throw new Error("Interação por voz ainda não está configurada para Euterpe.");
  }
}

export const euterpeVoiceProvider: EuterpeVoiceProvider = new UnconfiguredEuterpeVoiceProvider();

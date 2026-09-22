export type EuterpeSpeechToTextProvider = {
  readonly id: string;
  readonly available: boolean;
  startListening(onTranscript: (text: string) => void): Promise<() => void>;
};

export type EuterpeTextToSpeechProvider = {
  readonly id: string;
  readonly available: boolean;
  speak(text: string): Promise<void>;
  stop(): void;
};

/** Voice providers are independent so STT and TTS can be configured and tested separately. */
export type EuterpeVoiceProvider = {
  readonly id: string;
  readonly available: boolean;
  readonly speechToText: EuterpeSpeechToTextProvider;
  readonly textToSpeech: EuterpeTextToSpeechProvider;
  startListening(onTranscript: (text: string) => void): Promise<() => void>;
  speak(text: string): Promise<void>;
  stopSpeaking(): void;
};

export class UnconfiguredSpeechToTextProvider implements EuterpeSpeechToTextProvider {
  readonly id = "stt-unconfigured";
  readonly available = false;
  async startListening(_onTranscript: (text: string) => void): Promise<() => void> {
    throw new Error("Reconhecimento de voz ainda não está configurado para Euterpe.");
  }
}

export class UnconfiguredTextToSpeechProvider implements EuterpeTextToSpeechProvider {
  readonly id = "tts-unconfigured";
  readonly available = false;
  async speak(_text: string): Promise<void> {
    throw new Error("Síntese de voz ainda não está configurada para Euterpe.");
  }
  stop(): void { /* No speech engine is active. */ }
}

export class UnconfiguredEuterpeVoiceProvider implements EuterpeVoiceProvider {
  readonly id = "unconfigured";
  readonly speechToText = new UnconfiguredSpeechToTextProvider();
  readonly textToSpeech = new UnconfiguredTextToSpeechProvider();
  get available() { return this.speechToText.available && this.textToSpeech.available; }
  startListening(onTranscript: (text: string) => void) { return this.speechToText.startListening(onTranscript); }
  speak(text: string) { return this.textToSpeech.speak(text); }
  stopSpeaking() { this.textToSpeech.stop(); }
}

export const euterpeVoiceProvider: EuterpeVoiceProvider = new UnconfiguredEuterpeVoiceProvider();

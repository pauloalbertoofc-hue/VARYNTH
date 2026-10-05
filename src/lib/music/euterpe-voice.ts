import { speakEuterpeText } from "./euterpe-browser-speech";

export type EuterpeSpeechToTextProvider = {
  readonly id: string;
  readonly available: boolean;
  startListening(onTranscript: (text: string) => void, onEnd?: () => void): Promise<() => void>;
};

export type EuterpeTextToSpeechProvider = {
  readonly id: string;
  readonly available: boolean;
  speak(text: string): Promise<void>;
  stop(): void;
};

export type EuterpeVoiceProvider = {
  readonly id: string;
  readonly available: boolean;
  readonly speechToText: EuterpeSpeechToTextProvider;
  readonly textToSpeech: EuterpeTextToSpeechProvider;
  startListening(onTranscript: (text: string) => void, onEnd?: () => void): Promise<() => void>;
  speak(text: string): Promise<void>;
  stopSpeaking(): void;
};

type RecognitionResultLike = { 0?: { transcript?: string }; isFinal?: boolean };
type RecognitionEventLike = { resultIndex: number; results: ArrayLike<RecognitionResultLike> };
type RecognitionErrorLike = { error?: string };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => RecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browser = window as SpeechWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export class BrowserSpeechToTextProvider implements EuterpeSpeechToTextProvider {
  readonly id = "browser-speech-recognition-pt-BR";
  get available() { return Boolean(recognitionConstructor()); }

  async startListening(onTranscript: (text: string) => void, onEnd?: () => void): Promise<() => void> {
    const Recognition = recognitionConstructor();
    if (!Recognition) throw new Error("O reconhecimento de voz não está disponível neste navegador. Você ainda pode digitar para conversar com Euterpe.");

    return new Promise((resolve, reject) => {
      const recognition = new Recognition();
      let started = false;
      let settled = false;
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        started = true;
        settled = true;
        resolve(() => recognition.stop());
      };
      recognition.onresult = (event) => {
        const result = event.results[event.resultIndex];
        const transcript = result?.[0]?.transcript?.trim();
        if (transcript) onTranscript(transcript);
      };
      recognition.onerror = (event) => {
        if (settled) return;
        settled = true;
        const reason = event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Permita o acesso ao microfone para ditar uma mensagem à Euterpe."
          : "O navegador não conseguiu iniciar o reconhecimento de voz.";
        reject(new Error(reason));
      };
      recognition.onend = () => {
        if (!started && !settled) {
          settled = true;
          reject(new Error("O reconhecimento de voz terminou antes de iniciar. Verifique a permissão do microfone."));
        } else if (started) onEnd?.();
      };
      try { recognition.start(); }
      catch (error) { settled = true; reject(error instanceof Error ? error : new Error("Não foi possível iniciar o microfone.")); }
    });
  }
}

export class BrowserTextToSpeechProvider implements EuterpeTextToSpeechProvider {
  readonly id = "browser-speech-synthesis-pt-BR";
  get available() { return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"; }

  speak(text: string): Promise<void> {
    if (!this.available) return Promise.reject(new Error("A fala sintetizada não está disponível neste navegador ou dispositivo."));
    return new Promise((resolve, reject) => {
      const utterance = speakEuterpeText(text, window.speechSynthesis, (value) => new SpeechSynthesisUtterance(value));
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Não foi possível reproduzir a fala neste dispositivo."));
    });
  }

  stop() { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }
}

export class BrowserEuterpeVoiceProvider implements EuterpeVoiceProvider {
  readonly id = "browser-voice-pt-BR";
  readonly speechToText: EuterpeSpeechToTextProvider = new BrowserSpeechToTextProvider();
  readonly textToSpeech: EuterpeTextToSpeechProvider = new BrowserTextToSpeechProvider();
  get available() { return this.speechToText.available && this.textToSpeech.available; }
  startListening(onTranscript: (text: string) => void, onEnd?: () => void) { return this.speechToText.startListening(onTranscript, onEnd); }
  speak(text: string) { return this.textToSpeech.speak(text); }
  stopSpeaking() { this.textToSpeech.stop(); }
}

export const euterpeVoiceProvider: EuterpeVoiceProvider = new BrowserEuterpeVoiceProvider();

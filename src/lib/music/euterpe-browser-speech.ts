type EuterpeSpeechSynthesis = Pick<SpeechSynthesis, "speak" | "cancel"> & Partial<Pick<SpeechSynthesis, "getVoices">>;

/** Prefer a warm Brazilian voice when the browser exposes one; voice catalogs differ by OS. */
export function selectEuterpeVoice(voices: readonly SpeechSynthesisVoice[], language = "pt-BR"): SpeechSynthesisVoice | undefined {
  const normalizedLanguage = language.toLowerCase();
  const brazilian = voices.filter((voice) => voice.lang.toLowerCase() === normalizedLanguage || voice.lang.toLowerCase().startsWith("pt-br"));
  const candidates = brazilian.length ? brazilian : voices.filter((voice) => voice.lang.toLowerCase().startsWith("pt"));
  const preferred = [/google.*portugu[eê]s.*brasil/i, /luciana/i, /francisca/i, /maria/i, /female/i, /femin/i];
  return [...candidates].sort((a, b) => {
    const score = (voice: SpeechSynthesisVoice) => preferred.reduce((total, pattern, index) => total + (pattern.test(voice.name) ? preferred.length - index : 0), 0) + (voice.localService ? 1 : 0);
    return score(b) - score(a);
  })[0];
}

export function speakEuterpeText(
  text: string,
  speech: EuterpeSpeechSynthesis,
  createUtterance: (text: string) => SpeechSynthesisUtterance,
): SpeechSynthesisUtterance {
  speech.cancel();
  const utterance = createUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.9;
  utterance.pitch = 1.08;
  const voice = speech.getVoices?.();
  const selectedVoice = voice?.length ? selectEuterpeVoice(voice) : undefined;
  if (selectedVoice) utterance.voice = selectedVoice;
  speech.speak(utterance);
  return utterance;
}

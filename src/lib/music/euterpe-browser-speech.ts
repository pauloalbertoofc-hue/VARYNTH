export function speakEuterpeText(
  text: string,
  speech: Pick<SpeechSynthesis, "speak" | "cancel">,
  createUtterance: (text: string) => SpeechSynthesisUtterance,
): SpeechSynthesisUtterance {
  speech.cancel();
  const utterance = createUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.96;
  utterance.pitch = 1.04;
  speech.speak(utterance);
  return utterance;
}

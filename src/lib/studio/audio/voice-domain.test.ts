import { createEuterpeVoiceProfile, selectVoiceTake } from "./voice-domain";
const profile = createEuterpeVoiceProfile(); if (profile.characterId !== "euterpe" || profile.version !== "Euterpe Voice v1") throw new Error("Perfil Euterpe inválido");
const takes = selectVoiceTake([{ id: "a", text: "Bom dia", expression: "Neutral", profileVersion: profile.version, selected: false }, { id: "b", text: "Bom dia", expression: "Happy", profileVersion: profile.version, selected: false }], "b");
if (takes.filter((take) => take.selected).length !== 1 || !takes[1].selected) throw new Error("Seleção de take inválida");
console.log("Voice domain tests passed: Euterpe profile, versioning and take selection.");

import { beatsToSeconds, chordToNotes, constrainNotesToScale, constrainNotesToKeyMap, defaultMusicProject, durationToBeats, effectiveNoteDurationBeats, flattenMusicNotes, humanizeNotes, midiToFrequency, midiToPitch, musicNoteScheduleTiming, pitchToFrequency, pitchToMidi, quantizeBeat, quantizeNotes, tempoMapBeatsToSeconds, tempoMapSecondsToBeats, transposeNote, upsertTempoPoint, beatsPerMeasure, musicLoopPositionAtMs, setMusicLoopBars, upsertArrangementSection, upsertMusicSyncPoint, musicKeyAtBeat, upsertMusicKeyPoint } from "./music-domain";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
assert(pitchToMidi("A", 4) === 69, "A4 deve ser MIDI 69");
assert(pitchToMidi("C", 4) === 60, "C4 deve ser MIDI 60");
assert(effectiveNoteDurationBeats({ durationBeats: 1, tuplet: { actual: 3, normal: 2 } }) === 2 / 3, "Tuplet deve reduzir a duração efetiva");
assert(Math.abs(pitchToFrequency("A", 4) - 440) < 0.0001, "A4 deve ser 440Hz");
assert(midiToFrequency(60) > 261 && midiToFrequency(60) < 262, "C4 deve ter frequência correta");
assert(midiToPitch(60).pitch === "C" && midiToPitch(60).octave === 4, "C4 deve retornar corretamente");
assert(beatsToSeconds(4, 60) === 4, "Tempo deve converter beats para segundos");
assert(durationToBeats("quarter") === 1 && durationToBeats("half", true) === 3, "Durações musicais devem ser reais");
assert(quantizeBeat(1.12, 4) === 1, "Quantização de semínima deve funcionar");
const transposed = transposeNote({ id: "n", pitch: "C", accidental: "natural", octave: 4, startBeat: 0, durationBeats: 1, velocity: 96 }, 12);
assert(transposed.pitch === "C" && transposed.octave === 5, "Transposição deve preservar o modelo musical");
const constrained = constrainNotesToScale([{ id: "chromatic", pitch: "C", accidental: "sharp", octave: 4, startBeat: 0, durationBeats: 1, velocity: 96 }], pitchToMidi("C", 0), "major")[0];
assert(pitchToMidi(constrained.pitch, constrained.octave, constrained.accidental) === pitchToMidi("C", 4), "Correção de escala deve escolher a nota diatônica mais próxima");
assert(defaultMusicProject().tempoMap[0].bpm === 120, "Projeto musical deve ter tempo padrão");
const keyMap = upsertMusicKeyPoint(defaultMusicProject().keyMap!, { beat: 16, tonic: "G", accidental: "natural", scale: "major" });
assert(musicKeyAtBeat(keyMap, defaultMusicProject().key, 15).tonic === "C" && musicKeyAtBeat(keyMap, defaultMusicProject().key, 16).tonic === "G", "Mudança tonal deve valer a partir do beat indicado");
assert(upsertMusicKeyPoint(keyMap, { beat: 16, tonic: "D", accidental: "natural", scale: "minor" }).length === 2, "Editar mudança tonal substitui ponto no mesmo beat sem duplicar");
let midMeasureKeyRejected = false; try { upsertMusicKeyPoint(keyMap, { beat: 15, tonic: "F", accidental: "natural", scale: "major" }, { numerator: 4, denominator: 4 }); } catch { midMeasureKeyRejected = true; }
assert(midMeasureKeyRejected, "Mudança tonal no meio do compasso deve ser recusada enquanto exportação/gravura são por compasso");
const contextualNotes = constrainNotesToKeyMap([{ id: "invalid-csharp", pitch: "C", accidental: "sharp", octave: 4, startBeat: 0, durationBeats: 1, velocity: 96 }, { id: "valid-fsharp", pitch: "F", accidental: "sharp", octave: 4, startBeat: 16, durationBeats: 1, velocity: 96 }], keyMap, defaultMusicProject().key);
assert(pitchToMidi(contextualNotes[0].pitch, contextualNotes[0].octave, contextualNotes[0].accidental) === pitchToMidi("C", 4), "Correção deve ajustar nota cromática no tom global");
assert(contextualNotes[1].pitch === "F" && contextualNotes[1].accidental === "sharp", "Correção deve manter nota válida na modulação vigente");
const sections = upsertArrangementSection([], { id: "intro", name: " Intro ", kind: "intro", startBeat: 0, endBeat: 8 });
assert(sections[0].name === "Intro", "Seções limpam espaços e persistem em beats absolutos");
let overlapRejected = false; try { upsertArrangementSection(sections, { id: "verse", name: "Verse", kind: "verse", startBeat: 4, endBeat: 12 }); } catch { overlapRejected = true; }
assert(overlapRejected, "Seções sobrepostas devem ser rejeitadas");
const barMarker = upsertMusicSyncPoint([], { id: "bar2", kind: "bar", beat: 4, label: "Compasso 2" }, { numerator: 4, denominator: 4 });
assert(barMarker[0].beat === 4, "Marcadores semânticos são ordenados por beat");
let invalidBarRejected = false; try { upsertMusicSyncPoint([], { id: "badbar", kind: "bar", beat: 2, label: "Inválido" }, { numerator: 4, denominator: 4 }); } catch { invalidBarRejected = true; }
assert(invalidBarRejected, "Marcador de compasso desalinhado deve ser rejeitado");
const baseNote = { id: "q", pitch: "C" as const, accidental: "natural" as const, octave: 4, startBeat: 1.13, durationBeats: 1, velocity: 96 };
assert(quantizeNotes([baseNote], 4)[0].startBeat === 1 && quantizeNotes([baseNote], 4)[0].originalStartBeat === 1.13, "Quantização deve preservar origem");
assert(humanizeNotes([baseNote], 0.02, 4, 7)[0].originalVelocity === 96, "Humanização deve preservar velocity original");
assert(chordToNotes({ id: "c", root: "C", accidental: "natural", octave: 4, quality: "major", startBeat: 0, durationBeats: 4 }).length === 3, "Acorde maior deve materializar 3 notas");
const extendedChord = chordToNotes({ id: "c9", root: "C", accidental: "natural", octave: 4, quality: "major", extensions: [9], inversion: 1, startBeat: 0, durationBeats: 4 });
assert(extendedChord.length === 4 && extendedChord[0].pitch === "E" && extendedChord.at(-1)?.octave === 5, "Extensão e inversão devem alterar as notas do acorde");
assert(extendedChord.every((note) => note.chordId === "c9"), "Notas materializadas devem manter a relação com o acorde");
const spreadChord = chordToNotes({ id: "spread", root: "C", accidental: "natural", octave: 4, quality: "major", voicing: "spread", startBeat: 0, durationBeats: 1 });
assert(spreadChord[1].octave > spreadChord[0].octave, "Voicing spread deve abrir vozes alternadas");
assert(tempoMapBeatsToSeconds(6, [{ beat: 0, bpm: 60 }, { beat: 4, bpm: 120 }]) === 5, "Tempo map deve calcular mudanças de BPM");
assert(Math.abs(tempoMapSecondsToBeats(5, [{ beat: 0, bpm: 60 }, { beat: 4, bpm: 120 }]) - 6) < 0.001, "Tempo map inverso deve ser consistente");
assert(tempoMapBeatsToSeconds(6, [{ beat: 4, bpm: 120 }]) === 3, "Mapa iniciado após beat zero deve herdar BPM inicial retroativamente");
assert(Math.abs(tempoMapSecondsToBeats(3, [{ beat: 4, bpm: 120 }]) - 6) < 0.001, "Conversão inversa deve usar BPM herdado antes do primeiro ponto explícito");
const oldSchedule = musicNoteScheduleTiming(8, 9, 1000, [{ beat: 0, bpm: 120 }]);
const changedSchedule = musicNoteScheduleTiming(8, 9, 1000, [{ beat: 0, bpm: 120 }, { beat: 4, bpm: 60 }]);
assert(oldSchedule.delayMs === 3000 && changedSchedule.delayMs === 5000, "Reagendar depois de editar tempo deve refletir o novo mapa para eventos futuros sem mover o cursor de tempo");
assert(musicNoteScheduleTiming(3, 5, 0, [{ beat: 0, bpm: 120 }, { beat: 4, bpm: 60 }]).durationMs === 1500, "Duração da nota que cruza uma mudança de BPM deve integrar ambos os segmentos");
let invalidTempoRejected = false; try { tempoMapBeatsToSeconds(4, [{ beat: 0, bpm: 120 }, { beat: 0, bpm: 90 }]); } catch { invalidTempoRejected = true; }
assert(invalidTempoRejected, "Beats duplicados no mapa de tempo devem falhar explicitamente");
assert(upsertTempoPoint([{ beat: 0, bpm: 120 }], { beat: 8, bpm: 90 })[1].bpm === 90, "Tempo point deve ser ordenado");
const loopProject = setMusicLoopBars(defaultMusicProject(), 3, 7, true);
assert(beatsPerMeasure({ numerator: 6, denominator: 8 }) === 3, "Compasso 6/8 deve equivaler a três beats de semínima");
assert(beatsPerMeasure({ numerator: 3, denominator: 4 }) === 3 && beatsPerMeasure({ numerator: 2, denominator: 4 }) === 2, "Compassos simples devem produzir tamanho musical correto");
let invalidMeterRejected = false; try { beatsPerMeasure({ numerator: 0, denominator: 4 }); } catch { invalidMeterRejected = true; }
assert(invalidMeterRejected, "Numerador de compasso inválido deve falhar explicitamente");
assert(loopProject.loopRegion?.startBeat === 8 && loopProject.loopRegion.endBeat === 24, "Região musical deve ser armazenada em beats absolutos");
const tempoLoop = { enabled: true, startBeat: 8, endBeat: 24 };
assert(musicLoopPositionAtMs(19999, tempoLoop, [{ beat: 0, bpm: 120 }, { beat: 8, bpm: 60 }]) === null, "Loop não deve disparar antes do compasso final");
assert(musicLoopPositionAtMs(20000, tempoLoop, [{ beat: 0, bpm: 120 }, { beat: 8, bpm: 60 }]) === 4000, "Loop musical deve voltar ao início respeitando o tempo map");
const offsetMusic = { ...defaultMusicProject(), tempoMap: [{ beat: 0, bpm: 120 }, { beat: 4, bpm: 60 }], clips: [{ id: "offset", trackId: "midi", name: "Offset", timelineStartMs: 3000, startBeat: 2, endBeat: 6, transposeSemitones: 0, notes: [{ ...baseNote, startBeat: 0 }] }] };
assert(flattenMusicNotes(offsetMusic)[0].startBeat === 7, "Music Clip deve converter timelineStartMs pelo tempo map completo");
const transposingMusic = { ...offsetMusic, clips: [{ ...offsetMusic.clips[0], transposeSemitones: 2 }] };
assert(flattenMusicNotes(transposingMusic)[0].pitch === "D" && flattenMusicNotes(transposingMusic)[0].octave === 4, "Transposição do Music Clip deve alcançar playback e edição flattened");
assert(Math.abs(pitchToFrequency("A", 4, "natural", 442) - 442) < 0.0001, "Afinação de concerto deve redefinir a frequência de A4");
console.log("Music domain tests passed: pitch, tuning, tempo, durations, quantization, transpose and serialization defaults.");

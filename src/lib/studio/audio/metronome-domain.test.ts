import { scheduleMetronomeTicks } from "./metronome-domain";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const sixEight = scheduleMetronomeTicks({ positionMs: 0, timeSignature: { numerator: 6, denominator: 8 }, tempoMap: [{ beat: 0, bpm: 120 }], fallbackBpm: 120, countInBars: 1, tickCount: 8 });
assert(sixEight.length === 8, "Scheduler deve retornar a quantidade solicitada de ticks");
assert(sixEight[0].beat === -3 && sixEight[0].delayMs === 0, "Count-in 6/8 deve começar exatamente um compasso antes da música");
assert(sixEight.slice(0, 6).every((tick, index) => tick.delayMs === index * 250), "6/8 a 120 BPM deve marcar seis colcheias uniformes durante o count-in");
assert(sixEight[6].beat === 0 && sixEight[6].delayMs === 1500 && sixEight[6].accented, "Primeiro tempo musical deve cair após um compasso e receber acento");
assert(!sixEight[1].accented && sixEight[5].accented === false, "Apenas o primeiro pulso do compasso deve ser acentuado");

const variableTempo = scheduleMetronomeTicks({ positionMs: 0, timeSignature: { numerator: 4, denominator: 4 }, tempoMap: [{ beat: 0, bpm: 120 }, { beat: 4, bpm: 60 }], fallbackBpm: 120, tickCount: 6 });
assert(variableTempo[0].delayMs === 0 && variableTempo[3].delayMs === 1500 && variableTempo[4].delayMs === 2000 && variableTempo[5].delayMs === 3000, "Ticks depois de alteração de tempo devem acompanhar o tempo map");

const resumed = scheduleMetronomeTicks({ positionMs: 2500, timeSignature: { numerator: 3, denominator: 4 }, tempoMap: [{ beat: 0, bpm: 120 }], fallbackBpm: 120, tickCount: 2 });
assert(resumed[0].beat === 5 && resumed[0].delayMs === 0 && !resumed[0].accented, "Seek deve agendar o próximo pulso sem count-in e manter a fase do compasso");

let invalidRejected = false;
try { scheduleMetronomeTicks({ positionMs: 0, timeSignature: { numerator: 4, denominator: 4 }, tempoMap: [{ beat: 0, bpm: 120 }], fallbackBpm: 0 }); } catch { invalidRejected = true; }
assert(invalidRejected, "BPM inválido deve ser rejeitado antes do agendamento");

console.log("Metronome domain tests passed: meter subdivision, count-in timing, accent, tempo map and seek phase.");

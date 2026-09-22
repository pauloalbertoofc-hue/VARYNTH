import { InstrumentEngine, InstrumentNote } from "./instrument-engine";

export interface MidiInputInfo { id: string; name: string; manufacturer?: string; state: string; }
export interface MidiRuntimeStatus { available: boolean; connectedInputId?: string; error?: string; }
type MidiMessage = { data?: Uint8Array };
export type MidiRuntimeHandlers = { onConnectionLost?: () => void; onNoteEvent?: (event: { phase: "NOTE_ON" | "NOTE_OFF"; midi: number; velocity: number; timeMs: number }) => void };

export function decodeMidiMessage(data: Uint8Array): { type: "NOTE_ON" | "NOTE_OFF" | "CONTROL_CHANGE" | "PITCH_BEND" | "OTHER"; midi?: number; velocity?: number; controller?: number; value?: number; semitones?: number } {
  if (data.length < 3) return { type: "OTHER" };
  const command = data[0] & 0xf0;
  if (command === 0x90 && data[2] > 0) return { type: "NOTE_ON", midi: data[1], velocity: data[2] };
  if (command === 0x80 || (command === 0x90 && data[2] === 0)) return { type: "NOTE_OFF", midi: data[1], velocity: data[2] };
  if (command === 0xb0) return { type: "CONTROL_CHANGE", controller: data[1], value: data[2] };
  if (command === 0xe0) return { type: "PITCH_BEND", value: (data[2] << 7) | data[1], semitones: ((((data[2] << 7) | data[1]) - 8192) / 8192) * 2 };
  return { type: "OTHER" };
}

export class MidiRuntimeController {
  private access: any = null;
  private input: any = null;
  private instrument: InstrumentEngine | null = null;
  private listener: ((event: MidiMessage) => void) | null = null;
  private handlers: MidiRuntimeHandlers = {};
  status(): MidiRuntimeStatus { if (typeof navigator === "undefined" || !(navigator as any).requestMIDIAccess) return { available: false, error: "[MIDI_UNAVAILABLE] Web MIDI não está disponível neste navegador." }; return { available: true, connectedInputId: this.input?.id }; }
  async listInputs(): Promise<MidiInputInfo[]> { if (typeof navigator === "undefined" || !(navigator as any).requestMIDIAccess) return []; this.access = this.access || await (navigator as any).requestMIDIAccess(); return [...this.access.inputs.values()].map((input: any) => ({ id: input.id, name: input.name || "MIDI Input", manufacturer: input.manufacturer, state: input.state })); }
  async connect(inputId: string, instrument: InstrumentEngine, handlers: MidiRuntimeHandlers = {}): Promise<void> { const inputs = await this.listInputs(); const input = [...this.access.inputs.values()].find((item: any) => item.id === inputId); if (!input) throw new Error(`[MIDI_INPUT_NOT_FOUND] Entrada MIDI '${inputId}' não encontrada.`); this.disconnect(); this.instrument = instrument; this.handlers = handlers; this.input = input; this.listener = (event) => this.handleMessage(event); input.onmidimessage = this.listener; if (!inputs.some((item) => item.id === inputId)) throw new Error("[MIDI_INPUT_NOT_FOUND] Entrada MIDI indisponível."); }
  disconnect(): void { if (this.input) this.input.onmidimessage = null; this.input = null; this.listener = null; this.instrument = null; this.handlers = {}; }
  handleInputStateChange(state: string): void { if (state === "disconnected" && this.input) { const onConnectionLost = this.handlers.onConnectionLost; this.disconnect(); onConnectionLost?.(); } }
  private handleMessage(event: MidiMessage): void { const data = event.data; if (!data || !this.instrument) return; const decoded = decodeMidiMessage(data); const timeMs = typeof performance !== "undefined" ? performance.now() : Date.now(); if (decoded.type === "NOTE_ON") { this.instrument.noteOn({ midi: decoded.midi!, velocity: decoded.velocity! } as InstrumentNote); this.handlers.onNoteEvent?.({ phase: "NOTE_ON", midi: decoded.midi!, velocity: decoded.velocity!, timeMs }); } else if (decoded.type === "NOTE_OFF") { this.instrument.noteOff(decoded.midi!); this.handlers.onNoteEvent?.({ phase: "NOTE_OFF", midi: decoded.midi!, velocity: decoded.velocity || 0, timeMs }); } else if (decoded.type === "PITCH_BEND") this.instrument.setPitchBend?.(decoded.semitones!); else if (decoded.type === "CONTROL_CHANGE") { if (decoded.controller === 7) this.instrument.setParameter("gain", decoded.value! / 127 * 0.5); if (decoded.controller === 74) this.instrument.setParameter("filterFrequency", 200 + decoded.value! / 127 * 15800); if (decoded.controller === 64) this.instrument.setSustain?.(decoded.value! >= 64); } }
}
export const midiRuntimeController = new MidiRuntimeController();

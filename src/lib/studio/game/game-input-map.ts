import { InputActionMapping } from "./types";

export class GameInputMap {
  constructor(private mappings: InputActionMapping[] = []) {}
  set(action: string, keys: string[]) { const current = this.mappings.find(m => m.action === action); if (current) current.keys = [...new Set(keys)]; else this.mappings.push({ action, keys: [...new Set(keys)] }); }
  keysFor(action: string) { return this.mappings.find(m => m.action === action)?.keys || []; }
  isPressed(action: string, pressedKeys: Set<string>) { return this.keysFor(action).some(key => pressedKeys.has(key)); }
  toJSON() { return this.mappings.map(m => ({ ...m, keys: [...m.keys] })); }
}

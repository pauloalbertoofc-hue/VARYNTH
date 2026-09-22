import { ComponentType, GameComponent } from "./types";

export interface GameComponentDefinition<T extends GameComponent = GameComponent> {
  type: T["type"];
  label: string;
  description: string;
  createDefault: () => T;
}

const definitions: GameComponentDefinition[] = [
  { type: "TRANSFORM", label: "Transform 2D", description: "Posição, escala, rotação e ordem visual.", createDefault: () => ({ type: "TRANSFORM", x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 0 }) },
  { type: "SPRITE", label: "Sprite", description: "Imagem renderizada na cena.", createDefault: () => ({ type: "SPRITE", assetId: "default-sprite", width: 64, height: 64 }) },
  { type: "TEXT", label: "Texto", description: "Texto renderizado.", createDefault: () => ({ type: "TEXT", text: "Novo Texto", fontSize: 18, color: "#ffffff" }) },
  { type: "COLLIDER", label: "Collider 2D", description: "Área de colisão retangular ou circular.", createDefault: () => ({ type: "COLLIDER", shape: "RECTANGLE", width: 64, height: 64 }) },
  { type: "AUDIO_SOURCE", label: "Audio Source", description: "Áudio associado à entidade.", createDefault: () => ({ type: "AUDIO_SOURCE", assetId: "sfx-default", volume: 1, loop: false }) },
  { type: "UI", label: "UI", description: "Elemento de interface do jogo.", createDefault: () => ({ type: "UI", elementType: "BUTTON", text: "Clique Aqui" }) },
  { type: "RIGID_BODY", label: "RigidBody 2D", description: "Corpo físico do jogo.", createDefault: () => ({ type: "RIGID_BODY", mode: "DYNAMIC", mass: 1, gravityScale: 1, velocityX: 0, velocityY: 0 }) },
  { type: "ANIMATOR", label: "Animator", description: "Clips e estados de animação.", createDefault: () => ({ type: "ANIMATOR", clips: [], playing: false }) },
  { type: "CAMERA", label: "Camera 2D", description: "Câmera com alvo, zoom e limites.", createDefault: () => ({ type: "CAMERA", offsetX: 0, offsetY: 0, smoothing: 0.1, zoom: 1 }) },
];

export class GameComponentRegistry {
  private entries = new Map<ComponentType, GameComponentDefinition>(definitions.map((d) => [d.type, d]));
  register(definition: GameComponentDefinition) { this.entries.set(definition.type, definition); }
  get(type: ComponentType) { return this.entries.get(type); }
  all() { return Array.from(this.entries.values()); }
  createDefault(type: ComponentType) { return this.entries.get(type)?.createDefault(); }
}

export const gameComponentRegistry = new GameComponentRegistry();

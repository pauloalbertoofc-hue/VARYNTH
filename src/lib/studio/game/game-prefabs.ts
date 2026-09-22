import { GameEntity, GamePrefab } from "./types";

export function createPrefab(name: string, entity: GameEntity): GamePrefab { return { id: `prefab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, sourceEntity: structuredClone(entity), instanceIds: [] }; }
export function instantiatePrefab(prefab: GamePrefab, sceneId: string, overrides: Partial<GameEntity> = {}): GameEntity { const instance: GameEntity = { ...structuredClone(prefab.sourceEntity), ...overrides, id: `instance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sceneId, metadata: { ...(prefab.sourceEntity.metadata || {}), prefabId: prefab.id, ...(overrides.metadata || {}) } }; return instance; }

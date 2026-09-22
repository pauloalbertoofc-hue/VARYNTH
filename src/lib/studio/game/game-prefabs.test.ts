import { createPrefab, instantiatePrefab } from "./game-prefabs";
const source: any = { id: "e", sceneId: "s1", name: "Enemy", active: true, tags: ["enemy"], components: [] };
const prefab = createPrefab("Enemy", source); const instance = instantiatePrefab(prefab, "s2", { name: "Enemy Boss" });
if (instance.id === source.id || instance.sceneId !== "s2" || instance.name !== "Enemy Boss") throw new Error("prefab instance failed");
if (prefab.sourceEntity === source || prefab.sourceEntity.tags === source.tags) throw new Error("prefab must clone source");
console.log("Prefabs: 2 aprovados");

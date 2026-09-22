import { gameRulesEngine } from "./game-rules-engine";
const entities: any = { player: { id: "player", tags: ["hero"], active: true, components: [] } };
if (!gameRulesEngine.evaluateConditions([{ type: "ENTITY_EXISTS", variableId: "", operator: "EQUALS", value: true, entityId: "player" }], {}, entities)) throw new Error("entity existence failed");
if (!gameRulesEngine.evaluateConditions([{ type: "HAS_TAG", variableId: "", operator: "EQUALS", value: true, entityId: "player", tag: "hero" }], {}, entities)) throw new Error("tag condition failed");
console.log("Entity conditions: 2 aprovados");

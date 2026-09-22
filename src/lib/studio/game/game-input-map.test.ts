import { GameInputMap } from "./game-input-map";
const map = new GameInputMap([{ action: "move_left", keys: ["KeyA", "ArrowLeft"] }]);
if (!map.isPressed("move_left", new Set(["ArrowLeft"]))) throw new Error("Input Map failed");
map.set("jump", ["Space", "Space"]);
if (map.keysFor("jump").length !== 1) throw new Error("Input Map deduplication failed");
console.log("Input Map: 2 aprovados");

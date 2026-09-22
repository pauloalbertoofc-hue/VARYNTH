import { stepAnimations } from "./game-animation";
import { stepCameras } from "./game-camera";
const target: any = { id: "p", components: [{ type: "TRANSFORM", x: 100, y: 50, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 0 }, { type: "ANIMATOR", playing: true, clips: [{ id: "walk", name: "Walk", loop: true, frames: [{ assetId: "a", durationMs: 100 }, { assetId: "b", durationMs: 100 }] }], activeClipId: "walk" }] };
const camera: any = { id: "c", components: [{ type: "TRANSFORM", x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, zIndex: 0 }, { type: "CAMERA", followEntityId: "p", offsetX: 0, offsetY: 0, smoothing: 1, zoom: 2 }] };
const entities: any = { p: target, c: camera };
stepAnimations(entities, 120); if (target.components[1].frameIndex !== 1) throw new Error("animation frame failed");
const states = stepCameras(entities, 16.666); if (states.c.x !== 100 || states.c.y !== 50 || states.c.zoom !== 2) throw new Error("camera follow failed");
console.log("Animation/Camera: 2 aprovados");

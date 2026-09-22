import { extractSignal, confidenceFromEvidence } from "./signals";
const event = { id: "e", timestamp: new Date().toISOString(), actor: "USER", actionType: "IMMEDIATE_UNDO", metadata: {}, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 } as const;
if (extractSignal(event)?.strength !== "HIGH") throw new Error("undo strength failed");
if (extractSignal({ ...event, actor: "AGENT", learningEligible: false })?.eligible !== false) throw new Error("agent signal leaked");
if (confidenceFromEvidence([{ weight: "VERY_HIGH" }, { weight: "HIGH" }]) !== 0.88) throw new Error("confidence calculation failed");
if (confidenceFromEvidence([{ weight: "VERY_HIGH" }], 2) !== 0.2) throw new Error("contradiction handling failed");
console.log("Experience signal validation passed.");

import { validateExperienceEvent } from "./contracts";

const valid = {
  id: "evt-1", timestamp: new Date().toISOString(), actor: "USER", actionType: "MANUAL_EDIT",
  metadata: {}, source: "audio-studio", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1,
} as const;
if (validateExperienceEvent(valid).id !== "evt-1") throw new Error("valid event rejected");
let failed = false;
try { validateExperienceEvent({ ...valid, actor: "AGENT", learningEligible: true }); } catch { failed = true; }
if (!failed) throw new Error("agent self-learning event accepted");
failed = false;
try { validateExperienceEvent({ ...valid, actionType: "NOT_REAL" }); } catch { failed = true; }
if (!failed) throw new Error("unknown event accepted");
console.log("Experience contracts validation passed.");

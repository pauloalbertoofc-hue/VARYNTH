import { validateExperienceEvent } from "./contracts";
import { resolveExperienceFeatureFlags } from "./feature-flags";

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
const flags = resolveExperienceFeatureFlags({
  NEXT_PUBLIC_VARYNTH_EXPERIENCE_ENABLED: "off",
  NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED: "false",
});
if (flags.enabled || flags.preferenceInferenceEnabled || !flags.projectRetrospectivesEnabled) throw new Error("Experience feature flags did not resolve independent safe-off values");
console.log("Experience contracts validation passed.");

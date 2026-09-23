import { evaluateLearningEligibility } from "./learning-policy";
const base = { ownerId: "local-owner", learningEligible: true, metadata: {} } as const;
if (!evaluateLearningEligibility({ ...base, actor: "USER", actionType: "MANUAL_EDIT" }).eligible) throw new Error("user event rejected");
if (evaluateLearningEligibility({ ...base, actor: "AGENT", actionType: "PROPOSAL_ACCEPTED" }).eligible) throw new Error("agent event learned");
if (evaluateLearningEligibility({ ...base, actor: "SYSTEM", actionType: "MANUAL_EDIT" }).eligible) throw new Error("system event learned");
if (!evaluateLearningEligibility({ ...base, actor: "SYSTEM", actionType: "OUTCOME_RECORDED" }).eligible) throw new Error("outcome rejected");
if (evaluateLearningEligibility({ ...base, actor: "USER", actionType: "MANUAL_EDIT", metadata: { generatedAutomatically: true } }).eligible) throw new Error("automatic loop learned");
console.log("Learning policy validation passed.");

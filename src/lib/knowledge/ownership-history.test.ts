import assert from "node:assert/strict";
import type { KnowledgeOwnershipHistoryEntry } from "./contracts";
import { appendKnowledgeOwnershipChange, reconcileVaultOwnerHistory } from "./ownership-history";

type Source = { knowledgeOwnerAgent?: string; knowledgeOwnerHistory?: KnowledgeOwnershipHistoryEntry[] };
const initial: Source = { knowledgeOwnerAgent: "euterpe", knowledgeOwnerHistory: [{ fromAgent: "athena", toAgent: "euterpe", changedAt: "2026-01-01T00:00:00.000Z", changedBy: "USER", actorId: "owner_1" }] };
const forgedHistory: KnowledgeOwnershipHistoryEntry[] = [{ fromAgent: "forged", toAgent: "owner", changedAt: "bad", changedBy: "SYSTEM" }];
const reassigned = reconcileVaultOwnerHistory(initial, { knowledgeOwnerAgent: "justitia", knowledgeOwnerHistory: forgedHistory }, "owner_2", "2026-02-01T00:00:00.000Z");
assert.equal(reassigned.knowledgeOwnerHistory?.length, 2);
assert.deepEqual(reassigned.knowledgeOwnerHistory?.[1], { fromAgent: "euterpe", toAgent: "justitia", changedAt: "2026-02-01T00:00:00.000Z", changedBy: "USER", actorId: "owner_2" });
assert.deepEqual(reconcileVaultOwnerHistory(reassigned, { knowledgeOwnerAgent: "justitia" }, "owner_2").knowledgeOwnerHistory, reassigned.knowledgeOwnerHistory);
assert.deepEqual(reconcileVaultOwnerHistory(undefined, { knowledgeOwnerAgent: "justitia", knowledgeOwnerHistory: forgedHistory }, "owner_2").knowledgeOwnerHistory, []);
assert.deepEqual(appendKnowledgeOwnershipChange(undefined, undefined, "euterpe", "AGENT", "athena", "2026-03-01T00:00:00.000Z"), [{ fromAgent: undefined, toAgent: "euterpe", changedAt: "2026-03-01T00:00:00.000Z", changedBy: "AGENT", actorId: "athena" }]);
console.log("Knowledge ownership history tests passed");

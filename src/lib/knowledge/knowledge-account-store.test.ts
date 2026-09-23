import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function main() {
  const directory = await mkdtemp(path.join(tmpdir(), "varynth-knowledge-accounts-"));
  const originalDirectory = process.cwd();
  try {
    process.chdir(directory);
    const [{ withKnowledgeAccount }, { storeKnowledge, queryKnowledge, listKnowledgeAccessLogs }, { knowledgeRepository }] = await Promise.all([
      import("./knowledge-account-store"), import("./service"), import("../persistence/repositories"),
    ]);
    const create = (id: string, content: string) => ({
      id, title: "Account scoped reference", content, primaryDomain: "music", relatedDomains: [], categories: [], tags: [],
      ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const,
      kind: "PUBLIC_DOMAIN" as const, assertion: "FACT" as const,
      provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "USER_PROVIDED" as const, inferred: false },
      version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    await withKnowledgeAccount("account-a", () => storeKnowledge(create("account-a-item", "secret-a")), { mode: "LOCAL_FILE" });
    await withKnowledgeAccount("account-b", () => storeKnowledge(create("account-b-item", "secret-b")), { mode: "LOCAL_FILE" });
    const query = { requester: "athena", domain: "music", query: "Account scoped reference", purpose: "isolation test", scope: "PUBLIC" as const };
    const readA = await withKnowledgeAccount("account-a", () => queryKnowledge(query), { mode: "LOCAL_FILE" });
    const readB = await withKnowledgeAccount("account-b", () => queryKnowledge(query), { mode: "LOCAL_FILE" });
    assert.deepEqual(readA.map((item) => item.content), ["secret-a"]);
    assert.deepEqual(readB.map((item) => item.content), ["secret-b"]);
    const logsA = await withKnowledgeAccount("account-a", () => listKnowledgeAccessLogs(), { mode: "LOCAL_FILE" });
    const logsB = await withKnowledgeAccount("account-b", () => listKnowledgeAccessLogs(), { mode: "LOCAL_FILE" });
    assert.equal(logsA.length, 1);
    assert.equal(logsB.length, 1);

    await Promise.all(Array.from({ length: 4 }, (_, index) => withKnowledgeAccount("account-a", async () => {
      await storeKnowledge(create("account-a-item", `updated-${index}`));
      await new Promise((resolve) => setTimeout(resolve, index % 2));
    }, { mode: "LOCAL_FILE" })));
    const final = await withKnowledgeAccount("account-a", () => knowledgeRepository.getById("account-a-item"), { mode: "LOCAL_FILE" });
    assert.equal(final?.version, 5);
    console.log("Knowledge account persistence and isolation tests passed");
  } finally {
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined);
  }
}

void main();

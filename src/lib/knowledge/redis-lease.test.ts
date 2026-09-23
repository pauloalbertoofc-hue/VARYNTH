import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { withKnowledgeAccount } from "./knowledge-account-store";

type Entry = { value: string; expiresAt: number };
const values = new Map<string, Entry>();
let renewals = 0;
let stealNextRenewal = false;

function getLive(key: string): Entry | undefined {
  const entry = values.get(key);
  if (entry && entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
    values.delete(key);
    return undefined;
  }
  return entry;
}

const originalFetch = globalThis.fetch;
const environmentKeys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

async function main() {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as string[];
    let result: unknown = null;
    if (command[0] === "SET") {
      const key = command[1];
      const existing = getLive(key);
      if (command[3] === "NX" && existing) result = null;
      else {
        const ttlIndex = command.indexOf("PX");
        values.set(key, { value: command[2], expiresAt: ttlIndex >= 0 ? Date.now() + Number(command[ttlIndex + 1]) : 0 });
        result = "OK";
      }
    } else if (command[0] === "GET") {
      result = getLive(command[1])?.value ?? null;
    } else if (command[0] === "EVAL") {
      const script = command[1];
      const keyCount = Number(command[2]);
      const key1 = command[3];
      if (script.includes("pexpire")) {
        renewals += 1;
        if (stealNextRenewal) {
          stealNextRenewal = false;
          values.set(key1, { value: "other-instance", expiresAt: Date.now() + 1000 });
          result = 0;
        } else {
          const entry = getLive(key1);
          if (entry?.value === command[4]) {
            entry.expiresAt = Date.now() + Number(command[5]);
            result = 1;
          } else result = 0;
        }
      } else if (script.includes("KEYS[2]")) {
        const lockKey = command[4];
        const lockToken = command[5];
        if (getLive(lockKey)?.value === lockToken) {
          values.set(key1, { value: command[6], expiresAt: 0 });
          result = 1;
        } else result = 0;
      } else if (script.includes("del")) {
        if (getLive(key1)?.value === command[4]) {
          values.delete(key1);
          result = 1;
        } else result = 0;
      }
      void keyCount;
    }
    return Response.json({ result });
  }) as typeof fetch;

  const options = { mode: "REDIS" as const, redisLockLeaseMs: 500, redisLockRenewalIntervalMs: 80 };
  try {
    await withKnowledgeAccount("lease-test-success", async () => new Promise((resolve) => setTimeout(resolve, 1200)), options);
    assert.ok(renewals >= 2, "long writes must renew the lease before expiry");
    const successHash = createHash("sha256").update("lease-test-success").digest("hex");
    const snapshot = JSON.parse(values.get(`varynth:knowledge:account:v1:${successHash}`)?.value || "null") as { revision?: number } | null;
    assert.equal(snapshot?.revision, 1, "snapshot must commit while the lease is still owned");

    const renewalsBeforeLoss = renewals;
    stealNextRenewal = true;
    await assert.rejects(
      withKnowledgeAccount("lease-test-lost", async () => new Promise((resolve) => setTimeout(resolve, 300)), options),
      /KNOWLEDGE_WRITE_LOCK_LOST/,
    );
    assert.ok(renewals > renewalsBeforeLoss);
    const lostHash = createHash("sha256").update("lease-test-lost").digest("hex");
    assert.equal(values.has(`varynth:knowledge:account:v1:${lostHash}`), false, "a former lease owner must not overwrite the snapshot");
    assert.equal([...values.entries()].some(([key, value]) => key.endsWith(":write-lock") && value.value === "other-instance"), true, "cleanup must not release another instance's lock");
    console.log("Knowledge Redis lease renewal and fencing tests passed");
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of environmentKeys) {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    }
  }
}

void main();

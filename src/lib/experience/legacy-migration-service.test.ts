import assert from "node:assert/strict";
import { LegacyExperienceMigrationService } from "./identity";

function store(seed: any[] = []) {
  const records = new Map(seed.map((item) => [item.id, structuredClone(item)]));
  return {
    records,
    async getAll(filter?: (item: any) => boolean) { const values = [...records.values()]; return values.filter((item) => !filter || filter(item)); },
    async getById(id: string) { return records.get(id) || null; },
    async saveBatch(items: any[]) { for (const item of items) records.set(item.id, structuredClone(item)); },
  };
}

async function main() {
  const events = store([{ id: "legacy-event", timestamp: new Date().toISOString() }, { id: "foreign-event", ownerId: "account-b" }]);
  const preferences = store([{ id: "legacy-pref", evidence: [{ eventId: "legacy-event" }] }]);
  const experiences = store([{ id: "legacy-exp", evidence: [{ eventId: "legacy-event" }] }]);
  const exclusions = store([{ id: "legacy-exclusion", scope: "GLOBAL" }]);
  const migration = new LegacyExperienceMigrationService({ events, preferences, experiences, exclusions });
  assert.deepEqual(await migration.preview(), { events: 1, preferences: 1, experiences: 1, learningExclusions: 1 });
  await assert.rejects(() => migration.migrate({ events: true }, false, "account-a"), /CONFIRMATION_REQUIRED/);
  await assert.rejects(() => migration.migrate({ preferences: true }, true, "account-a"), /EVIDENCE_SCOPE/);
  assert.equal(preferences.records.get("legacy-pref").ownerId, undefined, "failed validation does not partially migrate records");
  await assert.rejects(() => migration.migrate({ preferences: true, experiences: true }, true, "account-a"), /EVIDENCE_SCOPE/);
  assert.equal(events.records.get("legacy-event").ownerId, undefined, "multi-category validation occurs before writes");
  let failOnce = true;
  const failingMigration = new LegacyExperienceMigrationService({
    events, experiences, exclusions,
    preferences: { ...preferences, async saveBatch(items: any[]) { if (failOnce) { failOnce = false; throw new Error("simulated storage failure"); } return preferences.saveBatch(items); } },
  });
  await assert.rejects(() => failingMigration.migrate({ events: true, preferences: true, experiences: true }, true, "account-a"), /simulated storage failure/);
  assert.equal(events.records.get("legacy-event").ownerId, undefined, "a write failure restores earlier categories");
  assert.equal(experiences.records.get("legacy-exp").ownerId, undefined, "rollback restores every selected category");
  const migrated = await migration.migrate({ events: true, preferences: true, experiences: true }, true, "account-a");
  assert.deepEqual(migrated, { events: 1, preferences: 1, experiences: 1, learningExclusions: 0 });
  assert.equal((await migration.preview()).events, 0);
  assert.equal(events.records.get("legacy-event").ownerId, "account-a");
  assert.equal(preferences.records.get("legacy-pref").ownerId, "account-a");
  assert.equal(experiences.records.get("legacy-exp").ownerId, "account-a");
  assert.equal(exclusions.records.get("legacy-exclusion").ownerId, undefined, "legacy privacy exclusion remains fail-closed");
  assert.deepEqual(await migration.preview(), { events: 0, preferences: 0, experiences: 0, learningExclusions: 1 });
  console.log("Legacy Experience review and migration tests passed.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });

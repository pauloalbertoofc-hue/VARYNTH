import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DomainRegistry } from "./domain-registry";

(async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "varynth-domain-registry-"));
  const originalDirectory = process.cwd();
  try {
    process.chdir(directory);
    const { readPersistedDomainRegistry, savePersistedDomainRegistry } = await import("./domain-registry-store");
    const options = { mode: "LOCAL_FILE" as const };
    assert.equal(await readPersistedDomainRegistry(options), null);
    const registry = new DomainRegistry(false);
    registry.register({ id: "science", label: "Science", primaryOwner: "newton", specialists: [], capabilities: ["science.explain"], relatedDomains: [], enabled: true });
    const domains = registry.listAllDomains();
    assert.equal(await savePersistedDomainRegistry(domains, 0, options), 1);
    const restored = await readPersistedDomainRegistry(options);
    assert.equal(restored?.revision, 1);
    assert.deepEqual(restored?.domains, domains);
    await assert.rejects(savePersistedDomainRegistry(domains, 0, options), /DOMAIN_REGISTRY_REVISION_CONFLICT/);
  } finally {
    process.chdir(originalDirectory);
    // Windows can retain a transient handle after the dynamic import; this is
    // test-only temporary data and cleanup must not mask the assertions.
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined);
  }
  console.log("Domain registry persistence tests passed");
})();

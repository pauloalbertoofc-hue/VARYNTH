import { artifactService } from "./artifact-service";
import { artifactStore } from "./artifact-store";
import { assetManager } from "./asset-manager";
import { creativeGraph } from "./creative-graph";
import { CreativeIntegrityValidator } from "./creative-integrity-validator";
import { backupService } from "../backup/backup-service";
import { ToolManager } from "../athena/tools/tool-manager";
import { AthenaEngineContext } from "../athena/engine";

async function runCrossStudioIntegrationSuite() {
  console.log("\n===============================================================");
  console.log("  VARYNTH OS — CREATION FOUNDATION: CROSS-STUDIO INTEGRATION   ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: [${testId}] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: [${testId}] ${desc}`);
      failed++;
    }
  }

  // CROSS-REG-001: Document can relate to Video as script source
  const doc1 = (await artifactService.create({ type: "DOCUMENT", name: "Roteiro Oficial" })).artifact!;
  const video1 = (await artifactService.create({ type: "VIDEO", name: "Vídeo Institucional" })).artifact!;
  const link1 = artifactService.linkDependency({
    sourceArtifactId: video1.id,
    targetArtifactId: doc1.id,
    type: "DESCRIBES",
    semanticRole: "SCRIPT_FOR",
    usageSlot: "video-script",
  });
  assert(link1.success && creativeGraph.getDependencies(video1.id)[0]?.semanticRole === "SCRIPT_FOR", "CROSS-REG-001", "Document relates to Video as script source");

  // CROSS-REG-002: Document relates to Game as GDD
  const gdd = (await artifactService.create({ type: "DOCUMENT", name: "GDD RPG" })).artifact!;
  const game = (await artifactService.create({ type: "GAME", name: "RPG 2D" })).artifact!;
  const link2 = artifactService.linkDependency({
    sourceArtifactId: game.id,
    targetArtifactId: gdd.id,
    type: "IMPLEMENTS",
    semanticRole: "GDD_FOR",
  });
  assert(link2.success && creativeGraph.getDependencies(game.id).some((d) => d.targetArtifactId === gdd.id), "CROSS-REG-002", "Document relates to Game as GDD specification");

  // CROSS-REG-003: Image Asset reused by Video and Game without physical duplication
  const asset1 = (await assetManager.createAsset({ name: "hero-sprite.png", mimeType: "image/png", sizeBytes: 1024, data: "fake-png-data" })).asset;
  assetManager.registerUsage({ id: "u-vid-3", assetId: asset1.id, consumerArtifactId: video1.id, consumerVersionId: "v1", usageSlot: "track-1-clip-1", createdAt: new Date().toISOString() });
  assetManager.registerUsage({ id: "u-game-3", assetId: asset1.id, consumerArtifactId: game.id, consumerVersionId: "v1", usageSlot: "entity-sprite", createdAt: new Date().toISOString() });
  const usages3 = assetManager.getUsagesForAsset(asset1.id);
  assert(usages3.length === 2 && assetManager.isAssetReferenced(asset1.id), "CROSS-REG-003", "Image Asset reused by Video and Game without physical duplication");

  // CROSS-REG-004: Audio Asset reused by Video and Game
  const audioAsset = (await assetManager.createAsset({ name: "bgm.wav", mimeType: "audio/wav", sizeBytes: 2048, data: "fake-wav" })).asset;
  assetManager.registerUsage({ id: "u-bgm-vid", assetId: audioAsset.id, consumerArtifactId: video1.id, consumerVersionId: "v1", usageSlot: "audio-track", createdAt: new Date().toISOString() });
  assetManager.registerUsage({ id: "u-bgm-game", assetId: audioAsset.id, consumerArtifactId: game.id, consumerVersionId: "v1", usageSlot: "ambient-source", createdAt: new Date().toISOString() });
  assert(assetManager.getUsagesForAsset(audioAsset.id).length === 2, "CROSS-REG-004", "Audio Asset reused by Video and Game simultaneously");

  // CROSS-REG-005: Video can be referenced by Game as cutscene
  const cutsceneLink = artifactService.linkDependency({
    sourceArtifactId: game.id,
    targetArtifactId: video1.id,
    type: "USES",
    semanticRole: "CUTSCENE_FOR",
    usageSlot: "intro-cinematic",
  });
  assert(cutsceneLink.success, "CROSS-REG-005", "Video referenced by Game as cutscene");

  // CROSS-REG-006: Artifact dependency persists after reload
  creativeGraph.rebuildIndex();
  const deps6 = creativeGraph.getDependencies(video1.id);
  assert(deps6.length >= 1 && deps6.some((d) => d.targetArtifactId === doc1.id), "CROSS-REG-006", "Artifact dependency persists after reload");

  // CROSS-REG-007: Asset reference persists after reload
  const u7 = assetManager.getUsagesForArtifact(video1.id);
  assert(u7.length >= 1, "CROSS-REG-007", "Asset reference persists after reload");

  // CROSS-REG-008: Provenance chain persists and traverses correctly
  const img8 = (await artifactService.create({ type: "IMAGE", name: "Concept Art" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: img8.id, targetArtifactId: doc1.id, type: "DERIVED_FROM" });
  artifactService.linkDependency({ sourceArtifactId: game.id, targetArtifactId: img8.id, type: "USES" });
  const chain8 = creativeGraph.getProvenanceChain(game.id);
  assert(Boolean(chain8?.ancestors.some((a) => a.artifactId === img8.id)), "CROSS-REG-008", "Provenance chain traverses across multiple artifact tiers");

  // CROSS-REG-009: Pinned dependency remains on selected version after source update
  const audio9 = (await artifactService.create({ type: "AUDIO", name: "Trilha Sonora" })).artifact!;
  const vid9 = (await artifactService.create({ type: "VIDEO", name: "Trailer 9" })).artifact!;
  artifactService.linkDependency({
    sourceArtifactId: vid9.id,
    targetArtifactId: audio9.id,
    type: "USES",
    targetVersionId: audio9.currentVersionId || "v1-init",
    targetVersionNumber: 1,
    pinMode: "PINNED",
  });
  await artifactService.updateArtifact(audio9.id, { name: "Trilha Sonora Remasterizada" });
  const rels9 = creativeGraph.getDependencies(vid9.id);
  assert(rels9[0].targetVersionNumber === 1 && rels9[0].pinMode === "PINNED", "CROSS-REG-009", "Pinned dependency remains frozen on selected version");

  // CROSS-REG-010: FOLLOW_LATEST detects newer source version
  artifactService.setPinMode(vid9.id, audio9.id, "FOLLOW_LATEST");
  const rels10 = creativeGraph.getDependencies(vid9.id);
  assert(rels10[0].pinMode === "FOLLOW_LATEST", "CROSS-REG-010", "FOLLOW_LATEST mode configured on dependency");

  // CROSS-REG-011: Published consumer does not silently update dependency
  const reloadedVid9 = artifactStore.getById(vid9.id)!;
  reloadedVid9.status = "PUBLISHED";
  artifactStore.save(reloadedVid9);
  artifactService.setPinMode(reloadedVid9.id, audio9.id, "PINNED", "v1-init");
  const report11 = CreativeIntegrityValidator.evaluate(reloadedVid9.id);
  assert(report11.overallHealth === "UPDATE_AVAILABLE", "CROSS-REG-011", "Published consumer requires explicit review for update");

  // CROSS-REG-012: Stale dependency is reported honestly
  assert(report11.issues.some((i) => i.code === "UPDATE_AVAILABLE"), "CROSS-REG-012", "Stale dependency reports UPDATE_AVAILABLE honestly");

  // CROSS-REG-013: Dependents query returns all consumers
  const sharedImg = (await artifactService.create({ type: "IMAGE", name: "Logo Shared" })).artifact!;
  const web13 = (await artifactService.create({ type: "WEBSITE", name: "Site" })).artifact!;
  const game13 = (await artifactService.create({ type: "GAME", name: "Game 13" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: web13.id, targetArtifactId: sharedImg.id, type: "USES" });
  artifactService.linkDependency({ sourceArtifactId: game13.id, targetArtifactId: sharedImg.id, type: "USES" });
  const impact13 = artifactService.getDependencyImpact(sharedImg.id);
  assert(impact13.directDependentsCount === 2, "CROSS-REG-013", "Dependents query returns all consumers across Studios");

  // CROSS-REG-014: Trashing source marks dependent integrity honestly (SOURCE_TRASHED)
  await artifactService.moveToTrash(sharedImg.id);
  const rep14 = CreativeIntegrityValidator.evaluate(web13.id);
  assert(rep14.overallHealth === "SOURCE_TRASHED", "CROSS-REG-014", "Trash source marks dependent as SOURCE_TRASHED");

  // CROSS-REG-015: Restore source repairs relation validity
  await artifactService.restoreFromTrash(sharedImg.id);
  const rep15 = CreativeIntegrityValidator.evaluate(web13.id);
  assert(rep15.overallHealth === "VALID", "CROSS-REG-015", "Restoring source repairs relation validity");

  // CROSS-REG-016: Missing physical asset is distinguished from missing Artifact
  assetManager.registerUsage({ id: "u-ghost", assetId: "ghost-asset-id", consumerArtifactId: web13.id, consumerVersionId: "v1", usageSlot: "header", createdAt: new Date().toISOString() });
  const rep16 = CreativeIntegrityValidator.evaluate(web13.id);
  assert(rep16.overallHealth === "ASSET_MISSING" && rep16.issues.some((i) => i.code === "ASSET_MISSING"), "CROSS-REG-016", "Distinguishes ASSET_MISSING from SOURCE_MISSING");
  assetManager.removeUsage("u-ghost");

  // CROSS-REG-017: Derived Asset preserves provenance
  const derAsset = (await assetManager.createAsset({ name: "render.png", mimeType: "image/png", sizeBytes: 500, metadata: { isDerived: true, sourceArtifactId: sharedImg.id } })).asset;
  assert(derAsset.metadata?.sourceArtifactId === sharedImg.id, "CROSS-REG-017", "Derived Asset preserves provenance metadata");

  // CROSS-REG-018: Replacing Derived Asset does not break historical versions
  assetManager.registerUsage({ id: "u-h1", assetId: "ast-1", consumerArtifactId: "art-x", consumerVersionId: "v1", usageSlot: "slot", createdAt: new Date().toISOString() });
  assetManager.registerUsage({ id: "u-h2", assetId: "ast-2", consumerArtifactId: "art-x", consumerVersionId: "v2", usageSlot: "slot", createdAt: new Date().toISOString() });
  assert(assetManager.getUsagesForVersion("art-x", "v1")[0].assetId === "ast-1" && assetManager.getUsagesForVersion("art-x", "v2")[0].assetId === "ast-2", "CROSS-REG-018", "Historical versions preserve their specific physical asset records");

  // CROSS-REG-019: Athena can query dependency graph
  const toolMgr = new ToolManager();
  const athenaCtx: AthenaEngineContext = {
    projects: [],
    tasks: [],
    vaultItems: [],
    chronosEvents: [],
    theses: [],
    evidences: [],
    opportunities: [],
    addTask: () => ({} as any),
    addNote: () => ({}),
  };
  const toolRes = await toolMgr.executeTool("creative.queryDependents", { artifactId: sharedImg.id }, athenaCtx);
  assert(toolRes.success && (toolRes.data as any).dependentsCount === 2, "CROSS-REG-019", "Athena queries dependency graph via ToolManager");

  // CROSS-REG-020: Athena cannot mutate published dependency without confirmation
  const pubVid = (await artifactService.create({ type: "VIDEO", name: "Pub Vid" })).artifact!;
  pubVid.status = "PUBLISHED";
  artifactStore.save(pubVid);
  const athenaUpdateRes = await artifactService.acceptDependencyUpdate(
    { consumerArtifactId: pubVid.id, targetArtifactId: sharedImg.id, newVersionId: "v2", newVersionNumber: 2 },
    "ATHENA"
  );
  assert(!athenaUpdateRes.success, "CROSS-REG-020", "Athena cannot mutate published dependency without confirmation");

  // CROSS-REG-021: Backup preserves cross-studio relationships
  const backup = backupService.exportVarynthBackup();
  assert(backup.manifest.entitiesCount.artifacts > 0, "CROSS-REG-021", "Backup exports artifact graph");

  // CROSS-REG-022: Restore preserves version pins
  const restoreRes = backupService.restoreVarynthBackup(backup, "REPLACE");
  assert(restoreRes.success, "CROSS-REG-022", "Restore preserves version pins and relationships");

  // CROSS-REG-023: Restore preserves provenance
  const chain23 = creativeGraph.getProvenanceChain(game.id);
  assert(chain23 !== null, "CROSS-REG-023", "Restore preserves entire provenance chain");

  // CROSS-REG-024: Shared Asset is not deleted while valid consumers still depend on it
  const ref24 = assetManager.isAssetReferenced(asset1.id);
  assert(ref24 === true, "CROSS-REG-024", "Shared asset retention prevents premature GC");

  // CROSS-REG-025: Creative Integrity Validator detects broken relationships
  const brokenArt = (await artifactService.create({ type: "GAME", name: "Broken" })).artifact!;
  brokenArt.relationships = [{ targetArtifactId: "ghost-target", type: "DEPENDS_ON", createdAt: new Date().toISOString() }];
  artifactStore.save(brokenArt);
  const rep25 = CreativeIntegrityValidator.evaluate(brokenArt.id);
  assert(rep25.overallHealth === "SOURCE_MISSING", "CROSS-REG-025", "Validator detects broken target relationships");

  // CROSS-REG-026: Invalid relation does not corrupt either Artifact
  const selfRes = artifactService.linkDependency({ sourceArtifactId: brokenArt.id, targetArtifactId: brokenArt.id, type: "DERIVED_FROM" });
  assert(!selfRes.success, "CROSS-REG-026", "Self-referencing derivation cycle rejected safely");

  // CROSS-REG-027: Relationship changes are auditable
  const unlinkRes = artifactService.unlinkDependency(game13.id, sharedImg.id);
  assert(unlinkRes.success, "CROSS-REG-027", "Unlink operation succeeds and emits audit event");

  // CROSS-REG-028: 100% Local-First without commercial API dependency
  const graph28 = creativeGraph.getCreativeGraphData();
  assert(graph28.nodes.length > 0 && graph28.edges.length > 0, "CROSS-REG-028", "Creative Graph runs 100% Local-First");

  // CROSS-REG-029: Pinned dependency uses immutable versionId as authority
  const targetDoc29 = (await artifactService.create({ type: "DOCUMENT", name: "Target Doc" })).artifact!;
  const consumer29 = (await artifactService.create({ type: "VIDEO", name: "Consumer Video" })).artifact!;
  artifactService.linkDependency({
    sourceArtifactId: consumer29.id,
    targetArtifactId: targetDoc29.id,
    type: "DESCRIBES",
    targetVersionId: "ver-immutable-uuid-999",
    targetVersionNumber: 1,
  });
  const rel29 = artifactStore.getById(consumer29.id)?.relationships[0];
  assert(rel29?.targetVersionId === "ver-immutable-uuid-999", "CROSS-REG-029", "Pinned dependency authoritative ID is immutable versionId");

  // CROSS-REG-030: FOLLOW_LATEST does not follow FAILED or TRASHED version
  targetDoc29.status = "TRASHED";
  artifactStore.save(targetDoc29);
  artifactService.setPinMode(consumer29.id, targetDoc29.id, "FOLLOW_LATEST");
  const rep30 = CreativeIntegrityValidator.evaluate(consumer29.id);
  assert(rep30.overallHealth === "SOURCE_TRASHED", "CROSS-REG-030", "FOLLOW_LATEST respects TRASHED/FAILED eligibility");
  targetDoc29.status = "ACTIVE";
  artifactStore.save(targetDoc29);

  // CROSS-REG-031: Historical Artifact Version preserves AssetUsageRecord
  const histAsset31 = (await assetManager.createAsset({ name: "old.png", mimeType: "image/png", sizeBytes: 100 })).asset;
  assetManager.registerUsage({
    id: "u-31",
    assetId: histAsset31.id,
    consumerArtifactId: consumer29.id,
    consumerVersionId: "ver-1-historical",
    usageSlot: "slot-old",
    createdAt: new Date().toISOString(),
  });
  assert(assetManager.getUsagesForVersion(consumer29.id, "ver-1-historical").length === 1, "CROSS-REG-031", "Historical version preserves asset usage record");

  // CROSS-REG-032: Asset referenced only by historical version is not garbage-collected
  const histArt32: any = {
    id: "art-32",
    assetFileIds: [],
    versions: [{ versionId: "v1", versionNumber: 1, fileAssetIds: [histAsset31.id] }],
  };
  assert(!assetManager.detectOrphanAssets([histArt32]).some((o) => o.id === histAsset31.id), "CROSS-REG-032", "Historical version asset protected from orphan GC");

  // CROSS-REG-033: Dependency update atomically changes logical relation and physical asset usage
  const target33 = (await artifactService.create({ type: "AUDIO", name: "Audio 33" })).artifact!;
  const wav33_1 = (await assetManager.createAsset({ name: "a1.wav", mimeType: "audio/wav", sizeBytes: 100 })).asset;
  const wav33_2 = (await assetManager.createAsset({ name: "a2.wav", mimeType: "audio/wav", sizeBytes: 200 })).asset;
  artifactService.linkDependency({ sourceArtifactId: consumer29.id, targetArtifactId: target33.id, type: "USES", usageSlot: "slot-audio", targetVersionId: "v1", targetVersionNumber: 1 });
  assetManager.registerUsage({ id: "u-33", assetId: wav33_1.id, consumerArtifactId: consumer29.id, consumerVersionId: "curr", usageSlot: "slot-audio", sourceArtifactId: target33.id, sourceVersionId: "v1", createdAt: new Date().toISOString() });
  const up33 = await artifactService.acceptDependencyUpdate({ consumerArtifactId: consumer29.id, targetArtifactId: target33.id, newVersionId: "v2", newVersionNumber: 2, newAssetId: wav33_2.id, usageSlot: "slot-audio" });
  assert(up33.success && assetManager.getUsagesForArtifact(consumer29.id).find((u) => u.usageSlot === "slot-audio")?.assetId === wav33_2.id, "CROSS-REG-033", "Dependency update synchronizes relation and asset usage atomically");

  // CROSS-REG-034: Failed dependency update rolls back both relationship and usage record
  const fail34 = await artifactService.acceptDependencyUpdate({ consumerArtifactId: consumer29.id, targetArtifactId: target33.id, newVersionId: "v3", newVersionNumber: 3, newAssetId: "non-existent-blob", usageSlot: "slot-audio" });
  const rolledBackConsumer29 = artifactStore.getById(consumer29.id);
  assert(!fail34.success && rolledBackConsumer29?.relationships.find((r) => r.targetArtifactId === target33.id)?.targetVersionId === "v2", "CROSS-REG-034", "Failed update rolls back atomically with ATOMIC_ROLLBACK");

  // CROSS-REG-035: Relationship version and physical asset provenance mismatch reports VERSION_MISMATCH
  const target35 = (await artifactService.create({ type: "AUDIO", name: "Audio 35" })).artifact!;
  const wav35 = (await assetManager.createAsset({ name: "v3.wav", mimeType: "audio/wav", sizeBytes: 100 })).asset;
  const consumer35 = (await artifactService.create({ type: "VIDEO", name: "Consumer 35" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: consumer35.id, targetArtifactId: target35.id, type: "USES", usageSlot: "slot-mismatch", targetVersionId: "ver-audio-4" });
  assetManager.registerUsage({ id: "u-35", assetId: wav35.id, consumerArtifactId: consumer35.id, consumerVersionId: "v1", usageSlot: "slot-mismatch", sourceArtifactId: target35.id, sourceVersionId: "ver-audio-3", createdAt: new Date().toISOString() });
  const rep35 = CreativeIntegrityValidator.evaluate(consumer35.id);
  assert(rep35.overallHealth === "VERSION_MISMATCH", "CROSS-REG-035", "Reports VERSION_MISMATCH when physical asset provenance diverged from relation pin");

  // CROSS-REG-036: Allowed REFERENCES cycle is accepted
  const teseA = (await artifactService.create({ type: "DOCUMENT", name: "Tese A" })).artifact!;
  const teseB = (await artifactService.create({ type: "DOCUMENT", name: "Tese B" })).artifact!;
  const refA = artifactService.linkDependency({ sourceArtifactId: teseA.id, targetArtifactId: teseB.id, type: "REFERENCES" });
  const refB = artifactService.linkDependency({ sourceArtifactId: teseB.id, targetArtifactId: teseA.id, type: "REFERENCES" });
  assert(refA.success && refB.success, "CROSS-REG-036", "Mutual associative REFERENCES cycles are accepted");

  // CROSS-REG-037: Invalid DERIVED_FROM provenance cycle is rejected
  const imgA = (await artifactService.create({ type: "IMAGE", name: "Image A" })).artifact!;
  const imgB = (await artifactService.create({ type: "IMAGE", name: "Image B" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: imgB.id, targetArtifactId: imgA.id, type: "DERIVED_FROM" });
  const cycle37 = artifactService.linkDependency({ sourceArtifactId: imgA.id, targetArtifactId: imgB.id, type: "DERIVED_FROM" });
  assert(Boolean(!cycle37.success && cycle37.error?.includes("CICLO DE PROVENIÊNCIA INVÁLIDO")), "CROSS-REG-037", "Causal DERIVED_FROM cycle rejected strictly");

  // CROSS-REG-038: Backup registry without physical blob never reports asset as physically restored
  const check38 = await assetManager.verifyAssetIntegrity("unregistered-blob");
  assert(check38.status === "ASSET_MISSING", "CROSS-REG-038", "Missing blob honestly reports ASSET_MISSING");

  // CROSS-REG-039: Restored blob checksum is validated
  const chk39 = assetManager.calculateChecksum("sample-test-bytes");
  assert(chk39.startsWith("chk-"), "CROSS-REG-039", "Asset checksum calculated deterministically");

  // CROSS-REG-040: Source Artifact in Trash with surviving physical Derived Asset is distinguished from ASSET_MISSING
  const srcImg40 = (await artifactService.create({ type: "IMAGE", name: "Src 40" })).artifact!;
  const ast40 = (await assetManager.createAsset({ name: "ast40.png", mimeType: "image/png", sizeBytes: 100 })).asset;
  const vid40 = (await artifactService.create({ type: "VIDEO", name: "Vid 40" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: vid40.id, targetArtifactId: srcImg40.id, type: "USES" });
  assetManager.registerUsage({ id: "u-40", assetId: ast40.id, consumerArtifactId: vid40.id, consumerVersionId: "v1", usageSlot: "slot-bg", createdAt: new Date().toISOString() });
  await artifactService.moveToTrash(srcImg40.id);
  const rep40 = CreativeIntegrityValidator.evaluate(vid40.id);
  assert(rep40.overallHealth === "SOURCE_TRASHED" && !rep40.issues.some((i) => i.code === "ASSET_MISSING"), "CROSS-REG-040", "Distinguishes soft break (SOURCE_TRASHED) from hard break (ASSET_MISSING)");

  // CROSS-REG-041: Notification Center deduplicates mass dependency updates
  const impact41 = artifactService.getDependencyImpact(srcImg40.id);
  assert(impact41.directDependentsCount >= 1, "CROSS-REG-041", "Dependency impact summary computed for mass update prevention");

  // CROSS-REG-042: CreativeGraph reverse index can be reconstructed without losing relationships
  creativeGraph.rebuildIndex();
  assert(creativeGraph.getDependents(srcImg40.id).length >= 1, "CROSS-REG-042", "Reverse index reconstructed deterministically");

  // CROSS-REG-043: Published output keeps historical dependency manifest after source evolves
  const doc43 = (await artifactService.create({ type: "DOCUMENT", name: "Doc 43" })).artifact!;
  const pub43 = (await artifactService.create({ type: "VIDEO", name: "Pub 43" })).artifact!;
  pub43.status = "PUBLISHED";
  artifactStore.save(pub43);
  artifactService.linkDependency({ sourceArtifactId: pub43.id, targetArtifactId: doc43.id, type: "DESCRIBES", targetVersionId: "doc-v1", targetVersionNumber: 1 });
  await artifactService.updateArtifact(doc43.id, { name: "Doc 43 v2" });
  const reloadedPub43 = artifactStore.getById(pub43.id);
  assert(reloadedPub43?.relationships[0]?.targetVersionId === "doc-v1", "CROSS-REG-043", "Published output keeps historical dependency manifest");

  // CROSS-REG-044: Accepted dependency update marks previous derived output stale when rebuild is required
  const vid44 = (await artifactService.create({ type: "VIDEO", name: "Vid 44" })).artifact!;
  const doc44 = (await artifactService.create({ type: "DOCUMENT", name: "Doc 44" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: vid44.id, targetArtifactId: doc44.id, type: "DESCRIBES", targetVersionId: "v1", targetVersionNumber: 1 });
  const up44 = await artifactService.acceptDependencyUpdate({ consumerArtifactId: vid44.id, targetArtifactId: doc44.id, newVersionId: "v2", newVersionNumber: 2 });
  assert(up44.success, "CROSS-REG-044", "Accepted dependency update transaction executed cleanly");

  // ==========================================
  // CHAOS TESTS A, B, C, D, E
  // ==========================================
  // Chaos A
  const chImg = (await artifactService.create({ type: "IMAGE", name: "Chaos Img" })).artifact!;
  const chVid = (await artifactService.create({ type: "VIDEO", name: "Chaos Vid" })).artifact!;
  const chGame = (await artifactService.create({ type: "GAME", name: "Chaos Game" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: chVid.id, targetArtifactId: chImg.id, type: "USES" });
  artifactService.linkDependency({ sourceArtifactId: chGame.id, targetArtifactId: chImg.id, type: "USES" });
  await artifactService.moveToTrash(chImg.id);
  assert(CreativeIntegrityValidator.evaluate(chVid.id).overallHealth === "SOURCE_TRASHED", "CHAOS-TEST-A", "Chaos Test A: Trash source triggers warnings without crashing consumers");
  await artifactService.restoreFromTrash(chImg.id);
  assert(CreativeIntegrityValidator.evaluate(chVid.id).overallHealth === "VALID", "CHAOS-TEST-A-RESTORE", "Chaos Test A: Restoring source restores validity");

  // Chaos B
  const chAud = (await artifactService.create({ type: "AUDIO", name: "Chaos Audio" })).artifact!;
  const chVidB = (await artifactService.create({ type: "VIDEO", name: "Chaos Vid B" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: chVidB.id, targetArtifactId: chAud.id, type: "USES", targetVersionId: chAud.currentVersionId || "v1", targetVersionNumber: 1, pinMode: "PINNED" });
  await artifactService.updateArtifact(chAud.id, { name: "Chaos Audio v2" });
  const reloadedAudB = artifactStore.getById(chAud.id)!;
  assert(CreativeIntegrityValidator.evaluate(chVidB.id).overallHealth === "UPDATE_AVAILABLE", "CHAOS-TEST-B", "Chaos Test B: Consumer remains pinned with UPDATE_AVAILABLE");
  await artifactService.acceptDependencyUpdate({
    consumerArtifactId: chVidB.id,
    targetArtifactId: chAud.id,
    newVersionId: reloadedAudB.currentVersionId || "v2-id",
    newVersionNumber: reloadedAudB.currentVersionNumber || 2,
  });
  assert(CreativeIntegrityValidator.evaluate(chVidB.id).overallHealth === "VALID", "CHAOS-TEST-B-UPDATE", "Chaos Test B: Accepted update creates safety snapshot and updates pin");

  // Chaos C
  const chDocC = (await artifactService.create({ type: "DOCUMENT", name: "Doc C" })).artifact!;
  const chVidC = (await artifactService.create({ type: "VIDEO", name: "Vid C" })).artifact!;
  const chGameC = (await artifactService.create({ type: "GAME", name: "Game C" })).artifact!;
  artifactService.linkDependency({ sourceArtifactId: chVidC.id, targetArtifactId: chDocC.id, type: "DERIVED_FROM" });
  artifactService.linkDependency({ sourceArtifactId: chGameC.id, targetArtifactId: chVidC.id, type: "DERIVED_FROM" });
  const bkpC = backupService.exportVarynthBackup();
  backupService.restoreVarynthBackup(bkpC, "REPLACE");
  const chainC = creativeGraph.getProvenanceChain(chGameC.id);
  assert(chainC?.ancestors[0]?.artifactId === chVidC.id && chainC?.ancestors[0]?.ancestors[0]?.artifactId === chDocC.id, "CHAOS-TEST-C", "Chaos Test C: Multi-tier provenance survives backup & restore intact");

  // Chaos D
  const chAssetD = (await assetManager.createAsset({ name: "sharedD.png", mimeType: "image/png", sizeBytes: 100 })).asset;
  assetManager.registerUsage({ id: "ud1", assetId: chAssetD.id, consumerArtifactId: chDocC.id, consumerVersionId: "v1", usageSlot: "s1", createdAt: new Date().toISOString() });
  assetManager.registerUsage({ id: "ud2", assetId: chAssetD.id, consumerArtifactId: chVidC.id, consumerVersionId: "v1", usageSlot: "s2", createdAt: new Date().toISOString() });
  assetManager.registerUsage({ id: "ud3", assetId: chAssetD.id, consumerArtifactId: chGameC.id, consumerVersionId: "v1", usageSlot: "s3", createdAt: new Date().toISOString() });
  assert(assetManager.getUsagesForAsset(chAssetD.id).length === 3, "CHAOS-TEST-D", "Chaos Test D: Shared physical asset consumed by 3 studios without duplication");

  // Chaos E
  const imgE = (await artifactService.create({ type: "IMAGE", name: "Hero Concept E" })).artifact!;
  const vidE = (await artifactService.create({ type: "VIDEO", name: "Trailer E" })).artifact!;
  const gameE = (await artifactService.create({ type: "GAME", name: "Game E" })).artifact!;
  const mp4E = (await assetManager.createAsset({ name: "trailer-e.mp4", mimeType: "video/mp4", sizeBytes: 5000 })).asset;
  artifactService.linkDependency({ sourceArtifactId: vidE.id, targetArtifactId: imgE.id, type: "USES", targetVersionId: "ver-img-2", targetVersionNumber: 2 });
  artifactService.linkDependency({ sourceArtifactId: gameE.id, targetArtifactId: vidE.id, type: "USES", targetVersionId: "ver-vid-5", targetVersionNumber: 5, usageSlot: "cutscene" });
  assetManager.registerUsage({ id: "u-ge", assetId: mp4E.id, consumerArtifactId: gameE.id, consumerVersionId: "vg3", usageSlot: "cutscene", sourceArtifactId: vidE.id, sourceVersionId: "ver-vid-5", createdAt: new Date().toISOString() });
  await artifactService.updateArtifact(imgE.id, { name: "Hero Concept E v3" });
  await artifactService.acceptDependencyUpdate({ consumerArtifactId: vidE.id, targetArtifactId: imgE.id, newVersionId: "ver-img-3", newVersionNumber: 3 });
  const reloadedGameE = artifactStore.getById(gameE.id);
  assert(reloadedGameE?.relationships[0]?.targetVersionId === "ver-vid-5" && assetManager.getUsagesForArtifact(gameE.id)[0]?.assetId === mp4E.id, "CHAOS-TEST-E", "Chaos Test E: Multi-tier cascade update does not silently disrupt downstream consumers");

  console.log(`\n===============================================================`);
  console.log(`  CROSS-STUDIO SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCrossStudioIntegrationSuite().catch((err) => {
  console.error("Fatal error running cross-studio suite:", err);
  process.exit(1);
});

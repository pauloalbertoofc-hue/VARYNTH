import { strict as assert } from "node:assert";
import { assertVisualDocument, imageFromVisualDocument, migrateVisualDocument, visualDocumentFromImage } from "./contracts";

const image = {
  artifactId: "img-1",
  canvas: { width: 800, height: 600, background: "#000" },
  layers: [{ id: "layer-1", type: "TEXT" as const, name: "Title", visible: true, locked: false, opacity: 1, transform: { x: 0, y: 0, width: 100, height: 40, scaleX: 1, scaleY: 1, rotation: 0 }, textContent: "Hello" }],
  selectedLayerIds: ["layer-1"],
  updatedAt: "2026-10-11T00:00:00.000Z",
};

const document = visualDocumentFromImage(image);
assertVisualDocument(document);
assert.equal(document.schemaVersion, 1);
assert.equal(document.objects[0].kind, "TEXT");
assert.equal(document.dimensions.width, 800);
const roundTrip = imageFromVisualDocument(document);
assert.equal(roundTrip.artifactId, image.artifactId);
assert.equal(roundTrip.layers[0].textContent, "Hello");
assert.equal(migrateVisualDocument(image).id, "img-1");
assert.throws(() => migrateVisualDocument({ schema: "future" }), /UNSUPPORTED_VISUAL_DOCUMENT_MIGRATION/);
assert.throws(() => assertVisualDocument({ ...document, schemaVersion: 99 }), /UNSUPPORTED_VISUAL_DOCUMENT_SCHEMA/);
console.log("Visual Core contract tests passed: schema, migration and rejection.");


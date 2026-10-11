import { strict as assert } from "node:assert";
import { assetIdentityKey, validateAssetRef } from "./asset-engine";

const source = { id: "asset-1", name: "original.jpg", mimeType: "image/jpeg", sizeBytes: 100, role: "SOURCE" as const, immutable: true, contentHash: "abc", metadata: {} };
assert.equal(validateAssetRef(source).valid, true);
assert.equal(assetIdentityKey(source), "image/jpeg:100:abc");
assert.equal(validateAssetRef({ ...source, immutable: false }).error, "SOURCE_ASSET_MUST_BE_IMMUTABLE");
console.log("Asset engine tests passed: identity and immutable source validation.");


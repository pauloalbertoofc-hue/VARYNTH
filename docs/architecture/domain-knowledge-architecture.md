# Domain Knowledge Architecture

## Current implementation boundary

The transversal knowledge layer extends the existing Vault and local persistence. It does not replace Vault, Athena, the agent registry, or the Experience Layer.

The first slice provides:

- `DomainRegistry` with hierarchical resolution, owners, specialists, capabilities, and related domains;
- `KnowledgeItem` with explicit kind, assertion, visibility, sensitivity, provenance, version, and freshness;
- a service-owned `knowledge_items` persistence store using the existing IndexedDB/memory fallback;
- fail-closed access decisions for private agent, project, and public-agent scopes;
- local query filtering by domain, project, and text.

## Existing boundaries preserved

- Athena remains the conversational/orchestration identity; the registry is a compact map, not universal context.
- Vault remains the user-facing repository and keeps its existing taxonomy and account scoping.
- Experience remains separate from knowledge, preference, and policy.
- Agents do not access persistence directly; the knowledge service owns reads and writes.
- No vector database or graph database is required for this foundation.

## Delivery sequence

1. Domain registry and contracts (implemented).
2. Knowledge item and provenance persistence (implemented).
3. Policy and local retrieval (implemented).
4. Vault classification adapter and migration-safe backfill.
5. Public knowledge contracts and capability discovery through Athena.
6. Domain router, multi-domain decomposition, and knowledge packets.
7. Knowledge Center UI and inspectors.
8. Cache invalidation, conflict/version views, adversarial tests, and production validation.

## Verification

The foundation is covered by `src/lib/knowledge/service.test.ts`. The repository typecheck and this focused regression must pass before advancing to Vault integration.

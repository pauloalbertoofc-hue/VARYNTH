# Domain Knowledge Architecture

## Current implementation boundary

The transversal knowledge layer extends the existing Vault and local persistence. It does not replace Vault, Athena, the agent registry, or the Experience Layer.

The implemented foundation provides:

- `DomainRegistry` with hierarchical resolution, owners/co-owners, specialists, capabilities, related domains, and administrator-managed routing terms/priorities;
- `KnowledgeItem` with explicit kind, assertion, visibility, sensitivity, provenance, version, and freshness;
- browser-local Knowledge persistence plus authenticated, account-scoped server snapshots for remote routes (Redis on Vercel; fail-closed when unavailable);
- fail-closed access decisions for private agent, project, and public-agent scopes;
- opt-in public capability contracts with explicit input/output and consumer lists; registered capabilities are not automatically advertised;
- query filtering by domain, category (the existing item-level subcategory taxonomy), project, and text, with corpus-aware lexical relevance (term frequency and inverse document frequency), title, and tag signals; access policy is independently evaluated before results are returned;
- Vault projection with canonical server-side policy fields, immutable revisions, revocation, persisted user-corrected semantic taxonomy, and explicit source-backed owner/visibility/sensitivity.

## Existing boundaries preserved

- Athena remains the conversational/orchestration identity; the registry is a compact map, not universal context.
- Vault remains the user-facing repository and keeps its existing taxonomy and account scoping.
- Experience remains separate from knowledge, preference, and policy.
- Agents do not access persistence directly; the knowledge service owns reads and writes.
- No vector database or graph database is required for this foundation.

## Delivery sequence

1. Domain registry and contracts (implemented).
2. Knowledge item and provenance persistence (implemented).
3. Policy and local retrieval (implemented; structured domain/category/project filters and weighted lexical ranking; hybrid semantic retrieval remains future work).
4. Vault classification adapter and migration-safe backfill (implemented; taxonomy corrections persist on the source item).
5. Public knowledge contracts and capability discovery through Athena (explicit per-capability allowlist and consumer contract; discovery does not imply a generic executable adapter, and not every proposed capability is wired).
6. Domain router, multi-domain decomposition, and bounded knowledge packets (implemented incrementally; routes are derived from registry routing terms/priorities, expose matching evidence and all matched-domain specialists, and knowledge/experience share the context item budget; Euterpe and Justitia expose explicit, source-only consultation methods, not neural domain reasoning).
7. Knowledge Center UI and inspectors (implemented for registry, retrieval, classification, owner/domain reassignment, Vault-backed visibility and sensitivity, publication, revocation, conflicts, audit, and persistence state; public-agent exposure still uses the dedicated publication flow).
8. Cache invalidation, conflict/version views, adversarial tests (implemented incrementally); multi-instance load testing and authenticated production end-to-end validation remain open.

## Verification

The Knowledge subsystem regression suite is `npm run test:knowledge`; governance-specific coverage also lives in `src/lib/knowledge/update.test.ts` and `src/lib/knowledge/vault-sync.test.ts`. Repository-wide typecheck currently depends on the installed optional Capacitor package used elsewhere in the app.

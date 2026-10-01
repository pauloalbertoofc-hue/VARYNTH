# VARYNTH Experience & Learning Layer — Architecture Map

Status: CORE IMPLEMENTED; ECOSYSTEM-WIDE EVENT INTEGRATION AND VALIDATION REMAIN IN PROGRESS
Last audited: 2026-10-01

This document replaces the initial Milestone A-only snapshot. The Experience Layer is no longer architecture-only: its local contracts, persistence, evidence pipeline, account-scoped controls, selected adapters, and first consumers exist. It is not yet a completed transversal layer for every module or provider.

## Current architecture

```text
App / Athena / Knowledge / Music / selected Studio adapters
        -> ExperienceEvent (validated, account-owned, scoped, deduplicated)
        -> policy and user exclusion checks
        -> evidence signals and candidate thresholds
        -> Preference / Experience / Outcome with provenance
        -> scope-filtered, budgeted ExperienceContext
        -> selected Athena-local-model and Knowledge specialist consumers

Experience Center (/modules/experience)
        -> inspect local records, review candidates, declare preferences,
           exclude learning scopes, forget records, recover selected legacy data,
           and export local data
```

## Existing capabilities and integration boundaries

| Concern | Current implementation | Verified status / remaining limit |
| --- | --- | --- |
| Event contract and persistence | `src/lib/experience/contracts.ts`, `experience-service.ts`, IndexedDB repositories | Typed validation, owner assignment, ID deduplication, size limits, policy and exclusion checks are implemented and tested. |
| Existing event buses | `src/lib/events/varynth-event-bus.ts`; `src/lib/athena/events/event-bus.ts` | Kept separate. There is not yet a general adapter that subscribes all production events into Experience. |
| Feedback and signal evidence | `feedback-service.ts`, `signals.ts`, `preference-candidate-service.ts`, `conversation/experience-feedback-bridge.ts` | Athena's explicit response-quality controls now create account-owned Experience events linked to response/session/agent, while only storing the category and omitting prompt/response text. Passive behavior remains evidence, not an automatic confirmed preference. Other Studios still need equivalent intentional feedback surfaces. |
| Preference and experience lifecycle | `preference-service.ts`, `experience-service.ts`, `pattern-service.ts`, `outcome-service.ts`, `retrospective-service.ts` | Scope, confidence, conflicts/decay, provenance, outcomes, retrospective, and forget cascades have automated tests. |
| Privacy and learning policy | `learning-policy.ts`, `learning-exclusion-service.ts`, `identity.ts` | Account ownership, actor/source eligibility, scoped exclusions, and agent-event safeguards are enforced locally. |
| Retrieval/context budget | `context-builder.ts`, `knowledge/context-assembler.ts`, `athena/runtime/agent-experience-context.ts` | Scope-filtered and bounded packets feed the Knowledge route and are resolved independently immediately before each direct Athena workflow agent executes (8 combined preference/experience records maximum). Account owner, mapped domain, agent, Athena module, active project, and task session constrain retrieval. Only manually confirmed global preferences are shared across specialist domains; inferred global preferences are withheld. Packets carry current-instruction precedence but do not override it automatically. Agent workflows also receive up to six bounded turns from the active in-memory session for reference resolution; agents must not treat assistant turns as evidence. Agent packet delivery is now tested for account isolation. |
| Studio event producers | `audio-learning-adapter.ts`, `game-learning-adapter.ts`, `document-learning-adapter.ts`, `music-learning-adapter.ts` | Audio records scoped editor observations; Music records explicit ratings and per-track visual choices; Game records successful user saves as count-only structural observations; Document records successful user content saves as length-only observations. Image, Video, and Web adapters are absent. These events are evidence only; no automatic preference inference is enabled by these call sites. |
| Experience Center | `src/app/modules/experience/page.tsx`, navigation at `/modules/experience` | Functional local controls include manual preferences, candidate review, confirmation/rejection, learning exclusions, forget, export, and guarded legacy reassociation. It explicitly states that data stays on this device. |
| Cross-device sync and retention | No Experience sync implementation found in the audited route inventory | Not implemented; do not imply that local records follow the account to another device or are subject to a configurable retention scheduler. |
| End-to-end inspector | No event → signal → candidate → retrieval → decision trace UI found | Not implemented. Current UI is a local inventory/control center, not a full developer trace inspector. |

## Non-negotiable boundaries

- No online model training, fine-tuning, embedding-as-source-of-truth, or automatic personality rewriting.
- A candidate is not a confirmed preference. Explicit user declarations outrank inferred candidates.
- Current instruction, project policy, permissions, and data scope outrank historical personalization.
- Agent-generated events are not independent user evidence and are not learning-eligible by default.
- Reads remain bounded and scope-filtered; invalid or unauthorized writes fail closed.
- Local-only storage and absence of cross-device sync must remain visible to the user.

## Milestone status

| Milestone | Status | Evidence / remaining work |
| --- | --- | --- |
| A — audit and architecture map | DONE, refreshed | This map is based on the checked-out implementation and test inventory. |
| B — schemas, events, provenance, persistence | IMPLEMENTED | `npm run test:experience` covers contracts, persistence, ownership, and deduplication. Broader production event sourcing remains open. |
| C — feedback and signals | IMPLEMENTED CORE, ATHENA WIRED | Feedback/signal services, Athena response controls, and privacy-minimal bridge are tested; add intentional feedback entry points to remaining module result surfaces. |
| D — preferences, confidence, scope | IMPLEMENTED CORE | Candidate thresholds, conflict/decay, manual declaration, and scoped resolution are tested. |
| E — experiences, patterns, outcomes | IMPLEMENTED CORE | Services and retrospective tests pass; increase evidence from real completed project workflows. |
| F — retrieval and context builder | IMPLEMENTED, EXPANDING CONSUMERS | Knowledge and local-model Athena consume bounded context; direct workflow agents now receive individually resolved bounded packets. Athena's deterministic dialogue/persona path does not yet consume Experience directly. |
| G — privacy, permissions, learning policy | IMPLEMENTED LOCALLY | Ownership, exclusions, and forget tests pass. Cross-device policy/sync is absent. |
| H — agent integration contract | PARTIAL, CONTEXT DELIVERY WIRED | Knowledge packets and direct workflow agents receive bounded Experience; specialist workflows also receive bounded active-session turns, and shared follow-up resolution has focused Sophia coverage. Per-agent behavioral consumption is not yet universal: most deterministic agents do not yet adapt their domain reasoning from Experience. Local-model/provider coverage and richer per-agent policy tests remain incomplete. |
| I — project experience and retrospective | PARTIAL | Retrospective service exists and is tested; a full project-level user workflow and visible provenance review remain incomplete. |
| J — Experience Center | PARTIAL | `/modules/experience` exposes working local controls; it is not yet a full lifecycle/inspector UI. |
| K — adapters | PARTIAL, EXPANDED | Audio, Music, Game, and Document have confirmed production call sites. The new Game/Document calls run only after successful user saves and exclude raw document text, game scripts, labels, and assets. Image, Video, and Web are not covered. |
| L — forget, export, retention | PARTIAL | Forget cascade and local JSON export exist; scheduled retention and sync-aware deletion are not implemented. |
| M — observability and developer inspector | NOT IMPLEMENTED END TO END | Need a trace joining event, signal, candidate, preference, retrieval, and consuming decision. |
| N/O — performance, automated and adversarial tests | PARTIAL, CORE TESTS PASS | Experience, ownership, exclusion, conflict, forgetting, and candidate adversarial tests pass; production event-volume and cross-module E2E coverage remain. |
| P — docs, migration, production validation | PARTIAL | Core model and learning policy are documented; the complete manual plan, test report, privacy/integration/limitations/changelog deliverables and production walkthrough remain. |

## Verified validation snapshot (2026-09-23)

- `npm run test:experience` — passed, all 21 registered Experience tests.
- Athena intelligence suite — 100/100 passed, including colloquial task queries, project readiness, and post-Studio project reference continuity.
- Athena system suite — 50/50 passed; response-quality suite — 30/30 passed.
- Athena certification — 16/16 passed; TypeScript and full Next production build passed.
- Knowledge/Vault suite — passed after source-addressable Vault chunk changes were integrated.
- Documentation regression inventory at build — 43 routes, 36 tools, 12 agents, 18 modules.
- Production deployment `dpl_B7SAf2GGAJ5tANCTf6KaDSZgxA6a` reached `READY`, received `https://varynth-ynqv-plum.vercel.app`, and `/modules/athena` returned HTTP 200 with the expected unauthenticated redirect to login.

## Next implementation sequence

1. Extend the Athena feedback-to-Experience bridge pattern to remaining Studio result surfaces; persist only deliberate feedback or well-attributed edits.
2. Wire real, scoped Experience producers into each Studio and governed action lifecycle, including cancellation/undo/redo without false causal learning.
3. Make specialist agents explicitly consume only approved Experience fields in their domain reasoning; integrate the same bounded context into Athena's deterministic dialogue/persona path, with instruction/policy precedence and per-consumer isolation tests.
4. Complete the manual test plan, privacy and agent-integration docs, and user-visible explanations/decision traces.
5. Decide and implement sync/retention only with explicit ownership, export, deletion, and conflict semantics; until then keep Experience clearly local-only.
6. Re-run the full regression and cross-module tests, inspect Experience Center behavior, and validate the production alias after each publication.

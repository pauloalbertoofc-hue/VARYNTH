# VARYNTH Experience & Learning Layer — Architecture Map

Status: CORE IMPLEMENTED; ECOSYSTEM-WIDE EVENT INTEGRATION AND VALIDATION REMAIN IN PROGRESS
Last audited: 2026-10-05

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
| Feedback and signal evidence | `feedback-service.ts`, `signals.ts`, `preference-candidate-service.ts`, `conversation/experience-feedback-bridge.ts`, `editor-history-adapter.ts` | Athena's explicit response-quality controls create account-owned events while omitting prompt/response text. Audio/Game/Document/Music adapters fail closed unless user action is attributed. Audio/Game/Image/Video editor Undo/Redo controls now record only after a real history state is returned; immediate undo (<=30s since a successful save) is distinguished from delayed/unknown undo, redo is separate, and event payloads omit document state. These are scoped signals, not preferences. Candidate review re-checks current account exclusions against historical evidence, so pausing a scope also suppresses new hypotheses from previously stored events while preserving those events for audit. |
| Preference and experience lifecycle | `preference-service.ts`, `experience-service.ts`, `pattern-service.ts`, `outcome-service.ts`, `retrospective-service.ts` | Scope, confidence, conflicts/decay, provenance, outcomes, retrospective, and forget cascades have automated tests. The Experience Center can now build a project retrospective from observed account-owned project IDs, with event-linked decisions/changes and useful experiences; unrelated-project and cross-account evidence is excluded. |
| Privacy and learning policy | `learning-policy.ts`, `learning-exclusion-service.ts`, `identity.ts` | Account ownership, actor/source eligibility, scoped exclusions, and agent-event safeguards are enforced locally. |
| Retrieval/context budget | `context-builder.ts`, `knowledge/context-assembler.ts`, `athena/runtime/agent-experience-context.ts`, `athena/agents/experience-guidance.ts` | Scope-filtered and bounded packets feed Knowledge and are resolved per direct Athena workflow agent (8 combined records maximum) across all 12 registered specialists. Account owner, specialist domain, agent, Athena module, active project, and task session constrain retrieval. Only manually confirmed global communication preferences cross specialist domains; other specialist style guidance requires explicit agent/domain scope and allowlisted values. Four deterministic specialists consume selected confirmed style guidance (Sophia, Musa, Strategos, Critias); 11 specialist implementations consume positive, scoped historical method hints. The direct Music chat requests a separate six-record `music`/`euterpe`/`music` packet scoped to its selected track and session; only confirmed Euterpe style preferences control presentation, while useful prior outcomes remain non-authoritative hints. Current requests can override style or suppress historical hints. Memories remain context, not facts about the current track. |
| Studio event producers | `audio-learning-adapter.ts`, `game-learning-adapter.ts`, `document-learning-adapter.ts`, `music-learning-adapter.ts`, `editor-history-adapter.ts`, `studio-structure-adapter.ts` | Audio records scoped BPM-only diffs; Music records explicit ratings and allowlisted per-track visual choices; Game, Image, Video and Web successful saves now produce attributed, allowlisted structural observations; Document retains character-count-only edit signals. Image/Video/Web adapters discard text, code, paths, assets and arbitrary payload fields. Events remain evidence, never confirmed preferences. |
| Experience Center | `src/app/modules/experience/page.tsx`, navigation at `/modules/experience` | Functional local controls include manual preferences, candidate review, confirmation/rejection, learning exclusions, forget, export, guarded legacy reassociation, and an evidence-linked project retrospective. It explicitly states that data stays on this device. |
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
| F — retrieval and context builder | IMPLEMENTED, EXPANDING CONSUMERS | Knowledge and local-model Athena consume bounded context; direct workflow agents receive individually resolved bounded packets. The async deterministic Athena path retrieves account-scoped communication style only; the synchronous compatibility facade and deterministic dialogue do not consume episodic experience or factual memories. |
| G — privacy, permissions, learning policy | IMPLEMENTED LOCALLY | Ownership, exclusions, and forget tests pass. Cross-device policy/sync is absent. |
| H — agent integration contract | PARTIAL, CONSUMERS EXPANDING | Knowledge packets and all 12 direct workflow agents receive bounded Experience; all 11 specialist entrypoints use the shared feedback/follow-up/presentation adapter, and Euterpe keeps her native introduction without duplication. Sophia, Musa, Strategos, and Critias consume a small allowlist of manually confirmed, agent-appropriate style guidance; 11 specialist implementations (including Justitia, Logos, and Athena's Euterpe agent) can present positive scoped method hints. The direct Music conversation now receives a separate account-owned, track/session-bounded packet; Euterpe's confirmed formality preference affects presentation, current wording overrides it, and track outcomes remain suggestions rather than audio facts or actions. Athena's generic deterministic conversation, broader provider coverage, and full end-to-end trace remain incomplete. |
| I — project experience and retrospective | PARTIAL, USER WORKFLOW STARTED | Experience Center lets the user choose a project from account-owned observed events and review chronological evidence references, decisions, changes, and useful experiences. Provenance is restricted to events for that project and account. Project metadata is still mostly an opaque project ID; creating outcome records from a user-reviewed retrospective and broader project workflow coverage remain open. |
| J — Experience Center | PARTIAL | `/modules/experience` exposes working local controls; it is not yet a full lifecycle/inspector UI. |
| K — adapters | PARTIAL, EXPANDED | Audio, Music, Game, and Document have confirmed production call sites. The new Game/Document calls run only after successful user saves and exclude raw document text, game scripts, labels, and assets. Image, Video, and Web are not covered. |
| L — forget, export, retention | PARTIAL | Forget cascade and local JSON export exist; scheduled retention and sync-aware deletion are not implemented. |
| M — observability and developer inspector | NOT IMPLEMENTED END TO END | Need a trace joining event, signal, candidate, preference, retrieval, and consuming decision. |
| N/O — performance, automated and adversarial tests | PARTIAL, CORE TESTS PASS | Experience, ownership, exclusion, conflict, forgetting, and candidate adversarial tests pass; production event-volume and cross-module E2E coverage remain. |
| P — docs, migration, production validation | PARTIAL | Core model and learning policy are documented; the complete manual plan, test report, privacy/integration/limitations/changelog deliverables and production walkthrough remain. |

## Verified validation snapshot (2026-10-05)

- `npm run test:experience` — passed, all 21 registered Experience tests.
- `npm run test:athena-intelligence` — 100/100 passed, including colloquial task queries, project readiness, and post-Studio project reference continuity.
- Athena system suite — 50/50 passed; response-quality suite — 30/30 passed.
- Athena certification — 18/18 passed; TypeScript and full Next production build passed on the current conversation/persona revision.
- `npm run test:music:complete` — passed, covering library, import, cloud contracts, studio, chat, Athena bridge, visual AI and advanced Euterpe/engine tests.
- Euterpe refinements in this release share the same grounded interpreter across the Music module and Athena agent workflow. Tests cover selected-track/DNA boundaries, missing evidence, saved tastes as uncertain hints, explicit refusal/negation, conversational follow-ups and review-only proposals.
- Knowledge/Vault suite — passed after source-addressable Vault chunk changes were integrated.
- Documentation regression inventory at build — 44 routes, 36 tools, 12 agents, 18 modules.
- Production validation for commit `8304a2e` completed on 2026-10-05: Vercel deployment `dpl_Ay5GSR3kAtFECJXPT1KMsDgFmv6H` reached `READY` and received `https://varynth-ynqv-plum.vercel.app`; `/login` and `/manifest.json` returned 200 and protected `/modules/athena` redirected to login (307). This verifies deployment and routing, not an authenticated in-product conversation walkthrough.

## Next implementation sequence

1. Extend the Athena feedback-to-Experience bridge pattern to remaining Studio result surfaces; persist only deliberate feedback or well-attributed edits.
2. Wire real, scoped Experience producers into each Studio and governed action lifecycle, including cancellation/undo/redo without false causal learning.
3. Extend non-authoritative, scope-verified Experience use to remaining agents and Athena's generic deterministic dialogue/persona path, with explicit current-instruction precedence, agent isolation, and truthful provenance.
4. Complete the manual test plan, privacy and agent-integration docs, and user-visible explanations/decision traces.
5. Decide and implement sync/retention only with explicit ownership, export, deletion, and conflict semantics; until then keep Experience clearly local-only.
6. Re-run the full regression and cross-module tests, inspect Experience Center behavior, and validate the production alias after each publication.

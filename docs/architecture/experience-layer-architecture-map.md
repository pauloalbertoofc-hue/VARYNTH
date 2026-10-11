# VARYNTH Experience & Learning Layer — Architecture Map

Status: CORE IMPLEMENTED; ECOSYSTEM-WIDE EVENT INTEGRATION AND VALIDATION REMAIN IN PROGRESS
Last audited: 2026-10-11

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
| Feedback and signal evidence | `feedback-service.ts`, `signals.ts`, `preference-candidate-service.ts`, `conversation/experience-feedback-bridge.ts`, `editor-history-adapter.ts`, `conversation/feedback-target.ts` | Athena's explicit response-quality controls create account-owned events while omitting prompt/response text. In Hub and Sidecar, delegated-response feedback now follows the actual `agentExecution` producer, so a specialist's correction is delivered to that specialist rather than misattributed to Athena; responses without a real agent attribution remain Athena-scoped. Audio/Game/Document/Music adapters fail closed unless user action is attributed. Audio/Game/Image/Video editor Undo/Redo controls now record only after a real history state is returned; immediate undo (<=30s since a successful save) is distinguished from delayed/unknown undo, redo is separate, and event payloads omit document state. These are scoped signals, not preferences. Candidate review re-checks current account exclusions against historical evidence, so pausing a scope also suppresses new hypotheses from previously stored events while preserving those events for audit. |
| Preference and experience lifecycle | `preference-service.ts`, `experience-service.ts`, `pattern-service.ts`, `outcome-service.ts`, `retrospective-service.ts`, `reviewed-outcome-service.ts` | Scope, confidence, conflicts/decay, provenance, outcomes, retrospective, and forget cascades have automated tests. The Experience Center can build a project retrospective and, after explicit user confirmation, retain a manually authored situation/action/outcome linked to selected events from that same account/project. Learning exclusions block retention; no preference is inferred or promoted. |
| Privacy and learning policy | `learning-policy.ts`, `learning-exclusion-service.ts`, `identity.ts` | Account ownership, actor/source eligibility, scoped exclusions, and agent-event safeguards are enforced locally. |
| Retrieval/context budget | `context-builder.ts`, `knowledge/context-assembler.ts`, `athena/runtime/agent-experience-context.ts`, `athena/agents/experience-guidance.ts`, `athena/persona/project-experience-guidance.ts` | Scope-filtered and bounded packets feed Knowledge and are resolved per direct Athena workflow agent (8 combined records maximum) across all 12 registered specialists. Account owner, specialist domain, agent, Athena module, active project, and task session constrain retrieval. Only manually confirmed global communication preferences cross specialist domains; other specialist style guidance requires explicit agent/domain scope and allowlisted values. Four deterministic specialists consume selected confirmed style guidance (Sophia, Musa, Strategos, Critias); 11 specialist implementations consume positive, scoped historical method hints. Athena's asynchronous cognitive chat invokes and attributes the selected specialist through the same Experience-aware helper as persisted workflows, while `responseAudience=ATHENA` keeps Athena the sole visible speaker; native Euterpe/Music turns retain the specialist's own voice. Delegated responses pass FactLock's structured-fact/authority checks and the response-completeness gate before display; rejected text is withheld and audited locally. ID-only trace projections can be inspected from each response in the Athena Hub and Sidecar; the disclosure distinguishes retrieved IDs from literal response matches, preserves instruction precedence, and does not expose memory contents or claim causal influence. The direct Music chat requests a separate six-record `music`/`euterpe`/`music` packet scoped to its selected track and session; only confirmed Euterpe style preferences control presentation, while useful prior outcomes remain non-authoritative hints. The general deterministic Athena path now exposes up to two provenance-backed useful experiences only during brainstorming/recommendations for the exact active project; it labels them as references rather than current facts, and honors explicit requests not to use history. Current requests can override style or suppress historical hints. Memories remain context, not facts about the current track or task. |
| Studio event producers and feedback | `audio-learning-adapter.ts`, `game-learning-adapter.ts`, `document-learning-adapter.ts`, `music-learning-adapter.ts`, `editor-history-adapter.ts`, `studio-structure-adapter.ts`, `studio-result-feedback.ts`, `StudioExperienceFeedback.tsx` | Audio records scoped BPM-only diffs; Music records explicit ratings and allowlisted per-track visual choices; Game, Image, Video and Web successful saves now produce attributed, allowlisted structural observations; Document retains character-count-only edit signals. All six Studios expose explicit useful/not-useful feedback for saved artifacts, with optional user-authored correction capped at 500 characters; only artifact/project/module IDs and truthful Athena attribution are added to the event, never the artifact body or project source. Image/Video/Web adapters discard text, code, paths, assets and arbitrary payload fields. Events remain evidence, never confirmed preferences. |
| Experience Center | `src/app/modules/experience/page.tsx`, navigation at `/modules/experience` | Functional local controls include manual preferences, candidate review, confirmation/rejection, learning exclusions, forget, export, guarded legacy reassociation, evidence-linked project retrospective, and explicit project-only outcome retention with selected provenance. It explicitly states that data stays on this device. |
| Cross-device sync and retention | No Experience sync implementation found in the audited route inventory | Not implemented; do not imply that local records follow the account to another device or are subject to a configurable retention scheduler. |
| Experience trace disclosures | `src/components/athena/AthenaExperienceTrace.tsx`, rendered in Athena Hub and Sidecar | Per-response agent disclosures show bounded preference, experience and provenance IDs; distinguish retrieved IDs from literal matches in the specialist's returned text; and explain precedence and the non-causal limit. The UI states that this return may have been synthesized or blocked before display. It does not expose stored content. A full event → signal → candidate → retrieval → decision inspector is still not implemented. |
| Rollout and rollback | `src/lib/experience/feature-flags.ts` | Three build-environment flags default to enabled to preserve behavior: `NEXT_PUBLIC_VARYNTH_EXPERIENCE_ENABLED`, `NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED`, and `NEXT_PUBLIC_VARYNTH_EXPERIENCE_PROJECT_RETROSPECTIVES_ENABLED`. Global disable returns an empty retrieval context and blocks candidate derivation/retrospective writes; narrower flags independently pause inference or retrospectives. The Experience Center reports active pauses. These are deployment/build-time controls, not live user toggles; disabling does not erase local records or bypass account ownership, exclusions, or explicit confirmation. |

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
| C — feedback and signals | IMPLEMENTED CORE, ATHENA WIRED | Feedback/signal services, Athena response controls, specialist producer attribution across Hub/Sidecar, and privacy-minimal bridge are tested; add intentional feedback entry points to remaining module result surfaces. |
| D — preferences, confidence, scope | IMPLEMENTED CORE | Candidate thresholds, conflict/decay, manual declaration, and scoped resolution are tested. |
| E — experiences, patterns, outcomes | IMPLEMENTED CORE, REVIEWED OUTCOME FLOW ADDED | Services and retrospective tests pass; project outcomes can now be manually authored and confirmed from the Experience Center with selected account/project evidence. Increase coverage from real completed Studio workflows. |
| F — retrieval and context builder | IMPLEMENTED, EXPANDING CONSUMERS | Knowledge and local-model Athena consume bounded context; direct workflow agents receive individually resolved bounded packets. Async deterministic Athena now consumes up to two positive, provenance-backed outcomes scoped to the exact active project only during brainstorming/recommendation; the synchronous compatibility facade and general factual dialogue still do not consume episodic experience or factual memories. |
| G — privacy, permissions, learning policy | IMPLEMENTED LOCALLY | Ownership, exclusions, and forget tests pass. Cross-device policy/sync is absent. |
| H — agent integration contract | PARTIAL, SHARED CONVERSATION AND DOMAIN-ISOLATED EXPERIENCE | Knowledge packets and all 12 direct workflow agents receive bounded Experience; all 11 specialist entrypoints use the shared feedback/follow-up/presentation adapter. The adapter preserves specialist introductions, honors explicit register instructions, leaves mixed registers neutral, avoids redundant depth offers, and can present at most two positive method hints. Method retrieval now respects agent, mapped domain, and exact active-project scope; GLOBAL means across projects within a relevant domain, not across unrelated specialties. Current instructions can suppress historical hints, and the shared layer avoids duplicating hints authored by specialist implementations. Per-agent identity, evidence boundaries, and authority remain distinct. Other deterministic intents, broader provider coverage, and the full event-to-decision inspector remain incomplete. |
| I — project experience and retrospective | PARTIAL, USER-WRITTEN OUTCOMES | Experience Center lets the user choose a project from account-owned observed events, review chronological evidence, select up to 12 source events, and explicitly confirm a useful authored outcome. A `USER/OUTCOME_RECORDED` event and a project-scoped ExperienceRecord are persisted with owner/provenance checks; active learning exclusions fail closed. Project metadata is still mostly an opaque ID and broader Studio workflow coverage remains open. |
| J — Experience Center | PARTIAL | `/modules/experience` exposes working local controls and deployment-flag status; it is not yet a full lifecycle/inspector UI. |
| K — adapters | PARTIAL, EXPANDED | Audio, Music, Game, and Document have confirmed production call sites. The new Game/Document calls run only after successful user saves and exclude raw document text, game scripts, labels, and assets. Image, Video, and Web are not covered. |
| L — forget, export, retention | PARTIAL | Forget cascade and local JSON export exist; scheduled retention and sync-aware deletion are not implemented. |
| M — observability and developer inspector | NOT IMPLEMENTED END TO END | Need a trace joining event, signal, candidate, preference, retrieval, and consuming decision. |
| N/O — performance, automated and adversarial tests | PARTIAL, CORE TESTS PASS | Experience, ownership, exclusion, conflict, forgetting, and candidate adversarial tests pass; production event-volume and cross-module E2E coverage remain. |
| P — docs, migration, production validation | PARTIAL, MANUAL PLAN ADDED | `experience-manual-test-plan.md` now specifies all 40 acceptance scenarios and marks implemented/partial/gap without claiming they were executed. Run evidence, dedicated privacy/integration/limitations/changelog deliverables and authenticated production walkthrough remain. |

## Verified validation snapshot (2026-10-05; prior snapshot)

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
4. Execute `experience-manual-test-plan.md` against a local build, attach evidence, and complete privacy and agent-integration docs plus user-visible explanations/decision traces.
5. Decide and implement sync/retention only with explicit ownership, export, deletion, and conflict semantics; until then keep Experience clearly local-only.
6. Re-run the full regression and cross-module tests, inspect Experience Center behavior, and validate the production alias after each publication.

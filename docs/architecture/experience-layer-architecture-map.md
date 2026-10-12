# VARYNTH Experience & Learning Layer — Architecture Map

Status: CORE IMPLEMENTED; ECOSYSTEM-WIDE EVENT INTEGRATION AND VALIDATION REMAIN IN PROGRESS
Last audited: 2026-10-12

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
| Existing event buses and governed Knowledge/Vault actions | `src/lib/events/varynth-event-bus.ts`; `src/lib/athena/events/event-bus.ts`; `knowledge-governance-feedback.ts` | Buses remain separate. Knowledge Center records successful classification, publish, revoke, and lifecycle decisions; Vault records deliberate reading-status changes and confirmed deletion. Events are owner-scoped, non-learning audit evidence with IDs and allowlisted metadata only; there is not yet a general adapter subscribing all production events. |
| Athena and specialist conversational pragmatics | `src/lib/athena/conversation/pragmatic-understanding.ts`; `conversation-manager.ts`; `agents/base-agent.ts`; `persona-engine.ts`; `src/lib/experience/communication-style.ts`; `src/lib/music/euterpe.ts` | Shared deterministic speech-act cues distinguish topic changes, follow-ups, clarifications, corrections, requested register and answer depth. Current unambiguous register/verbosity now sets Athena's response intent and overrides older confirmed communication style; mixed register remains neutral, and saved verbosity cannot expand a clarification or execution report. Athena resolves “explain better” only against its immediately preceding turn, quotes only recorded content and asks for a referent when none exists; specialist follow-up/presentation uses the same classifier without overriding domain evidence or authority. Short colloquial continuations (“E aí?”, “Mas como?”, “Desenvolve”, “Pode detalhar?”) and conditional/applicability continuations (“E se o prazo mudar?”, “Isso se aplica ao segundo cenário?”) resolve to bounded prior user context; “E aí, tudo bem?” and explicitly named subject changes remain independent substantive turns. Music-specific Euterpe conditionals can remain in her own executor; current Music DNA is shown separately from an explicitly untested hypothetical, while general platform conditions continue to delegate to Athena. Validated specialist attribution is stored with the assistant turn and restored only from accepted execution metadata; it guides clear continuations such as “Desenvolve”, while questions about the prior answer remain with Athena. Rejected or unvalidated responses cannot claim later turns. This is a bounded deterministic baseline, not general semantic understanding. |
| Feedback and signal evidence | `feedback-service.ts`, `signals.ts`, `preference-candidate-service.ts`, `conversation/experience-feedback-bridge.ts`, `editor-history-adapter.ts`, `conversation/feedback-target.ts`, `studio-result-feedback.ts`, `capability-plan-feedback.ts` | Athena's explicit response-quality controls create account-owned events while omitting prompt/response text. The shared feedback API resolves and persists the authenticated owner before storing evidence; explicit owner mismatches fail closed, so feedback is not silently lost from learning eligibility. In Hub and Sidecar, delegated-response feedback follows the actual `agentExecution` producer, so a specialist's correction is delivered to that specialist rather than misattributed to Athena; responses without a real agent attribution remain Athena-scoped. Saved results across all six Studio artifact types (Audio, Document, Game, Image, Video, Web) expose deliberate yes/no/correction feedback linked to artifact ID, and only Athena-created artifacts are attributed to Athena. Persisted Athena capability plans now have explicit helpful/not-helpful/correction feedback bound to plan ID, revision, status, project, and session; the plan body and step results are not copied, and feedback does not create preferences. Audio/Game/Document/Music adapters fail closed unless user action is attributed. Audio/Game/Image/Video editor Undo/Redo controls now record only after a real history state is returned; immediate undo (<=30s since a successful save) is distinguished from delayed/unknown undo, redo is separate, and event payloads omit document state. These are scoped signals, not preferences. Candidate review re-checks current account exclusions against historical evidence, so pausing a scope also suppresses new hypotheses from previously stored events while preserving those events for audit. |
| Preference and experience lifecycle | `preference-service.ts`, `experience-service.ts`, `pattern-service.ts`, `outcome-service.ts`, `retrospective-service.ts`, `reviewed-outcome-service.ts` | Scope, confidence, conflicts/decay, provenance, outcomes, retrospective, and forget cascades have automated tests. The Experience Center can build a project retrospective and, after explicit user confirmation, retain a manually authored situation/action/outcome linked to selected events from that same account/project. Learning exclusions block retention; no preference is inferred or promoted. |
| Privacy and learning policy | `learning-policy.ts`, `learning-exclusion-service.ts`, `identity.ts` | Account ownership, actor/source eligibility, scoped exclusions, and agent-event safeguards are enforced locally. |
| Retrieval/context budget | `context-builder.ts`, `knowledge/context-assembler.ts`, `athena/runtime/agent-experience-context.ts`, `athena/agents/experience-guidance.ts`, `athena/persona/project-experience-guidance.ts` | Scope-filtered and bounded packets feed Knowledge and are resolved per direct Athena workflow agent (8 combined records maximum) across all 12 registered specialists. Account owner, specialist domain, agent, Athena module, active project, and task session constrain retrieval. Only manually confirmed global communication preferences cross specialist domains; other specialist style guidance requires explicit agent/domain scope and allowlisted values. Four deterministic specialists consume selected confirmed style guidance (Sophia, Musa, Strategos, Critias); 11 specialist implementations consume positive, scoped historical method hints only for current ideation, planning, proposal, or recommendation requests; factual and explanatory turns do not receive unsolicited past outcomes. Athena's asynchronous cognitive chat invokes and attributes the selected specialist through the same Experience-aware helper as persisted workflows, while `responseAudience=ATHENA` keeps Athena the sole visible speaker; native Euterpe/Music turns retain the specialist's own voice. Delegated responses pass FactLock's structured-fact/authority checks and the response-completeness gate before display; rejected text is withheld and audited locally. ID-only trace projections can be inspected from each response in the Athena Hub and Sidecar; the disclosure distinguishes retrieved IDs from literal response matches, preserves instruction precedence, and does not expose memory contents or claim causal influence. The direct Music chat requests a separate six-record `music`/`euterpe`/`music` packet scoped to its selected track and session; only confirmed Euterpe style preferences control presentation, while useful prior outcomes remain non-authoritative hints. The general deterministic Athena path exposes up to two provenance-backed useful experiences only during brainstorming/recommendations for the exact active project; it labels them as references rather than current facts, and honors explicit requests not to use history. Current requests can override style or suppress historical hints. Memories remain context, not facts about the current track or task. |
| Studio and project event producers and feedback | `audio-learning-adapter.ts`, `game-learning-adapter.ts`, `document-learning-adapter.ts`, `music-learning-adapter.ts`, `project-learning-adapter.ts`, `artifact-learning-adapter.ts`, `studio-export-adapter.ts`, `editor-history-adapter.ts`, `studio-structure-adapter.ts`, `studio-result-feedback.ts`, `StudioExperienceFeedback.tsx` | Audio records scoped BPM-only diffs; Music records explicit ratings and allowlisted per-track visual choices; Game, Image, Video and Web successful saves now produce attributed, allowlisted structural observations; Document retains character-count-only edit signals. The real Quick Create project path records successful user project creation with category and project ID only (no title/description), enabling project retrospectives to see an actual starting event; agent-created projects are explicitly non-learning. The central VersionManager records real artifact snapshots across Studio and universal artifacts with type/version/IDs only; neither artifact title/content nor change summary enters Experience, and only USER-created snapshots qualify as primary evidence. Completed Audio/Image/Video renders, Web package generation, and Document export now create low-strength export signals with format and allowlisted technical measures only; unsuccessful exports emit no signal, and export never implies satisfaction. All six Studios expose explicit useful/not-useful feedback for saved artifacts, with optional user-authored correction capped at 500 characters; only artifact/project/module IDs and truthful Athena attribution are added to the event, never the artifact body or project source. Image/Video/Web adapters discard text, code, paths, assets and arbitrary payload fields. Events remain evidence, never confirmed preferences. |
| Experience Center | `src/app/modules/experience/page.tsx`, navigation at `/modules/experience` | Functional local controls include manual preferences, candidate review, confirmation/rejection, learning exclusions, forget, export, guarded legacy reassociation, evidence-linked project retrospective, and explicit project-only outcome retention with selected provenance. It explicitly states that data stays on this device. |
| Cross-device sync and retention | No Experience sync implementation found in the audited route inventory | Not implemented; do not imply that local records follow the account to another device or are subject to a configurable retention scheduler. |
| Experience trace disclosures and inspector | `src/components/athena/AthenaExperienceTrace.tsx`, `src/lib/experience/decision-trace.ts`, `inspector.ts`, rendered in Athena Hub, Sidecar, and `/modules/experience` | Per-response disclosures show bounded IDs and non-causal limits. When retrieved context is non-empty, the specialist records an account-owned, agent-private, non-learning ID-only event. The Experience Center joins explicit source-event evidence to derived signals, candidates, preferences, experiences, and retrieval traces. Forget cascades remove decision traces that reference invalidated records; at most 200 retrieval traces are retained per account. This is an inspectable local lineage, not proof that history caused the answer; other providers and all non-Experience decisions are not traced. |
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
| C — feedback and signals | IMPLEMENTED CORE, ATHENA/STUDIO/PLAN WIRED | Feedback/signal services, Athena response controls, specialist producer attribution across Hub/Sidecar, Studio result feedback, and revision-bound capability-plan feedback are tested. Continue adding intentional feedback to remaining module result surfaces; feedback remains evidence and does not directly confirm preferences. |
| D — preferences, confidence, scope | IMPLEMENTED CORE | Candidate thresholds, conflict/decay, manual declaration, and scoped resolution are tested. |
| E — experiences, patterns, outcomes | IMPLEMENTED CORE, REVIEWED OUTCOME FLOW ADDED | Services and retrospective tests pass; project outcomes can now be manually authored and confirmed from the Experience Center with selected account/project evidence. Increase coverage from real completed Studio workflows. |
| F — retrieval and context builder | IMPLEMENTED, EXPANDING CONSUMERS | Knowledge and local-model Athena consume bounded context; direct workflow agents receive individually resolved bounded packets. Async deterministic Athena now consumes up to two positive, provenance-backed outcomes scoped to the exact active project only during brainstorming/recommendation; the synchronous compatibility facade and general factual dialogue still do not consume episodic experience or factual memories. |
| G — privacy, permissions, learning policy | IMPLEMENTED LOCALLY | Ownership, exclusions, and forget tests pass. Cross-device policy/sync is absent. |
| H — agent integration contract | PARTIAL, SHARED CONVERSATION AND DOMAIN-ISOLATED EXPERIENCE | Knowledge packets and all 12 direct workflow agents receive bounded Experience; all 11 specialist entrypoints use the shared feedback/follow-up/presentation adapter. The adapter preserves specialist introductions, honors explicit register instructions, leaves mixed registers neutral, avoids redundant depth offers, and can present at most two positive method hints. Method retrieval now respects agent, mapped domain, and exact active-project scope; GLOBAL means across projects within a relevant domain, not across unrelated specialties. Current instructions can suppress historical hints, and the shared layer avoids duplicating hints authored by specialist implementations. Per-agent identity, evidence boundaries, and authority remain distinct. Other deterministic intents, broader provider coverage, and the full event-to-decision inspector remain incomplete. |
| I — project experience and retrospective | PARTIAL, USER-WRITTEN OUTCOMES | Experience Center lets the user choose a project from account-owned observed events, review chronological evidence, select up to 12 source events, and explicitly confirm a useful authored outcome. A `USER/OUTCOME_RECORDED` event and a project-scoped ExperienceRecord are persisted with owner/provenance checks; active learning exclusions fail closed. Project metadata is still mostly an opaque ID and broader Studio workflow coverage remains open. |
| J — Experience Center | PARTIAL, LINEAGE INSPECTOR ADDED | `/modules/experience` exposes local controls, deployment-flag status, and an event-to-retrieval lineage inspector for the supported Experience path. Full lifecycle, delta comparison, and all-provider decision inspection remain open. |
| K — adapters | PARTIAL, EXPANDED | Audio, Music, Game, Document, Image, Video, and Web now have production feedback or structural adapter call sites. Saved-result feedback covers all six Studios; Image/Video/Web structure adapters retain only allowlisted shape metrics and are wired to current user-edit paths; Game/Document save adapters run only after successful user saves and exclude raw document text, game scripts, labels, and assets. This is not yet full event integration for every workflow or provider. |
| L — forget, export, retention | PARTIAL | Forget cascade and local JSON export exist; forgetting an evidence event also deletes ID-only decision traces that cite affected preference/experience records. Scheduled retention and sync-aware deletion are not implemented. |
| M — observability and developer inspector | PARTIAL, EXPERIENCE-LINEAGE PATH IMPLEMENTED | ID-only decision events and `/modules/experience` join source event, derived signal, evidence-backed candidate/preference/experience, and specialist retrieval. Trace tests cover privacy, idempotency, non-learning, owner boundaries, and forget. Other action decisions/providers and authenticated manual UI walkthrough remain gaps. |
| N/O — performance, automated and adversarial tests | PARTIAL, CORE TESTS PASS | Experience, ownership, exclusion, conflict, forgetting, and candidate adversarial tests pass; production event-volume and cross-module E2E coverage remain. |
| P — docs, migration, production validation | PARTIAL, MANUAL PLAN ADDED | `experience-manual-test-plan.md` now specifies 47 acceptance scenarios and marks implemented/partial/gap without claiming they were executed. Run evidence, dedicated privacy/integration/limitations/changelog deliverables and authenticated production walkthrough remain. |

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

## Verified validation snapshot (2026-10-11; local inspector revision)

- `npx tsc --noEmit` passed.
- `npm run test:experience` passed across contracts, persistence, privacy, ownership, signals, preferences, outcomes, adapters, and forget cascades.
- `npm run test:experience:inspector` passed, including the real specialist response-to-trace write, ID-only event privacy, idempotency, feature-flag behavior, cross-account isolation, and trace invalidation after forgetting evidence.
- `npm run test:athena-communication` passed across shared specialist presentation, feedback attribution, correction, pending clarification, and project guidance.
- `npm run build` passed: documentation inventory 44 routes / 36 tools / 12 agents / 18 modules, Athena certification 20/20, Next.js 16.3.3 production build 62 routes.
- Manual authenticated browser walkthrough remains unverified. The production Actions deployment step for the immediately preceding commit failed; this local validation does not establish production deployment.

## Verified validation snapshot (2026-10-12; capability-plan feedback)

- `npx tsx src/lib/experience/capability-plan-feedback.test.ts` and `npx tsx src/lib/athena/tests/capability-plan-ui.test.ts` passed.
- `npm run test:experience` passed, including account ownership, exclusions, conflicts, forget cascades, adapters, and capability-plan feedback.
- `npm run test:docs:regression` passed with 44 routes, 36 tools, 12 agents, and 18 modules.
- `npm run test:athena-plan-ui`, `npx tsc --noEmit --pretty false`, and `git diff --check` passed.
- `npm run build` passed: Athena certification 22/22 and Next.js 16.3.3 generated 62 static pages.
- Authenticated UI walkthrough and production deployment of this revision remain unverified.

## Verified validation snapshot (2026-10-12; conditional conversational follow-ups)

- `npx tsx src/lib/athena/conversation/pragmatic-understanding.test.ts` passed for conditional/applicability follow-ups and topic independence.
- `npx tsx src/lib/athena/agents/base-agent-conversation.test.ts` passed for specialist context resolution, voice/presentation, correction safety, and explicit new-topic behavior.
- `npx tsx src/lib/athena/tests/athena-communication-regression.test.ts` passed for cross-path communication and grounded experience guidance.
- `npx tsx src/lib/athena/tests/semantic-regression.test.ts` passed all 41 cases, including reported-instruction containment and explicit user adoption routing.
- `npm run test:athena-intelligence` passed 102 scenarios with no failures after the audit runner was corrected to return a nonzero status when any case fails.
- `npm run build` passed: documentation inventory 44 routes / 36 tools / 12 agents / 18 modules, Athena certification 22/22, and Next.js 16.3.3 generated 62 static pages.
- Authenticated UI walkthrough and production deployment remain unverified for this incremental revision.

## Verified validation snapshot (2026-10-12; outcome and applicability follow-ups)

- `npx tsx src/lib/athena/conversation/pragmatic-understanding.test.ts`, `npx tsx src/lib/athena/agents/council/agent-persona-grounding.test.ts`, `npx tsx src/lib/music/euterpe.test.ts`, `npx tsx src/lib/athena/agents/council/music-curator.test.ts`, and `npx tsx src/lib/music/music-agent-bridge.test.ts` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed: documentation inventory 44 routes / 36 tools / 12 agents / 18 modules, Athena certification 22/22, and Next.js 16.3.3 generated 62 static pages.
- Manual authenticated UI walkthrough and production publication remain pending for this revision.

## Verified validation snapshot (2026-10-12; Euterpe hypothetical follow-up)

- `npx tsx src/lib/music/euterpe.test.ts` passed for grounded hypothetical responses, current-track DNA boundaries, and proposal safety.
- `npx tsx src/lib/athena/agents/council/music-curator.test.ts` passed, including routing music-specific hypotheticals to Euterpe and general project conditions to Athena.
- `npx tsx src/lib/music/music-agent-bridge.test.ts` passed; the standard pragmatic-understanding suite passed as well.
- `npm run build` passed: documentation inventory 44 routes / 36 tools / 12 agents / 18 modules, Athena certification 22/22, and Next.js 16.3.3 generated 62 static pages.
- Authenticated UI walkthrough and production deployment remain unverified for this incremental revision.

## Next implementation sequence

1. Audit and add real, scoped Experience producers to remaining non-Studio modules and governed action lifecycles; Knowledge classification/publish/revoke/lifecycle decisions now have non-learning audit producers, while deliberate feedback and well-attributed edits remain the only learning-eligible paths.
2. Extend Experience adapters to cancellation/undo/redo paths not yet covered, without false causal learning.
3. Extend non-authoritative, scope-verified Experience use to remaining agents and Athena's generic deterministic dialogue/persona path, with explicit current-instruction precedence, agent isolation, and truthful provenance.
4. Execute `experience-manual-test-plan.md` against a local build, attach evidence, and complete privacy docs plus authenticated inspector walkthroughs for the new lineage.
5. Decide and implement sync/retention only with explicit ownership, export, deletion, and conflict semantics; until then keep Experience clearly local-only.
6. Re-run the full regression and cross-module tests, inspect Experience Center behavior, and validate the production alias after each publication.

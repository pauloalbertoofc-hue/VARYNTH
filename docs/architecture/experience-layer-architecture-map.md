# VARYNTH Experience & Learning Layer — Architecture Map

Status: MILESTONE A — LOCAL AUDIT REFRESHED / LOCAL AND UPSTREAM STATES DIVERGE
Date: 2026-10-01

## Existing capabilities

| Concern | Existing implementation | Decision |
| --- | --- | --- |
| Application events | `src/lib/events/varynth-event-bus.ts` | Keep for lightweight UI/runtime signals; selected changes must be adapted to durable Experience events rather than merging event buses. |
| Athena governance/audit | `src/lib/athena/events/event-bus.ts` | Keep separate; consume selected governed events through an adapter, never merge buses blindly. |
| Structured persistence | `src/lib/persistence/indexeddb-adapter.ts`, repositories and additive Experience repositories | Reuse current IndexedDB adapter and migration engine; migration/recovery behavior needs continued validation. |
| Cognitive memory | `src/lib/athena/memory/*` | Preserve as Athena-specific memory; Experience memory must not be stored as generic episodic memory. |
| UI preferences | `src/lib/customization/*` | Preserve as explicit product settings; do not reinterpret them as inferred learning. |
| Permissions | `src/lib/permissions/*` | Experience data remains subject to existing permission boundaries. |
| Undo and action audit | Athena tool manager, capability plans and action events | Events and undo contracts exist, but Experience has no general causal bridge from every undo/action path; an undo alone is never a preference. |
| Projects/artifacts/studios | Existing types, repositories and studio services | Audio adapter is called from Audio Studio. Game and Document adapters exist and have tests, but this audit found no production call sites for them. |
| Feedback | `feedback-service.ts` and Athena feedback controls | Service and UI exist; no production call from the visible feedback controls to the central Experience feedback service was found in this audit. |
| Experience Center | `/modules/experience` | Local events, explicit preferences, candidate review, exclusion controls, migration preview and forgetting are exposed; project retrospectives/outcomes are not yet a complete user-facing lifecycle. |
| Retrieval/integration | `context-builder.ts`, Athena engine, Knowledge context assembler | Experience context is built in both paths. Validate per-agent consumption, project/private boundaries and current-instruction precedence end-to-end before widening rollout. |

## Target flow

```text
existing app/Athena/studio sources
        -> ExperienceEvent (validated, scoped, deduplicated, account-owned)
        -> Signal extraction (evidence only)
        -> candidate/consolidation services
        -> Preference / Experience / Outcome records with provenance
        -> policy-filtered retrieval
        -> agent context builder
```

## Boundaries

- No online model training, fine-tuning, embeddings as source of truth, or personality rewriting.
- Agents may submit candidates, but cannot write a confirmed preference directly.
- Current user instruction, policies, permissions and project scope outrank personalization.
- Private/project-scoped data cannot cross an agent or account boundary without an explicit policy decision.
- The layer must fail open to defaults for reads and fail closed for unsafe or invalid writes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Event duplication | Stable event id plus deduplication before consolidation. |
| False causal attribution | `correlationId`, `causationId`, source and temporal relation are retained. |
| Preference overfitting | Candidates are evidence-backed, scoped and confidence-limited. |
| Cross-domain leakage | Retrieval requires scope and policy checks. |
| Existing storage migration risk | Additive IndexedDB stores and a versioned migration; keep current stores untouched. |
| Feedback loops | Agent-generated events are marked non-learning-eligible by default. |
| Partial production wiring | Only the Audio Studio adapter has an observed production call site; wire each additional adapter alongside its owning real user action and end-to-end test. |
| Stale audit claims | Re-run route/tool/agent/module inventory and focused tests when the working tree changes; the previous baseline below is superseded by the 2026-10-01 run. |

## Current integration status

- **Implemented foundation:** typed event, preference, feedback and experience contracts; IndexedDB repositories; owner-scoped event recording; evidence-backed candidate/preferences; preference decay/conflict handling; feedback/outcome/retrospective services; exclusions, forget cascade and legacy migration; bounded context retrieval; Audio, Game and Document adapters; Experience Center controls.
- **Observed live call sites:** Audio Studio records selected state deltas; Athena's engine and Knowledge context assembly build scoped Experience context; the Experience Center reads and edits local records.
- **Not established by this audit:** a general durable event-bus bridge; production Game/Document adapter wiring; feedback-control-to-Experience service wiring; universal correlated Undo/Redo capture; complete project-outcome/retrospective UX; production E2E proving each authorized specialist receives only its scoped packet.
- **Architecture decision:** retain separate app, Athena-governance and Experience records. Add adapters/correlation metadata; do not make any one bus or generic `memory` field the system of record for every concept.

## Local checkout versus GitHub main

- This audit's local findings describe the dirty `codex/game-studio-export-parity` checkout at `3be1451` plus its uncommitted working-tree changes. That local snapshot has the feedback bridge, selected Studio call sites and Experience-to-agent behavior incomplete relative to the current upstream implementation.
- On 2026-10-01, `origin/main` was fetched at `2a269e0`. Its committed architecture map documents Athena feedback wiring, bounded specialist context, and Audio/Music/Game/Document event producers. Its `test:athena-intelligence` run passed 100/100, `npm run test:music:complete` passed, and a clean production build passed after synchronizing the locked Capacitor dependency. The GitHub Actions run for this SHA passed install, Game tests and build but failed in the Vercel deployment step; the exact logs require authenticated repository access, and the public site check does not prove this SHA is live.
- The local branch is 3 commits ahead and 41 behind `origin/main`, and has approximately 180 changed/untracked paths. Therefore local failures below are not evidence that current GitHub main fails. Do not merge, reset, clean or push either state until their overlapping edits and the three local-only commits are reconciled deliberately.

## Proposed milestones

1. A — audit, map and regression baseline (this document).
2. B — typed contracts, validation, provenance and durable event repository.
3. C/D — feedback, signals, scoped candidates and deterministic confidence.
4. E/F — experiences, outcomes, retrieval and context budget.
5. G/H — policy and agent integration contract.
6. I/J — project experience, retrospective and Experience Center.
7. K/P — adapters, forgetting/export, observability, adversarial tests, migration and production validation.

## Baseline evidence

- Documentation regression: 43 routes, 36 tools, 12 agents, 18 modules — passed.
- Persistence regression: 26 checks — passed.
- Permission regression: 22 checks — passed.
- Athena system behavior: 50/50 — passed.
- Athena intelligence: 100 scenarios, 95 passed, 2 partial, 3 failed. Failures: colloquial queries for pending tasks (“Tem coisa pendente?”, “Estou devendo alguma coisa?”, “Tem algo na fila?”). Partials: project-name slot filling and accuracy of a stated 60% completion report.
- Athena communication and conversation-outcome regressions — passed.
- Experience service suite (`npm run test:experience`): passed, including Audio, Game and Document adapter tests.
- `npx tsc --noEmit` — passed.
- Repository state and upstream comparison are recorded above; this local audit is not production evidence.

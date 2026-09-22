# VARYNTH Experience & Learning Layer — Architecture Map

Status: MILESTONE A — AUDIT COMPLETE / FOUNDATION NOT YET INTEGRATED
Date: 2026-09-22

## Existing capabilities

| Concern | Existing implementation | Decision |
| --- | --- | --- |
| Application events | `src/lib/events/varynth-event-bus.ts` | Keep for lightweight UI/runtime signals; add a durable Experience event contract beside it. |
| Athena governance/audit | `src/lib/athena/events/event-bus.ts` | Keep separate; consume selected governed events through an adapter, never merge buses blindly. |
| Structured persistence | `src/lib/persistence/indexeddb-adapter.ts` and repositories | Reuse IndexedDB adapter and migration engine; add versioned experience stores. |
| Cognitive memory | `src/lib/athena/memory/*` | Preserve as Athena-specific memory; Experience memory must not be stored as generic episodic memory. |
| UI preferences | `src/lib/customization/*` | Preserve as explicit product settings; do not reinterpret them as inferred learning. |
| Permissions | `src/lib/permissions/*` | Experience data remains subject to existing permission boundaries. |
| Undo and action audit | Athena tool manager, capability plans and action events | Use correlation/causation metadata for signals; an undo alone is never a preference. |
| Projects/artifacts/studios | Existing types, repositories and studio services | Integrate through adapters, starting with Audio as the reference adapter. |

## Target flow

```text
existing app/Athena/studio sources
        -> ExperienceEvent (validated, scoped, deduplicated)
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

## Proposed milestones

1. A — audit, map and regression baseline (this document).
2. B — typed contracts, validation, provenance and durable event repository.
3. C/D — feedback, signals, scoped candidates and deterministic confidence.
4. E/F — experiences, outcomes, retrieval and context budget.
5. G/H — policy and agent integration contract.
6. I/J — project experience, retrospective and Experience Center.
7. K/P — adapters, forgetting/export, observability, adversarial tests, migration and production validation.

## Baseline evidence

- Documentation regression: 28 routes, 36 tools, 12 agents, 17 modules — passed.
- Persistence regression: 26 checks — passed.
- Permission regression: 22 checks — passed.
- TypeScript: passed in the initial run.
- `test:athena:memory`: unavailable because no such npm script exists; no code was changed to mask this gap.

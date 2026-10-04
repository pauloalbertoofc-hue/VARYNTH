# Experience Model

The Experience Layer separates raw observation from interpreted personalization.

## Data chain

`ExperienceEvent → Signal → Evidence → PreferenceCandidate → Preference`

- `ExperienceEvent` is a validated observation with actor, source, scope and correlation metadata.
- `Signal` is evidence extracted from an event. It is not a preference.
- `EvidenceRef` points back to real event IDs and carries an explicit strength.
- `PreferenceCandidate` is a hypothesis requiring evidence.
- `Preference` is scoped, confidence-bearing and reversible.

Users can also declare a `GLOBAL` or `DOMAIN` preference directly in the Experience screen. A declaration is stored as a confirmed `MANUAL` preference with confidence `1` and a `PREFERENCE_CONFIRMED` event as provenance. Correcting the same scoped key updates its value while preserving each real declaration event. These explicit declarations are excluded from implicit signal extraction; they do not train a model or silently create inferred candidates.

The Experience screen also allows a manual `AGENT` preference bound to one stable agent ID from the shared agent catalog. Its retrieval requires that exact `agentId`; declaring a preference for one specialist does not make it visible to another. The selected agent's identity, voice, and authority are not changed by this behavioral preference.

Explicit response-quality feedback in Athena's conversation and Euterpe's Music conversation is attributed to the responding agent and module. The Experience event retains only category, target ID, session, and scope metadata; prompts and full responses are not copied. A positive or negative rating is evidence for review, not an automatic preference or personality change.

When a person explicitly asks a specialist to correct or retry a response, the shared conversational entrypoint resolves feedback only for that agent and session. A saved correction becomes the specialist's next prompt; without one, the agent asks what should change. Feedback marked `WRONG_ACTION` stops domain execution and requires a fresh user-described outcome, so an action is never repeated blindly. The entrypoint preserves each specialist's own executor, voice, domain evidence, and authority boundary.

Every newly written event, preference, retained experience, and learning exclusion carries the authenticated account's stable `ownerId`. Repository reads and destructive operations are constrained to that owner. Preferences and retained experiences also verify that every provenance event exists and belongs to the same account. Ownerless legacy events cannot become learning signals; legacy preferences/experiences stay out of account retrieval and export. The Experience screen now provides a read-only inventory and explicit, category-by-category reassociation to the currently authenticated local account. Reassociation requires confirmation and rejects preferences/experiences whose complete evidence set is not owned by that account or included in the same migration. Legacy learning exclusions are never reassigned automatically and remain fail-closed, because their prior scope cannot safely be guessed.

The live Athena cognitive path includes this account-scoped context only when the local Ollama agent is selected. Deterministic/offline responses and operational tool execution do not consume personalization yet. Context carries evidence references and an explicit instruction-precedence marker; it is not an online-training signal.

## Resolution

Current user instructions override all stored preferences. The context builder still retrieves applicable preferences alongside an ordinary task, and labels the precedence contract as `CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION`; this avoids treating every task as a blanket request to suppress personalization. The consumer must honor that contract when a preference conflicts with the current instruction. When no conflict exists, the resolver selects applicable preferences by scope specificity, then confidence. System policies and permissions remain outside personalization and always win.

Retained experiences are retrieved only for a matching scope: `GLOBAL`, the requested `DOMAIN`, or the exact `AGENT`, `MODULE`, `PROJECT`, `ARTIFACT`, or `SESSION` identifier. A missing identifier does not widen access; it hides records that require that scope. Relevance ranking and context budgets run only after this authorization filter.

Agent-generated events are not learning-eligible by default. Preference candidate extraction also requires event ownership to match the current account. Confirmation changes provenance to `MANUAL`; rejection and forgetting remain explicit state operations. Forgetting one account's event only updates evidence owned by that same account.

No model weights, persistent system prompt, agent identity or personality are rewritten by this layer. The selected local agent receives a bounded, request-time context packet.

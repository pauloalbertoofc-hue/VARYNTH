# Experience Model

The Experience Layer separates raw observation from interpreted personalization.

## Data chain

`ExperienceEvent → Signal → Evidence → PreferenceCandidate → Preference`

- `ExperienceEvent` is a validated observation with actor, source, scope and correlation metadata.
- `Signal` is evidence extracted from an event. It is not a preference.
- `EvidenceRef` points back to real event IDs and carries an explicit strength.
- `PreferenceCandidate` is a hypothesis requiring evidence.
- `Preference` is scoped, confidence-bearing and reversible.

## Resolution

Current user instructions override all stored preferences. When no current instruction exists, the resolver selects applicable preferences by scope specificity, then confidence. System policies and permissions remain outside personalization and always win.

Agent-generated events are not learning-eligible by default. Confirmation changes provenance to `MANUAL`; rejection and forgetting remain explicit state operations.

No model weights, prompts, agent identity or personality are rewritten by this layer.

# Learning Policy

Experience learning is evidence-gated. User actions and explicit outcomes may be eligible; agent-generated actions are never primary evidence; automatic system events are excluded except for explicitly recorded outcomes; and `generatedAutomatically` events are rejected to prevent self-reinforcing loops.

`learningEligible` is an explicit event field, but the policy still evaluates actor and metadata before any consolidation step. A policy decision never grants permissions and never overrides security or current user instructions.

## User-controlled exclusions

The Experience Center persists Do Not Learn exclusions in the local IndexedDB store. Exclusions may target the whole Experience Layer or a domain, agent, module, project, artifact, or session. Events in an excluded scope remain available as an audit record, but are stored with `learningEligible: false` and a reason in metadata; they cannot become eligible signals. Re-enabling removes only that exact exclusion, so any broader or narrower matching exclusion remains effective.

This setting currently applies on the device where it is changed. Cross-device synchronization is not implemented. Export includes exclusions alongside events, preferences, and retained experiences. Forgetting an event removes its evidence references: unsupported inferred preferences and experiences are deleted, while manually sourced preferences without remaining provenance are deprecated.

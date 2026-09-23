# AudioLearningAdapter

The Audio adapter is the first real Studio integration for the Experience Layer.

It translates meaningful Audio Studio actions into validated, scoped Experience Events. It records evidence only; it does not create preferences, alter agent identity, or treat every UI click as learning.

Supported action vocabulary:

`BPM_CHANGED`, `TRACK_REMOVED`, `EFFECT_CHANGED`, `VOICE_TAKE_SELECTED`, `VOICE_TAKE_REJECTED`, `SFX_VARIATION_SELECTED`, `AGENT_MIX_MODIFIED`, `COMPOSITION_PROPOSAL_ACCEPTED`, `COMPOSITION_PROPOSAL_REJECTED`.

The adapter retains project, session, artifact, target, before/after and correlation metadata so later signal extraction can distinguish direct edits from unrelated activity. A BPM edit declares only its direction (`tempoDirection: increase|decrease`), not an exact preferred BPM. Candidate derivation requires three independent observations across at least two artifacts, rejects contradictory directions, and binds all evidence to the authenticated account. The candidate remains a reviewable hypothesis and is never auto-confirmed.

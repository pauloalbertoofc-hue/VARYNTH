# GameLearningAdapter

The Game adapter translates meaningful Game Studio changes into Experience Events while preserving project, session, artifact, target and before/after context.

Supported actions are `MECHANIC_CHANGED`, `LEVEL_REBUILT`, `ASSET_REJECTED`, `DIFFICULTY_CHANGED` and `AGENT_PROPOSAL_MODIFIED`.

These events are evidence only. The adapter never writes a Preference directly and never treats a playtest result as proof of user preference without an explicit outcome or confirmation.

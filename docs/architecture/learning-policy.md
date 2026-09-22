# Learning Policy

Experience learning is evidence-gated. User actions and explicit outcomes may be eligible; agent-generated actions are never primary evidence; automatic system events are excluded except for explicitly recorded outcomes; and `generatedAutomatically` events are rejected to prevent self-reinforcing loops.

`learningEligible` is an explicit event field, but the policy still evaluates actor and metadata before any consolidation step. A policy decision never grants permissions and never overrides security or current user instructions.

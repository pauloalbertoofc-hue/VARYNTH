/** Stable agent identities shared by Experience controls and Athena runtime scoping. */
export const EXPERIENCE_AGENT_CATALOG = [
  { id: "athena-generalist", name: "Athena Generalista", domain: undefined },
  { id: "justitia", name: "Justitia", domain: "legal" },
  { id: "logos", name: "Logos", domain: "research" },
  { id: "sophia", name: "Sophia", domain: "communication" },
  { id: "musa", name: "Musa", domain: "creativity" },
  { id: "strategos", name: "Strategos", domain: "productivity" },
  { id: "mnemosyne", name: "Mnemosyne", domain: "memory" },
  { id: "critias", name: "Critias", domain: "critical-review" },
  { id: "archivist", name: "Archivist", domain: "archival-research" },
  { id: "bibliotecario", name: "Alexandria", domain: "knowledge-management" },
  { id: "curador-pesquisa", name: "Lumen", domain: "research" },
  { id: "euterpe", name: "Euterpe", domain: "music" },
] as const;

export type ExperienceAgentId = (typeof EXPERIENCE_AGENT_CATALOG)[number]["id"];

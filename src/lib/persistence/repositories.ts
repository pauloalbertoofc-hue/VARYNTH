import { IndexedDbStoreAdapter } from "./indexeddb-adapter";
import {
  Project,
  Task,
  Note,
  VaultItem,
  ChronosEvent,
  Person,
  LabItem,
  ArgumentThesis,
  AcademicResearch,
  EvidenceItem,
  Opportunity,
  ForgeFile,
  TrashItem,
  ActivityLog,
  AthenaMessage,
} from "../types";
import { Artifact } from "../artifacts/types";
import { EpisodicMemoryEntry } from "../athena/memory/memory-manager";
import { ExperienceEvent, ExperienceRecord, Preference } from "../experience/contracts";
import { KnowledgeItem } from "../knowledge/contracts";

export const projectRepository = new IndexedDbStoreAdapter<Project>("projects");
export const taskRepository = new IndexedDbStoreAdapter<Task>("tasks");
export const noteRepository = new IndexedDbStoreAdapter<Note>("notes");
export const vaultRepository = new IndexedDbStoreAdapter<VaultItem>("vault");
export const chronosRepository = new IndexedDbStoreAdapter<ChronosEvent>("chronos");
export const personRepository = new IndexedDbStoreAdapter<Person>("people");
export const labRepository = new IndexedDbStoreAdapter<LabItem>("labs");
export const thesisRepository = new IndexedDbStoreAdapter<ArgumentThesis>("theses");
export const researchRepository = new IndexedDbStoreAdapter<AcademicResearch>("researches");
export const evidenceRepository = new IndexedDbStoreAdapter<EvidenceItem>("evidences");
export const opportunityRepository = new IndexedDbStoreAdapter<Opportunity>("opportunities");
export const forgeRepository = new IndexedDbStoreAdapter<ForgeFile>("forge");
export const trashRepository = new IndexedDbStoreAdapter<TrashItem>("trash");
export const activityRepository = new IndexedDbStoreAdapter<ActivityLog>("activities");
export const artifactRepository = new IndexedDbStoreAdapter<Artifact>("artifacts");
export const athenaMessageRepository = new IndexedDbStoreAdapter<AthenaMessage>("athena_messages");
export const athenaEpisodeRepository = new IndexedDbStoreAdapter<EpisodicMemoryEntry>("athena_episodes");
export const experienceEventRepository = new IndexedDbStoreAdapter<ExperienceEvent>("experience_events");
export const experiencePreferenceRepository = new IndexedDbStoreAdapter<Preference>("experience_preferences");
export const experienceRepository = new IndexedDbStoreAdapter<ExperienceRecord>("experience_records");
export const knowledgeRepository = new IndexedDbStoreAdapter<KnowledgeItem>("knowledge_items");

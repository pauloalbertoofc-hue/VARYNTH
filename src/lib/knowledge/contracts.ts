export type KnowledgeVisibility = "PRIVATE" | "AGENT_PRIVATE" | "PROJECT" | "DOMAIN" | "CROSS_DOMAIN" | "PUBLIC_TO_AGENTS" | "SYSTEM";
export type KnowledgeKind = "REFERENCE" | "DOCUMENT" | "MANUAL" | "DOCTRINE" | "SPECIFICATION" | "PROJECT" | "AGENT_GENERATED" | "USER_PROVIDED" | "SYSTEM" | "PUBLIC_DOMAIN" | "EXPERIENCE_DERIVED";
export type KnowledgeAssertion = "FACT" | "INTERPRETATION" | "OPINION" | "HYPOTHESIS" | "PROCEDURE" | "REFERENCE";
export type SourceAuthority = "PRIMARY_SOURCE" | "OFFICIAL_REFERENCE" | "USER_PROVIDED" | "INTERNAL_DOCUMENT" | "AGENT_GENERATED" | "EXPERIENCE_DERIVED" | "UNKNOWN";

export interface KnowledgeProvenance {
  sourceType: string;
  sourceReference?: string;
  addedBy: "USER" | "AGENT" | "SYSTEM";
  agentId?: string;
  createdAt: string;
  observedAt?: string;
  derivedFromIds?: string[];
  authority: SourceAuthority;
  inferred: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  primaryDomain: string;
  relatedDomains: string[];
  categories: string[];
  tags: string[];
  ownerAgent?: string;
  contributingAgents: string[];
  visibility: KnowledgeVisibility;
  sensitivity: "PUBLIC" | "INTERNAL" | "SENSITIVE" | "PRIVATE";
  kind: KnowledgeKind;
  assertion: KnowledgeAssertion;
  provenance: KnowledgeProvenance;
  version: number;
  freshness: "CURRENT" | "POSSIBLY_STALE" | "HISTORICAL" | "UNKNOWN";
  validFrom?: string;
  validUntil?: string;
  relatedProjectIds: string[];
  relatedArtifactIds: string[];
  createdAt: string;
  updatedAt: string;
  classification?: { confidence: number; source: "INFERRED" | "USER_CORRECTED" | "SYSTEM"; classifiedAt: string };
  conflictGroupId?: string;
  supersedesId?: string;
  invalidatedAt?: string;
}

export type KnowledgePolicyDecision = "ALLOW" | "DENY" | "ALLOW_SUMMARY" | "ALLOW_PUBLIC_ONLY" | "REQUIRE_DELEGATION";
export type KnowledgeAccessOperation = "CAN_DISCOVER" | "CAN_READ" | "CAN_QUERY" | "CAN_DELEGATE" | "CAN_MODIFY" | "CAN_PUBLISH";

export interface KnowledgeQuery {
  requester: string;
  domain?: string;
  query?: string;
  projectId?: string;
  purpose: string;
  scope?: "PUBLIC" | "PROJECT" | "DOMAIN" | "ALL";
  limit?: number;
  operation?: KnowledgeAccessOperation;
}

export interface KnowledgeDiscovery {
  id: string;
  title: string;
  primaryDomain: string;
  relatedDomains: string[];
  ownerAgent?: string;
  visibility: KnowledgeVisibility;
  kind: KnowledgeKind;
  freshness: KnowledgeItem["freshness"];
  authority: SourceAuthority;
  canQuery: boolean;
  canDiscover: boolean;
  canRead: boolean;
}

export type KnowledgeRelationshipType = "BELONGS_TO" | "OWNED_BY" | "RELATED_TO" | "DERIVED_FROM" | "USED_BY" | "PRODUCED_BY" | "REFERENCES" | "SPECIALIZES_IN" | "DEPENDS_ON" | "APPLIES_TO";
export interface KnowledgeRelationship { id: string; fromId: string; toId: string; type: KnowledgeRelationshipType; createdAt: string; provenanceId?: string; }

export interface KnowledgeAccessDecision {
  decision: KnowledgePolicyDecision;
  reason: string;
}

export interface KnowledgeAccessLog {
  id: string;
  requester: string;
  provider?: string;
  domain?: string;
  purpose: string;
  knowledgeIds: string[];
  decision: KnowledgePolicyDecision;
  createdAt: string;
}

import { experienceRepository } from "@/lib/persistence/repositories";
import type { ExperienceRecord, EvidenceRef } from "./contracts";
import { getExperienceOwnerId } from "./identity";
import { domainRegistry } from "@/lib/knowledge/domain-registry";

export interface ExperiencePattern {
  id: string;
  domain: string;
  key: string;
  description: string;
  occurrences: number;
  confidence: number;
  evidence: EvidenceRef[];
  firstObservedAt: string;
  lastObservedAt: string;
}

export interface ExperienceInsight {
  id: string;
  patternId: string;
  statement: string;
  confidence: number;
  evidence: EvidenceRef[];
  generatedAt: string;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function patternKey(record: ExperienceRecord): string {
  return `${record.domain}:${normalize(record.situation)}:${normalize(record.action)}:${normalize(record.outcome)}`;
}

function confidence(records: ExperienceRecord[]): number {
  const average = records.reduce((sum, record) => sum + record.confidence, 0) / records.length;
  return Math.round(Math.min(1, average * Math.min(1, records.length / 3)) * 100) / 100;
}

export async function deriveExperiencePatterns(domain?: string, minimumOccurrences = 2, requestedOwnerId?: string): Promise<ExperiencePattern[]> {
  const ownerId = await getExperienceOwnerId(requestedOwnerId);
  const records = await experienceRepository.getAll((record) => record.ownerId === ownerId && (!domain || domainRegistry.isWithinDomain(domain, record.domain)));
  const groups = new Map<string, ExperienceRecord[]>();
  for (const record of records) groups.set(patternKey(record), [...(groups.get(patternKey(record)) ?? []), record]);
  return [...groups.entries()]
    .filter(([, entries]) => entries.length >= minimumOccurrences)
    .map(([key, entries]) => {
      const ordered = [...entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      const evidence = ordered.flatMap((entry) => entry.evidence).filter((ref, index, all) => all.findIndex((candidate) => candidate.eventId === ref.eventId) === index);
      return { id: `pattern-${encodeURIComponent(key)}`, domain: ordered[0].domain, key, description: `${ordered.length} experiências repetem a mesma relação entre situação, ação e resultado.`, occurrences: ordered.length, confidence: confidence(ordered), evidence, firstObservedAt: ordered[0].createdAt, lastObservedAt: ordered.at(-1)!.createdAt };
    })
    .sort((left, right) => right.confidence - left.confidence || right.occurrences - left.occurrences);
}

export async function deriveExperienceInsights(domain?: string, ownerId?: string): Promise<ExperienceInsight[]> {
  const patterns = await deriveExperiencePatterns(domain, 2, ownerId);
  return patterns.map((pattern) => ({ id: `insight-${pattern.id}`, patternId: pattern.id, statement: `No domínio ${pattern.domain}, a experiência acumulada sugere repetir a relação observada antes de propor uma alternativa.`, confidence: pattern.confidence, evidence: pattern.evidence, generatedAt: new Date().toISOString() }));
}

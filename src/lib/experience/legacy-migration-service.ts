import { experienceEventRepository, experiencePreferenceRepository, experienceRepository, learningExclusionRepository } from "@/lib/persistence/repositories";
import { LegacyExperienceMigrationService } from "./identity";

export const legacyExperienceMigrationService = new LegacyExperienceMigrationService({
  events: experienceEventRepository,
  preferences: experiencePreferenceRepository,
  experiences: experienceRepository,
  exclusions: learningExclusionRepository,
});

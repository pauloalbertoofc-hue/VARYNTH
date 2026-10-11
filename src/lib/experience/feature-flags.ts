export interface ExperienceFeatureFlags {
  enabled: boolean;
  preferenceInferenceEnabled: boolean;
  projectRetrospectivesEnabled: boolean;
}

export type ExperienceFeatureEnvironment = Record<string, string | undefined>;

const DEFAULTS: ExperienceFeatureFlags = {
  enabled: true,
  preferenceInferenceEnabled: true,
  projectRetrospectivesEnabled: true,
};

const ENV_KEYS: Record<keyof ExperienceFeatureFlags, string> = {
  enabled: "NEXT_PUBLIC_VARYNTH_EXPERIENCE_ENABLED",
  preferenceInferenceEnabled: "NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED",
  projectRetrospectivesEnabled: "NEXT_PUBLIC_VARYNTH_EXPERIENCE_PROJECT_RETROSPECTIVES_ENABLED",
};

function parseFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return !/^(0|false|off|no|disabled)$/i.test(value.trim());
}

function runtimeEnvironment(): ExperienceFeatureEnvironment {
  if (typeof process === "undefined") return {};
  return {
    [ENV_KEYS.enabled]: process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_ENABLED,
    [ENV_KEYS.preferenceInferenceEnabled]: process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED,
    [ENV_KEYS.projectRetrospectivesEnabled]: process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_PROJECT_RETROSPECTIVES_ENABLED,
  };
}

/** Release-time kill switches; every feature remains enabled unless explicitly disabled. */
export function resolveExperienceFeatureFlags(
  environment: ExperienceFeatureEnvironment = runtimeEnvironment(),
  overrides: Partial<ExperienceFeatureFlags> = {},
): ExperienceFeatureFlags {
  return {
    enabled: overrides.enabled ?? parseFlag(environment[ENV_KEYS.enabled], DEFAULTS.enabled),
    preferenceInferenceEnabled: overrides.preferenceInferenceEnabled
      ?? parseFlag(environment[ENV_KEYS.preferenceInferenceEnabled], DEFAULTS.preferenceInferenceEnabled),
    projectRetrospectivesEnabled: overrides.projectRetrospectivesEnabled
      ?? parseFlag(environment[ENV_KEYS.projectRetrospectivesEnabled], DEFAULTS.projectRetrospectivesEnabled),
  };
}

export function experienceContextUnavailable(): {
  preferences: [];
  experiences: [];
  instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION";
  generatedAt: string;
  truncated: false;
} {
  return {
    preferences: [],
    experiences: [],
    instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION",
    generatedAt: new Date().toISOString(),
    truncated: false,
  };
}

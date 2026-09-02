/**
 * VARYNTH OS — External Application Registry
 *
 * Single Source of Truth for external and local companion integrations.
 */

export interface ExternalAppDefinition {
  id: string;
  name: string;
  type: "LOCAL_EXTERNAL" | "REMOTE_EXTERNAL";
  url: string;
  description: string;
  icon: string;
  badge: string;
  category: string;
  healthCheckStrategy: "PROBE_OPTIONAL" | "NONE";
  instructions: string;
}

export const EXTERNAL_APP_REGISTRY: Record<string, ExternalAppDefinition> = {
  ligahub: {
    id: "ligahub",
    name: "LigaHub",
    type: "LOCAL_EXTERNAL",
    url: "http://localhost:8000",
    description: "Sistema operacional completo para gestão da Liga Acadêmica (membros, presença, financeiro).",
    icon: "🏛️",
    badge: "Serviço Local",
    category: "gestao",
    healthCheckStrategy: "PROBE_OPTIONAL",
    instructions: "Para acessar o LigaHub, certifique-se de que o servidor local está em execução na porta 8000.",
  },
};

export function getExternalApp(id: string): ExternalAppDefinition | undefined {
  return EXTERNAL_APP_REGISTRY[id];
}


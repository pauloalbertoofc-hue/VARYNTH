import { VarynthModule } from "./types";

// Registry of all VARYNTH modules
// Add new projects here as you build them!
export const modules: VarynthModule[] = [
  {
    id: "ligahub",
    name: "LigaHub",
    description: "Sistema de gestão completo para a Liga Acadêmica. Membros, frequência, kanban e financeiro.",
    icon: "🏛️",
    color: "cyan",
    href: "http://localhost:8000",
    status: "active",
    tags: ["gestão", "academia", "qr-code"],
    version: "1.0.0",
  },
  {
    id: "athena",
    name: "Athena",
    description: "Sua IA pessoal integrada ao VARYNTH. Converse, crie, explore e automatize.",
    icon: "🦉",
    color: "violet",
    href: "/modules/athena",
    status: "wip",
    tags: ["ia", "chat", "automação"],
    version: "0.1.0",
  },
  {
    id: "studio",
    name: "Studio",
    description: "Editor de código embutido estilo VS Code. Edite e crie projetos direto no VARYNTH.",
    icon: "⚡",
    color: "orange",
    href: "/modules/studio",
    status: "coming-soon",
    tags: ["editor", "código", "dev"],
  },
];


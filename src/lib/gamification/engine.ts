import {
  Project,
  Task,
  VaultItem,
  ArgumentThesis,
  EvidenceItem,
  Opportunity,
  ForgeFile,
} from "../types";

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  category: "sistema" | "juridico" | "pesquisa" | "produtividade" | "dev";
}

export interface GamificationStats {
  totalXP: number;
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  badges: AchievementBadge[];
}

const LEVEL_TITLES = [
  "Iniciado Digital",
  "Operador de Sistemas",
  "Arquiteto Epistêmico",
  "Dialético Hermenêutico",
  "Pesquisador Empírico",
  "Mestre do VARYNTH OS",
  "Oráculo Cognitivo",
  "Grande Arquiteto Digital",
];

export function calculateGamification(ctx: {
  projects: Project[];
  tasks: Task[];
  vaultItems: VaultItem[];
  theses: ArgumentThesis[];
  evidences: EvidenceItem[];
  opportunities: Opportunity[];
  forgeFiles: ForgeFile[];
}): GamificationStats {
  const completedTasks = ctx.tasks.filter((t) => t.status === "concluida").length;
  const activeProjects = ctx.projects.length;
  const vaultCount = ctx.vaultItems.length;
  const thesesCount = ctx.theses.length;
  const evidencesCount = ctx.evidences.length;
  const oppsCount = ctx.opportunities.length;
  const forgeCount = ctx.forgeFiles.length;

  // XP Breakdown
  const xpTasks = completedTasks * 50;
  const xpProjects = activeProjects * 150;
  const xpVault = vaultCount * 30;
  const xpTheses = thesesCount * 100;
  const xpEvidences = evidencesCount * 40;
  const xpOpps = oppsCount * 60;
  const xpForge = forgeCount * 40;

  const totalXP = xpTasks + xpProjects + xpVault + xpTheses + xpEvidences + xpOpps + xpForge + 250; // 250 Base Founder XP

  // Level Curve: Level = floor(sqrt(XP / 80)) + 1
  const level = Math.max(1, Math.floor(Math.sqrt(totalXP / 80)));
  const titleIndex = Math.min(Math.floor((level - 1) / 2), LEVEL_TITLES.length - 1);
  const title = LEVEL_TITLES[titleIndex] || "Mestre Digital";

  const currentLevelMinXP = Math.pow(level, 2) * 80;
  const nextLevelXP = Math.pow(level + 1, 2) * 80;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalXP - currentLevelMinXP) / (nextLevelXP - currentLevelMinXP)) * 100))
  );

  // Badges
  const badges: AchievementBadge[] = [
    {
      id: "badge-genesis",
      title: "Gênese do Universo",
      description: "Inicializou o VARYNTH OS com sucesso.",
      icon: "🌌",
      unlocked: true,
      category: "sistema",
    },
    {
      id: "badge-architect",
      title: "Arquiteto de Projetos",
      description: "Criou pelo menos 2 workspaces ativas de trabalho.",
      icon: "🏛️",
      unlocked: activeProjects >= 2,
      category: "sistema",
    },
    {
      id: "badge-dialectics",
      title: "Mestre Dialético",
      description: "Estruturou ao menos 1 tese completa na Argument Arena.",
      icon: "⚖️",
      unlocked: thesesCount >= 1,
      category: "juridico",
    },
    {
      id: "badge-empirical",
      title: "Empirista Rigoroso",
      description: "Catalogou 3 ou mais evidências científicas no Evidence Board.",
      icon: "🔬",
      unlocked: evidencesCount >= 3,
      category: "pesquisa",
    },
    {
      id: "badge-scout",
      title: "Radar de Oportunidades",
      description: "Mapeou 2 ou mais editais ou bolsas de fomento.",
      icon: "🏆",
      unlocked: oppsCount >= 2,
      category: "produtividade",
    },
    {
      id: "badge-developer",
      title: "Mestre do Forge",
      description: "Criou e executou scripts no Forge Studio.",
      icon: "⚡",
      unlocked: forgeCount >= 2,
      category: "dev",
    },
    {
      id: "badge-knowledge",
      title: "Segundo Cérebro Vivo",
      description: "Adicionou 3 ou mais obras ao Vault de conhecimento.",
      icon: "📚",
      unlocked: vaultCount >= 3,
      category: "sistema",
    },
  ];

  return {
    totalXP,
    level,
    title,
    currentLevelXP: totalXP - currentLevelMinXP,
    nextLevelXP: nextLevelXP - currentLevelMinXP,
    progressPercent,
    badges,
  };
}

import { ArtifactType } from "../artifacts/types";

export type StudioType = "DOCUMENT" | "WEB" | "IMAGE" | "AUDIO" | "VIDEO" | "GAME";

export interface StudioDefinition {
  type: StudioType;
  label: string;
  shortLabel: string;
  studioNumber: number;
  description: string;
  iconName: "FileText" | "Globe" | "Image" | "Music" | "Video" | "Gamepad2";
  href: string;
  color: string;
  badge: string;
  artifactType: ArtifactType;
  creationLabel: string;
  quickActionTitle: string;
  quickActionDescription: string;
  keywords: string[];
}

export const STUDIO_DEFINITIONS: StudioDefinition[] = [
  {
    type: "DOCUMENT",
    label: "Document Studio",
    shortLabel: "Document",
    studioNumber: 1,
    description: "Criação e versionamento de monografias, pareceres, artigos e roteiros com split view e exportação Markdown/PDF.",
    iconName: "FileText",
    href: "/modules/studio?studio=DOCUMENT",
    color: "blue",
    badge: "Studio 1",
    artifactType: "DOCUMENT",
    creationLabel: "Novo Documento",
    quickActionTitle: "Criar Novo Documento",
    quickActionDescription: "Abrir Document Studio para redigir textos e roteiros",
    keywords: ["documento", "texto", "artigo", "parecer", "markdown", "pdf", "roteiro", "document"],
  },
  {
    type: "WEB",
    label: "Web Studio",
    shortLabel: "Web",
    studioNumber: 2,
    description: "Desenvolvimento de páginas e aplicações web multi-arquivos com Live Preview Sandbox e build estático.",
    iconName: "Globe",
    href: "/modules/studio?studio=WEB",
    color: "cyan",
    badge: "Studio 2",
    artifactType: "WEBSITE",
    creationLabel: "Novo Website",
    quickActionTitle: "Criar Novo Website",
    quickActionDescription: "Abrir Web Studio para criar páginas HTML/CSS/JS",
    keywords: ["web", "website", "html", "css", "javascript", "landing", "site", "app"],
  },
  {
    type: "IMAGE",
    label: "Image Studio",
    shortLabel: "Image",
    studioNumber: 3,
    description: "Canvas 2D interativo com camadas, formas, tipografia e renderização determinística em PNG/JPEG.",
    iconName: "Image",
    href: "/modules/studio?studio=IMAGE",
    color: "purple",
    badge: "Studio 3",
    artifactType: "IMAGE",
    creationLabel: "Nova Imagem",
    quickActionTitle: "Criar Nova Imagem",
    quickActionDescription: "Abrir Image Studio para criar designs, capas e infográficos",
    keywords: ["imagem", "canvas", "design", "camadas", "png", "jpeg", "arte", "banner", "image"],
  },
  {
    type: "AUDIO",
    label: "Audio Studio",
    shortLabel: "Audio",
    studioNumber: 4,
    description: "Estação de áudio multifaixas (DAW) com waveform, cortes, mixagem e renderização WAV 16-bit.",
    iconName: "Music",
    href: "/modules/studio?studio=AUDIO",
    color: "amber",
    badge: "Studio 4",
    artifactType: "AUDIO",
    creationLabel: "Novo Projeto de Áudio",
    quickActionTitle: "Criar Novo Projeto de Áudio",
    quickActionDescription: "Abrir Audio Studio para gravar, editar e mixar faixas de som",
    keywords: ["audio", "som", "musica", "podcast", "trilha", "daw", "wav", "mixagem", "sound"],
  },
  {
    type: "VIDEO",
    label: "Video Studio",
    shortLabel: "Video",
    studioNumber: 5,
    description: "Composição audiovisual em timeline com takes, legendas, transformações de cena e exportação WebM.",
    iconName: "Video",
    href: "/modules/studio?studio=VIDEO",
    color: "rose",
    badge: "Studio 5",
    artifactType: "VIDEO",
    creationLabel: "Novo Vídeo",
    quickActionTitle: "Criar Novo Vídeo",
    quickActionDescription: "Abrir Video Studio para editar e compor vídeos com timeline",
    keywords: ["video", "filme", "timeline", "clipe", "webm", "montagem", "cinema", "cutscene"],
  },
  {
    type: "GAME",
    label: "Game Studio",
    shortLabel: "Game",
    studioNumber: 6,
    description: "Engine 2D completa com cenas, entidades, regras visuais, Play Mode isolado e compilação Web HTML5.",
    iconName: "Gamepad2",
    href: "/modules/studio?studio=GAME",
    color: "emerald",
    badge: "Studio 6",
    artifactType: "GAME",
    creationLabel: "Novo Jogo 2D",
    quickActionTitle: "Criar Novo Jogo 2D",
    quickActionDescription: "Abrir Game Studio para criar e testar jogos interativos",
    keywords: ["game", "jogo", "engine", "2d", "entidades", "regras", "playtest", "gdd"],
  },
];

export function getStudioDefinition(type: StudioType): StudioDefinition {
  const found = STUDIO_DEFINITIONS.find((s) => s.type === type);
  return found || STUDIO_DEFINITIONS[0];
}

export function getStudioByArtifactType(artifactType: ArtifactType): StudioDefinition | undefined {
  if (artifactType === "CODE") return getStudioDefinition("WEB");
  return STUDIO_DEFINITIONS.find((s) => s.artifactType === artifactType);
}

export function isValidStudioType(val: string): val is StudioType {
  return ["DOCUMENT", "WEB", "IMAGE", "AUDIO", "VIDEO", "GAME"].includes(val.toUpperCase());
}


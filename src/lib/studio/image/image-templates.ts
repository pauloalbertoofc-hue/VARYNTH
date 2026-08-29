import { ImageCanvasConfig, ImageLayer } from "./types";

export interface ImageTemplate {
  id: string;
  name: string;
  category: "GENERAL" | "SOCIAL" | "PRESENTATION" | "BANNER";
  description: string;
  canvas: ImageCanvasConfig;
  initialLayers: ImageLayer[];
}

export const IMAGE_TEMPLATES: ImageTemplate[] = [
  {
    id: "blank",
    name: "Canvas em Branco",
    category: "GENERAL",
    description: "Espaço de trabalho livre Full HD (1920x1080) com fundo escuro padrão.",
    canvas: {
      width: 1920,
      height: 1080,
      background: "#0b0c16",
    },
    initialLayers: [],
  },
  {
    id: "square-post",
    name: "Post Quadrado (1:1)",
    category: "SOCIAL",
    description: "Formato quadrado 1080x1080 ideal para comunicados, cards e diagramas.",
    canvas: {
      width: 1080,
      height: 1080,
      background: "#0e101f",
    },
    initialLayers: [
      {
        id: "layer-bg-shape",
        type: "SHAPE",
        name: "Fundo com Borda",
        visible: true,
        locked: false,
        opacity: 1,
        transform: {
          x: 40,
          y: 40,
          width: 1000,
          height: 1000,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        shapeType: "rectangle",
        shapeStyle: {
          fill: "#14172e",
          stroke: "#2a2f58",
          strokeWidth: 4,
          borderRadius: 24,
        },
      },
      {
        id: "layer-title",
        type: "TEXT",
        name: "Título Principal",
        visible: true,
        locked: false,
        opacity: 1,
        transform: {
          x: 100,
          y: 480,
          width: 880,
          height: 120,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        textContent: "VARYNTH OS",
        textStyle: {
          fontFamily: "sans-serif",
          fontSize: 64,
          fontWeight: "bold",
          fill: "#60a5fa",
          align: "center",
          lineHeight: 1.2,
        },
      },
    ],
  },
  {
    id: "vertical-story",
    name: "Story / Vertical (9:16)",
    category: "SOCIAL",
    description: "Proporção vertical 1080x1920 para apresentações móveis e infográficos.",
    canvas: {
      width: 1080,
      height: 1920,
      background: "#080914",
    },
    initialLayers: [
      {
        id: "layer-story-title",
        type: "TEXT",
        name: "Título do Story",
        visible: true,
        locked: false,
        opacity: 1,
        transform: {
          x: 100,
          y: 300,
          width: 880,
          height: 100,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        textContent: "Destaque Estratégico",
        textStyle: {
          fontFamily: "sans-serif",
          fontSize: 54,
          fontWeight: "bold",
          fill: "#ffffff",
          align: "center",
          lineHeight: 1.2,
        },
      },
    ],
  },
  {
    id: "presentation-slide",
    name: "Slide de Apresentação (16:9)",
    category: "PRESENTATION",
    description: "Layout limpo 1920x1080 para gráficos, relatórios e sínteses visuais.",
    canvas: {
      width: 1920,
      height: 1080,
      background: "#0f1122",
    },
    initialLayers: [
      {
        id: "layer-slide-header",
        type: "TEXT",
        name: "Cabeçalho do Slide",
        visible: true,
        locked: false,
        opacity: 1,
        transform: {
          x: 120,
          y: 120,
          width: 1680,
          height: 80,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        textContent: "Arquitetura Soberana VARYNTH",
        textStyle: {
          fontFamily: "sans-serif",
          fontSize: 48,
          fontWeight: "bold",
          fill: "#38bdf8",
          align: "left",
          lineHeight: 1.2,
        },
      },
    ],
  },
  {
    id: "thumbnail",
    name: "Thumbnail / Capa de Vídeo",
    category: "BANNER",
    description: "Dimensões 1280x720 ideais para capas de vídeos, portais e módulos.",
    canvas: {
      width: 1280,
      height: 720,
      background: "#090a12",
    },
    initialLayers: [
      {
        id: "layer-thumb-badge",
        type: "SHAPE",
        name: "Badge de Destaque",
        visible: true,
        locked: false,
        opacity: 0.9,
        transform: {
          x: 80,
          y: 80,
          width: 220,
          height: 48,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        shapeType: "rectangle",
        shapeStyle: {
          fill: "#2563eb",
          stroke: "#3b82f6",
          strokeWidth: 2,
          borderRadius: 8,
        },
      },
      {
        id: "layer-thumb-title",
        type: "TEXT",
        name: "Título da Thumbnail",
        visible: true,
        locked: false,
        opacity: 1,
        transform: {
          x: 80,
          y: 320,
          width: 1120,
          height: 140,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        textContent: "IMAGE STUDIO V1",
        textStyle: {
          fontFamily: "sans-serif",
          fontSize: 64,
          fontWeight: "bold",
          fill: "#ffffff",
          align: "left",
          lineHeight: 1.1,
        },
      },
    ],
  },
  {
    id: "poster",
    name: "Poster / Cartaz Vertical",
    category: "GENERAL",
    description: "Proporção vertical 1200x1600 com alta fidelidade para cartazes e capas de documentos.",
    canvas: {
      width: 1200,
      height: 1600,
      background: "#0c0d18",
    },
    initialLayers: [],
  },
];


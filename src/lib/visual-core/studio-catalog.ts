export type VisualWorkflow = "CAPTURE" | "ENHANCE" | "EDIT" | "CREATE" | "ANALYZE" | "PRODUCE";
export type VisualCapabilityStatus = "READY" | "PARTIAL" | "PLANNED";

export type VisualStudioCapability = {
  id: string;
  name: string;
  workflow: VisualWorkflow;
  description: string;
  status: VisualCapabilityStatus;
  href?: string;
  evidence: string;
};

export const visualCapabilities: VisualStudioCapability[] = [
  { id: "camera", name: "Varynth Camera", workflow: "CAPTURE", description: "Captura real do dispositivo, capacidades detectadas e proveniência preservada.", status: "READY", href: "/modules/camera", evidence: "CameraSession + MediaStream + Camera Library" },
  { id: "image-editing", name: "Image Studio", workflow: "EDIT", description: "Camadas, canvas, histórico, importação/exportação e documento visual universal.", status: "READY", href: "/modules/studio?studio=IMAGE", evidence: "imageService + ImageCanvas + VisualDocument" },
  { id: "visual-document", name: "Visual Document", workflow: "PRODUCE", description: "Contrato versionado para transportar imagens, objetos, metadados e proveniência.", status: "READY", href: "/modules/studio?studio=IMAGE", evidence: "varynth.visual-document v1" },
  { id: "processing-graph", name: "Processing Graph", workflow: "ENHANCE", description: "Grafo tipado com validação, ordem topológica, cache e cancelamento.", status: "READY", evidence: "Visual Core processing runtime" },
  { id: "color", name: "Color Engine", workflow: "ENHANCE", description: "Operações de cor determinísticas para composição e análise local.", status: "READY", evidence: "Visual Core color engine" },
  { id: "geometry", name: "Geometry Engine", workflow: "CREATE", description: "Transformações, bounding boxes e snapping para objetos visuais.", status: "READY", evidence: "Visual Core geometry engine" },
  { id: "masks", name: "Mask Engine", workflow: "EDIT", description: "Máscaras raster combináveis para operações não destrutivas.", status: "READY", evidence: "Visual Core mask engine" },
  { id: "quality", name: "Capture Quality Gate", workflow: "ANALYZE", description: "Métricas locais de nitidez, exposição e alertas técnicos.", status: "READY", evidence: "camera-quality + persisted report" },
  { id: "painting", name: "Digital Painting Studio", workflow: "CREATE", description: "Canvas local com pincel, borracha, limpeza, PNG e abertura no Image Studio.", status: "READY", href: "/modules/digital-painting", evidence: "Canvas 2D + PNG export + Image Studio import" },
  { id: "vector", name: "Vector Studio", workflow: "CREATE", description: "Formas, texto e curvas Bézier SVG parametrizadas, inspector, rascunho local, exportação e abertura no Image Studio.", status: "PARTIAL", href: "/modules/vector-studio", evidence: "SVG editor + Bézier frame + localStorage draft + Image Studio import; nós/booleanos ainda ausentes" },
  { id: "shader", name: "Shader Forge", workflow: "CREATE", description: "Preview WebGL2 procedural determinístico com uniforms locais, diagnóstico de compilação, fallback 2D e exportação PNG, sem execução arbitrária.", status: "PARTIAL", href: "/modules/shader-forge", evidence: "Vertex/fragment shader fixos + uniforms + fallback 2D + parâmetros locais + PNG export" },
  { id: "rendering-3d", name: "3D & Rendering Studio", workflow: "CREATE", description: "Cena WebGL2 local com malha parametrizada, câmera, materiais procedurais, luz direcional, persistência e exportação PNG.", status: "PARTIAL", href: "/modules/rendering-3d", evidence: "Cubo indexado + matriz de câmera + materiais sólido/xadrez/bandas + luz local + localStorage + PNG export; iluminação física e importação de malhas ainda ausentes" },
  { id: "mathematical-art", name: "Mathematical Art Studio", workflow: "CREATE", description: "Fractais Mandelbrot e Julia determinísticos com parâmetros persistentes, exportação PNG e abertura no Image Studio.", status: "PARTIAL", href: "/modules/mathematical-art", evidence: "Renderização CPU local + iterações/zoom/C parametrizados + PNG export + Image Studio import; aceleração GPU ainda ausente" },
  { id: "pictor", name: "Pictor", workflow: "ANALYZE", description: "Agente consultivo que analisa texto e métricas locais de qualidade/proveniência, com histórico local recuperável, sem acesso direto à mídia.", status: "PARTIAL", href: "/modules/visual-studio", evidence: "PictorAgent + Quality Gate + histórico local limitado + fronteira advisory-only" },
];

export const visualWorkflows: Array<{ id: VisualWorkflow; name: string; description: string }> = [
  { id: "CAPTURE", name: "Capture", description: "Aquisição de informação visual sem confundir origem com geração." },
  { id: "ENHANCE", name: "Enhance", description: "Melhoria técnica e reversível da apresentação." },
  { id: "EDIT", name: "Edit", description: "Alteração criativa ou estrutural de documentos existentes." },
  { id: "CREATE", name: "Create", description: "Construção de novos objetos, cenas e artefatos." },
  { id: "ANALYZE", name: "Analyze", description: "Leitura técnica, científica e contextual dos dados visuais." },
  { id: "PRODUCE", name: "Produce", description: "Exportação e integração com os demais módulos do Varynth." },
];

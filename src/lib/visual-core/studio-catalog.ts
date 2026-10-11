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
  { id: "vector", name: "Vector Studio", workflow: "CREATE", description: "Objetos SVG editáveis, inspector, rascunho local, exportação e abertura no Image Studio.", status: "READY", href: "/modules/vector-studio", evidence: "SVG editor + localStorage draft + Image Studio import" },
  { id: "shader", name: "Shader Forge", workflow: "CREATE", description: "Preview procedural determinístico com parâmetros locais e exportação PNG, sem execução arbitrária.", status: "PARTIAL", href: "/modules/shader-forge", evidence: "Canvas procedural + localStorage parameters + PNG export" },
  { id: "pictor", name: "Pictor", workflow: "ANALYZE", description: "Agente visual com assistência contextual e operações autorizadas.", status: "PARTIAL", evidence: "Contratos de integração ainda não expõem agente visual" },
];

export const visualWorkflows: Array<{ id: VisualWorkflow; name: string; description: string }> = [
  { id: "CAPTURE", name: "Capture", description: "Aquisição de informação visual sem confundir origem com geração." },
  { id: "ENHANCE", name: "Enhance", description: "Melhoria técnica e reversível da apresentação." },
  { id: "EDIT", name: "Edit", description: "Alteração criativa ou estrutural de documentos existentes." },
  { id: "CREATE", name: "Create", description: "Construção de novos objetos, cenas e artefatos." },
  { id: "ANALYZE", name: "Analyze", description: "Leitura técnica, científica e contextual dos dados visuais." },
  { id: "PRODUCE", name: "Produce", description: "Exportação e integração com os demais módulos do Varynth." },
];

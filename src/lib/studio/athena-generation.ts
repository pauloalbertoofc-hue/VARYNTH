import { getStudioDefinition, type StudioType } from "./studio-registry";
import { artifactService } from "../artifacts/artifact-service";
import { artifactStore } from "../artifacts/artifact-store";
import type { ImageLayer } from "./image/types";

export interface StudioGenerationResult { artifactId: string; studio: StudioType; href: string; description: string }

/** Browser-native composition. These capabilities do not claim neural media generation. */
export async function generateStudioDraft(studio: StudioType, brief: string, requestId: string, conversationId?: string): Promise<StudioGenerationResult> {
  const existing = artifactStore.getAll().find(a => a.metadata.athenaRequestId === requestId && a.status !== "TRASHED");
  const href = (id: string) => `${getStudioDefinition(studio).href}&id=${encodeURIComponent(id)}${conversationId ? `&conversation=${encodeURIComponent(conversationId)}` : ""}`;
  if (existing) return { artifactId: existing.id, studio, href: href(existing.id), description: String(existing.metadata.generationDescription) };
  const name = brief.replace(/^\d+[.)]\s*/, "").slice(0, 80);
  const clean = brief.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let artifactId = "";
  let description = "";
  function requireSuccess(result: { success: boolean; error?: string }) { if (!result.success) throw new Error(result.error || "O Studio não conseguiu salvar o resultado."); }

  if (studio === "IMAGE") {
    const { imageService } = await import("./image/image-service");
    const result = await imageService.createImage({ name, customCanvas: { width: 1080, height: 1350, background: "#080b18" }, actor: "ATHENA" });
    requireSuccess(result);
    const item = result.image!;
    artifactId = item.artifact.id;
    const layers: ImageLayer[] = [];
    const shape = (x: number, y: number, width: number, height: number, fill: string, label: string) => {
      layers.push({ id: `generated-${layers.length}`, name: label, type: "SHAPE", visible: true, locked: false, opacity: 1, transform: { x, y, width, height, scaleX: 1, scaleY: 1, rotation: 0 }, shapeType: "rectangle", shapeStyle: { fill, stroke: fill, strokeWidth: 0, borderRadius: 2 } });
    };
    if (/labirinto|caos/.test(clean)) {
      // Connected maze with a highlighted route; every wall remains individually editable.
      const size = 13, cell = 68, left = 98, top = 210;
      let seed = [...brief].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const visited = new Set<number>([0]), edges = new Set<string>(), parents = new Map<number, number>();
      const stack = [0];
      const edge = (a: number, b: number) => `${Math.min(a,b)}:${Math.max(a,b)}`;
      while (stack.length) {
        const a = stack.at(-1)!, x = a % size, y = Math.floor(a / size);
        const neighbors = [x > 0 ? a-1 : -1, x < size-1 ? a+1 : -1, y > 0 ? a-size : -1, y < size-1 ? a+size : -1].filter(b => b >= 0 && !visited.has(b));
        if (!neighbors.length) { stack.pop(); continue; }
        const b = neighbors[Math.floor(random() * neighbors.length)]; visited.add(b); parents.set(b, a); edges.add(edge(a,b)); stack.push(b);
      }
      let end = size*size-1;
      while (parents.has(end)) {
        const parent = parents.get(end)!, x1 = left+(end%size+.5)*cell, y1 = top+(Math.floor(end/size)+.5)*cell;
        const x2 = left+(parent%size+.5)*cell, y2 = top+(Math.floor(parent/size)+.5)*cell;
        shape(Math.min(x1,x2)-5, Math.min(y1,y2)-5, Math.abs(x1-x2)+10, Math.abs(y1-y2)+10, "#22d3ee", "Caminho luminoso"); end = parent;
      }
      for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
        const a=y*size+x;
        if (x===0) shape(left,top+y*cell,5,cell,"#8b5cf6","Parede");
        if (y===0) shape(left+x*cell,top,cell,5,"#8b5cf6","Parede");
        if (x===size-1 || !edges.has(edge(a,a+1))) shape(left+(x+1)*cell,top+y*cell,5,cell,"#8b5cf6","Parede");
        if (y===size-1 || !edges.has(edge(a,a+size))) shape(left+x*cell,top+(y+1)*cell,cell,5,"#8b5cf6","Parede");
      }
      description = "Composição geométrica editável do labirinto com caminho luminoso. Não é uma imagem fotorrealista nem uma reprodução do logotipo.";
    } else {
      shape(70, 70, 940, 1210, "#161c35", "Painel");
      shape(100, 190, 12, 800, /vermelh/.test(clean) ? "#ef4444" : "#8b5cf6", "Destaque");
      layers.push({ id: "brief-title", name: "Título", type: "TEXT", visible: true, locked: false, opacity: 1, transform: { x: 145, y: 400, width: 760, height: 600, scaleX: 1, scaleY: 1, rotation: 0 }, textContent: name, textStyle: { fontFamily: "sans-serif", fontSize: 48, fontWeight: "bold", fill: "#e2e8f0", align: "left", lineHeight: 1.3 } });
      description = "Layout tipográfico editável baseado no pedido. O motor local compõe formas e texto; cenas fotográficas exigem um gerador de imagens adicional.";
    }
    requireSuccess(await imageService.saveDocumentState(artifactId, { ...item.documentState, layers }, "ATHENA"));
  } else if (studio === "DOCUMENT") {
    const { documentService } = await import("./document/document-service");
    const r = await documentService.createDocument({ title: name, createdBy: "ATHENA", initialContent: `# ${name}\n\n## Briefing\n\n${brief}\n\n## Objetivo\n\nDesenvolver o tema descrito no briefing, delimitando público e resultado esperado.\n\n## Desenvolvimento\n\nOrganize os argumentos, exemplos e materiais aqui.\n\n## Revisão\n\nVerifique informações e referências antes de publicar.` });
    requireSuccess(r); artifactId = r.document!.artifact.id; description = "Documento editável com briefing e estrutura inicial; conteúdo e referências ainda precisam de desenvolvimento.";
  } else if (studio === "WEB") {
    const { webService } = await import("./web/web-service");
    const r = await webService.createWebsite({ name, description: brief, templateId: /dashboard/.test(clean) ? "dashboard" : /portfolio/.test(clean) ? "portfolio" : "landing-page", actor: "ATHENA" });
    requireSuccess(r); artifactId = r.website!.artifact.id;
    const escape = (s: string) => s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
    const files = r.website!.files.map(f => f.path === "index.html" ? { ...f, content: f.content.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(name)}</title>`).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, `<h1>${escape(name)}</h1>`) } : f);
    requireSuccess(await webService.saveFiles(artifactId, files, "ATHENA"));
    description = "Página editável baseada em template local, com prévia HTML/CSS. Publicação e serviços de backend não foram executados.";
  } else if (studio === "AUDIO") {
    const { audioService } = await import("./audio/audio-service");
    if (/voz|narracao|podcast|cantar/.test(clean)) {
      const r = await audioService.createAudioProject({ name, templateId: "narration", actor: "ATHENA" }); requireSuccess(r); artifactId = r.audio!.artifact.id;
      description = "Sessão de narração preparada, sem voz gerada: importe uma gravação para continuar. Síntese de voz não está conectada.";
    } else {
      const sampleRate=22050, seconds=8, samples=sampleRate*seconds, wav=new ArrayBuffer(44+samples*2), view=new DataView(wav);
      const ascii=(offset:number,text:string) => [...text].forEach((ch,i)=>view.setUint8(offset+i,ch.charCodeAt(0)));
      ascii(0,"RIFF"); view.setUint32(4,36+samples*2,true); ascii(8,"WAVEfmt "); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); ascii(36,"data"); view.setUint32(40,samples*2,true);
      for(let i=0;i<samples;i++){ const t=i/sampleRate, note=[220,261.63,329.63,293.66][Math.floor(t*2)%4], envelope=Math.min(1,t*10,(seconds-t)*10)*Math.exp(-3*(t%.5)); view.setInt16(44+i*2,Math.sin(2*Math.PI*note*t)*envelope*6500,true); }
      const r=await audioService.importAudio({ name:`${name}.wav`, mimeType:"audio/wav", sizeBytes:wav.byteLength, data:wav, durationMs:seconds*1000, actor:"ATHENA" }); requireSuccess(r); artifactId=r.audio!.artifact.id;
      description="Sequência instrumental sintetizada localmente de 8 segundos, audível e editável em WAV. É um estudo sonoro simples.";
    }
  } else if (studio === "VIDEO") {
    const { videoService } = await import("./video/video-service");
    const r=await videoService.createVideoProject({name,customDimensions:{width:1280,height:720,durationMs:6000},actor:"ATHENA"}); requireSuccess(r); artifactId=r.video!.artifact.id;
    const state=r.video!.documentState;
    state.tracks=[{id:"title-track",name:"Título",type:"TEXT",visible:true,locked:false,order:0,clips:[{id:"title-clip",trackId:"title-track",type:"TEXT",timelineStartMs:0,sourceStartMs:0,sourceEndMs:6000,opacity:1,transform:{x:0,y:0,width:1280,height:720,scaleX:1,scaleY:1,rotation:0,opacity:1},textContent:name,textStyle:{fontFamily:"sans-serif",fontSize:42,fontWeight:"bold",color:"#e2e8f0",backgroundColor:"#101526",alignment:"center",position:{x:640,y:360}}}]}];
    requireSuccess(await videoService.saveDocumentState(artifactId,state,"ATHENA")); description="Composição de título de 6 segundos na timeline, pronta para prévia e exportação suportada pelo navegador. Não contém filmagem gerada.";
  } else {
    const { gameService } = await import("./game/game-service");
    const r=await gameService.createGameProject({name,description:brief,templateId:/quiz/.test(clean)?"quiz":/plataforma/.test(clean)?"platformer-prototype":"top-down-prototype",actor:"ATHENA"}); requireSuccess(r); artifactId=r.game!.artifact.id;
    description="Protótipo 2D jogável a partir de template local, com entidades e regras editáveis. Use Play no Studio para testar.";
  }
  requireSuccess(await artifactService.updateArtifact(artifactId,{metadata:{athenaRequestId:requestId,generationBrief:brief,generationDescription:description,generationMode:"LOCAL_COMPOSITION"}},"ATHENA","Composição criada a partir da conversa"));
  return { artifactId, studio, href:href(artifactId), description };
}

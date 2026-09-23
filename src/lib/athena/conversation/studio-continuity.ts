import type { AthenaMessage, AthenaResponse } from "../domain/response";
import type { AthenaEngineContext } from "../engine";
import type { AthenaScope } from "../domain/context";
import { athenaConversationStore } from "./conversation-store";
import { athenaToolManager } from "../tools/tool-manager";
import { athenaInteractionContractGateway } from "../runtime/interaction-contract-gateway";
import { decisionForContract } from "../domain/interaction-contract";
import { getStudioDefinition, type StudioType } from "../../studio/studio-registry";
import type { StudioGenerationResult } from "../../studio/athena-generation";

type Brief = { studio: StudioType; options: string[]; selected?: number; artifactId?: string; href?: string };
const sessions = new Map<string, Brief>();
const inFlight = new Map<string, Promise<AthenaMessage | undefined>>();
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.,!?;:()]/g, " ").replace(/\s+/g, " ").trim();
const detect = (s: string): StudioType | undefined => /\b(video|filme|clipe)\b/.test(s)?"VIDEO":/\b(audio|musica|som|trilha|podcast|narracao)\b/.test(s)?"AUDIO":/\b(jogo|game|quiz)\b/.test(s)?"GAME":/\b(site|website|landing|dashboard|portfolio)\b/.test(s)?"WEB":/\b(imagem|capa|banner|labirinto|poster)\b/.test(s)?"IMAGE":/\b(documento|artigo|texto|relatorio|roteiro)\b/.test(s)?"DOCUMENT":undefined;

function restore(sessionId:string): Brief | undefined {
  const messages=athenaConversationStore.load().conversations.find(c=>c.id===sessionId)?.messages;
  if (messages) {
    for(const m of [...messages].reverse()) {
      const saved=m.metadata?.studioBrief as Brief | undefined;
      if(saved && Array.isArray(saved.options) && ["IMAGE","AUDIO","VIDEO","GAME","DOCUMENT","WEB"].includes(saved.studio)) { sessions.set(sessionId,saved); return saved; }
      // Compatibility for existing chat histories that predate structured options.
      if(m.sender==="athena" && /ideias visuais concretas/.test(m.text)) {
        const options=[...m.text.matchAll(/^\s*\d+[.)]\s+(.+)$/gm)].map(x=>x[1].replace(/\*\*/g,""));
        if(options.length) { const b:Brief={studio:"IMAGE",options};sessions.set(sessionId,b);return b; }
      }
    }
  }
  return sessions.get(sessionId);
}

async function processStudio(prompt:string,scope:AthenaScope,ctx:AthenaEngineContext,sessionId:string):Promise<AthenaMessage|undefined> {
  const clean=normalize(prompt), current=restore(sessionId), studio=detect(clean);
  if (/\b(nao|nunca)\b.*\b(cri|ger|fac|execut)/.test(clean) || /\b(apague|exclua|salve.*vault)\b/.test(clean)) return undefined;
  // Domain commands keep their canonical operational route even when their text mentions media.
  if (/\b(tarefa|nota|prazo|projeto|evento|vault|lixeira)\b/.test(clean) && /\b(crie|criar|adicione|mova|apague|atualize|conclua)\b/.test(clean)) return undefined;
  const reply=(text:string,brief?:Brief):AthenaResponse=>({id:`ath-studio-${crypto.randomUUID()}`,sender:"athena",text,scope,timestamp:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),metadata:{interactionContract:"ANSWER_SELF",...(brief?{studioBrief:brief}:{})}});
  const ideation=/\b(ideias?|sugest|opcoes|brainstorm)/.test(clean);
  if(studio && ideation) {
    const options=studio==="IMAGE" ? ["Cartaz tipográfico: composição de título e formas geométricas editáveis", "Ordem no caos: labirinto tecnológico visto de cima com caminho luminoso violeta e ciano", "Banner editorial: título em destaque sobre fundo escuro"] : studio==="WEB"?["Landing page responsiva", "Portfolio pessoal", "Dashboard de apresentação"]:studio==="GAME"?["Protótipo 2D de exploração", "Quiz interativo", "Protótipo de plataforma"]:studio==="AUDIO"?["Estudo instrumental sintetizado de 8 segundos", "Sessão de narração para importar sua gravação", "Trilha instrumental curta"]:studio==="VIDEO"?["Vinheta tipográfica de 6 segundos", "Título de abertura para vídeo", "Cartela editorial"]:["Documento estruturado com briefing", "Roteiro para desenvolver", "Relatório inicial editável"];
    const brief:Brief={studio,options}; sessions.set(sessionId,brief);
    return reply(`Posso preparar estas **3 ideias ${studio === "IMAGE" ? "visuais " : ""}concretas** no **${getStudioDefinition(studio).label}** com os recursos locais disponíveis:\n\n${options.map((o,i)=>`${i+1}. ${o}`).join("\n")}\n\nEscolha pelo número ou descreva o resultado. Vou criar uma composição editável. Geração livre de fotos, vozes e filmagens depende de motores que ainda não estão conectados.`,brief);
  }
  if (current?.artifactId && current.href) {
    const stopWords = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "projeto", "projetos"]);
    const promptTokens = clean.split(/\s+/).filter((token) => token && !stopWords.has(token));
    const mentionedProject = ctx.projects.find((project) => {
      const titleTokens = normalize(project.title).split(/\s+/).filter((token) => token && !stopWords.has(token));
      return titleTokens.length > 0 && promptTokens.length > 0 &&
        promptTokens.every((token) => titleTokens.includes(token)) &&
        titleTokens.every((token) => promptTokens.includes(token));
    });
    if (mentionedProject) {
      const existingOutput = reply(
        `Você mencionou o projeto **${mentionedProject.title}** depois de criar ${current.studio === "VIDEO" ? "este vídeo" : "este resultado"} no ${getStudioDefinition(current.studio).label}. Ainda não associei o artefato ao projeto. Você quer mudar o foco da conversa para esse projeto ou pretende associar o resultado a ele?`,
        current
      );
      existingOutput.actionCard = {
        type: "studio_criado",
        title: `Abrir ${getStudioDefinition(current.studio).label} existente`,
        link: current.href,
        linkLabel: "Reabrir resultado",
      };
      return existingOutput;
    }
  }
  const number=clean.match(/^(?:(?:faca|faz|quero|escolho|gere|crie|mostre|manda|pode fazer)\s+)?(?:(?:a|o)\s+)?(?:(?:opcao|numero)\s+)?(\d+|primeir[oa]|segund[oa]|terceir[oa])\b/);
  const selected=number ? /^primeir/.test(number[1])?0:/^segund/.test(number[1])?1:/^terceir/.test(number[1])?2:Number(number[1])-1 : current?.options.findIndex(o=>normalize(o)===clean || (clean.length>15 && normalize(o).includes(clean)));
  const wantsCreate=/\b(crie|criar|cria|gere|gerar|gera|faca|faz|produza|monte)\b/.test(clean);
  const follow=/^(?:pode fazer|faca isso|faz essa|continue|pode criar|quero ver|mostre|essa|isso)[.!?]*$/.test(clean);
  if(number && !current) return reply("Não há uma lista de opções nesta conversa. Qual Studio ou resultado você quer criar?");
  if(current && selected!==undefined && selected>=0 && !current.options[selected]) return reply(`A lista tem ${current.options.length} opções. Escolha ${current.options.map((_,i)=>i+1).join(", ")}.`,current);
  let brief:Brief|undefined, text:string|undefined;
  if(current && selected!==undefined && selected>=0 && current.options[selected]) { brief={...current,selected};text=current.options[selected]; }
  else if(current && follow) {
    if(current.selected===undefined) return reply(`Qual opção deseja criar? ${current.options.map((o,i)=>`${i+1}. ${o}`).join(" ")}`,current);
    brief=current;text=current.options[current.selected];
  } else if(studio && wantsCreate) { brief={studio,options:[prompt],selected:0};text=prompt; }
  if(!brief || !text) return undefined;
  sessions.set(sessionId,brief);
  if(/\b(prompt|somente texto|so o texto)\b/.test(clean)) return reply(`Briefing da opção escolhida:\n\n${text}`,brief);
  if(brief.href && follow) { const r=reply(`A composição desta conversa já foi criada. Abra o Studio para continuar a edição.`,brief); r.actionCard={type:"studio_criado",title:"Abrir resultado",link:brief.href};return r; }
  const requestId=`${sessionId}:${brief.studio}:${text}`;
  const decision=decisionForContract("USE_TOOL","studio.explicit-generation");
  const result=await athenaInteractionContractGateway.executeAsync(decision,()=>athenaToolManager.executeTool("studio.generate",{studio:brief!.studio,brief:text,requestId,conversationId:sessionId},ctx,sessionId));
  if(!result.success) return reply(`O ${getStudioDefinition(brief.studio).label} não concluiu a criação: ${result.error || "falha ao salvar"}. O briefing continua nesta conversa para tentar novamente.`,brief);
  const generated=result.data as StudioGenerationResult;
  brief={...brief,artifactId:generated.artifactId,href:generated.href};sessions.set(sessionId,brief);
  return {...reply(`${generated.description}\n\nAbra o resultado abaixo para ver e editar.`,brief),actionCard:{type:"studio_criado",title:`Abrir ${getStudioDefinition(brief.studio).label}`,link:generated.href,linkLabel:"Ver resultado"},metadata:{studioBrief:brief,interactionContract:"USE_TOOL",artifactId:generated.artifactId}};
}

export function processStudioConversation(prompt:string,scope:AthenaScope,ctx:AthenaEngineContext,sessionId:string) {
  const key=`${sessionId}:${prompt}`;
  const pending=inFlight.get(key);if(pending)return pending;
  const run=processStudio(prompt,scope,ctx,sessionId).finally(()=>inFlight.delete(key)); inFlight.set(key,run);return run;
}

export type ConversationalRegister = "formal" | "informal";
export type PragmaticIntent = "TOPIC_SWITCH" | "FOLLOW_UP" | "CLARIFICATION_REQUEST" | "CORRECTION" | "STYLE_REQUEST" | "SUBSTANTIVE" | "UNCERTAIN";

export interface PragmaticUnderstanding {
  intent: PragmaticIntent;
  confidence: number;
  register?: ConversationalRegister;
  requestedVerbosity?: "concise" | "detailed";
  explicitTopicSwitch: boolean;
  likelyFollowUp: boolean;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[.,!?;:()]/g, " ").replace(/\s+/g, " ").trim();
}

const TOPIC_SWITCH = /^(?:mudando de assunto|mudando de tema|outra coisa|falando de outra coisa|sobre outro assunto|(?:e\s+)?agora sobre)\b/;
const CLARIFICATION = /^(?:o que voce quis dizer|como assim|qual parte|que parte|nao entendi|pode(?:ria)?\s+(?:me\s+)?esclarecer|(?:me\s+)?explique\s+melhor|(?:me\s+)?explica(?:r)?\s+melhor|pode(?:ria)?\s+(?:me\s+)?explicar\s+melhor|o que exatamente)\b/;
const CORRECTION = /^(?:(?:nao|na verdade)\b[^.!?]{0,72}\b(?:quis dizer|queria dizer|me referia|estava falando|estou falando|me refiro|falei|falava|era sobre|falava sobre)|(?:voce|vc|o senhor|a senhora)\s+(?:entendeu|interpretou|leu|tomou)\b|(?:isso|essa parte|esse trecho|a resposta)\s+(?:ficou|foi)\s+(?:errad[oa]|invertid[oa])\b|nao foi isso|nao e isso|voce entendeu errado|corrigindo|quis dizer|eu quis dizer|me refiro a|estou falando de)\b/;
const FOLLOW_UP = /^(?:(?:e|mas e|quanto a)\s+(?:isso|essa|esse|ele|ela|eles|elas|os riscos|as consequencias|o argumento|a ideia|a tese|a proposta|o tema|esse ponto|essa resposta|essa parte|esse detalhe|o exemplo|o resultado|o plano|o texto|o rascunho|a analise|o trecho|a segunda opcao|as fontes|essa obra|no capitulo)\b[^.!?]{0,90}|(?:continue|continua|desenvolva(?:\s+(?:isso|essa ideia|essa proposta))?|desenvolve(?:\s+(?:isso|essa ideia|essa proposta))?|explique (?:isso|essa parte|essa resposta|melhor)|explica (?:isso|essa parte|essa resposta|melhor)|fale mais(?: sobre isso)?|fala mais(?: sobre isso)?|escreva mais sobre isso|escreve mais sobre isso|redija mais sobre isso|redige mais sobre isso|me conta mais|e agora|o que mais|pode (?:detalhar isso|explicar melhor|desenvolver isso)|poderia (?:detalhar isso|explicar melhor|desenvolver isso)|qual deles|qual delas|por que|porque|quais os riscos|quais as consequencias|isso (?:funciona|serve|resolve))\b[^.!?]{0,90}|o que (?:isso|essa|esse) tem a ver[^.!?]{0,90})\s*$/;

export function understandPragmatics(prompt: string): PragmaticUnderstanding {
  const text = normalize(prompt);
  if (/^(?:e ai|mas como|desenvolve|desenvolva|detalhe melhor|expanda isso|pode detalhar|poderia detalhar)$/.test(text)) {
    return { intent: "FOLLOW_UP", confidence: 0.88, ...(text === "e ai" ? { register: "informal" as const } : {}), explicitTopicSwitch: false, likelyFollowUp: true };
  }
  const explicitTopicSwitch = TOPIC_SWITCH.test(text);
  const requestedVerbosity = /\b(?:curto|breve|conciso|resumido|em poucas palavras|sem rodeios)\b/.test(text)
    ? "concise" : /\b(?:detalhado|com detalhes|em detalhes|passo a passo|aprofundado)\b/.test(text) ? "detailed" : undefined;
  const formalScore = (text.match(/\b(?:poderia|solicito|prezado|prezada|senhor|senhora|atenciosamente|agradeco desde ja|encaminho|gostaria de solicitar|por gentileza)\b/g) || []).length;
  const informalScore = (text.match(/\b(?:vc|vcs|ce|pra|pro|ta|to|tava|tavam|blz|valeu|kkk|rsrs|mano|tipo assim|me da uma forca|me ajuda ai|faz pra mim)\b/g) || []).length;
  const requestsFormal = /\b(?:use|adote|mantenha|responda|fale|escreva)\b.{0,35}\b(?:em\s+)?(?:um\s+)?registro\s+formal\b|\b(?:responda|fale|escreva)\s+(?:de\s+forma\s+)?formalmente\b|\b(?:use|adote|mantenha|responda|fale|escreva)\b.{0,35}\bformal\b/.test(text);
  const requestsInformal = /\b(?:use|adote|mantenha|responda|fale|escreva)\b.{0,35}\b(?:em\s+)?(?:um\s+)?registro\s+informal\b|\b(?:responda|fale|escreva)\s+(?:de\s+forma\s+)?informalmente\b|\b(?:use|adote|mantenha|responda|fale|escreva)\b.{0,35}\b(?:informal|descontraid[oa]|casual)\b/.test(text);
  const requestedRegister = requestsFormal !== requestsInformal
    ? requestsFormal ? "formal" : "informal"
    : undefined;
  const register = requestedRegister || (formalScore > informalScore ? "formal" : informalScore > formalScore ? "informal" : undefined);

  if (explicitTopicSwitch) return { intent: "TOPIC_SWITCH", confidence: 0.99, register, requestedVerbosity, explicitTopicSwitch: true, likelyFollowUp: false };
  if (CORRECTION.test(text) || (/^(?:isso|essa parte|esse trecho|a resposta)\s+(?:ficou|foi)\s+confus[oa]\b/.test(text) && /\b(?:quis dizer|queria dizer|me referia|estava falando|estou falando|me refiro|falei|falava|era sobre|falava sobre)\b/.test(text))) return { intent: "CORRECTION", confidence: 0.96, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: false };
  if (CLARIFICATION.test(text)) return { intent: "CLARIFICATION_REQUEST", confidence: 0.93, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: true };
  if (FOLLOW_UP.test(text)) return { intent: "FOLLOW_UP", confidence: 0.88, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: true };
  if (requestedVerbosity || requestsFormal || requestsInformal || /\b(?:registro formal|registro informal|de forma formal|de forma informal|responda formalmente|responda informalmente)\b/.test(text)) {
    return { intent: "STYLE_REQUEST", confidence: 0.94, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: false };
  }
  if (!text || text.length < 3 || /^(?:isso|esse|essa|ele|ela|o segundo|a segunda|qual deles|e ai)$/.test(text)) {
    return { intent: "UNCERTAIN", confidence: 0.42, register, explicitTopicSwitch: false, likelyFollowUp: false };
  }
  return { intent: "SUBSTANTIVE", confidence: 0.72, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: false };
}

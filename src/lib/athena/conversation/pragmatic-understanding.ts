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
const CORRECTION = /^(?:nao foi isso|não foi isso|nao e isso|não é isso|voce entendeu errado|você entendeu errado|corrigindo|na verdade|quis dizer)\b/;
const FOLLOW_UP = /^(?:(?:e|mas e|quanto a)\s+(?:isso|essa|esse|ele|ela|eles|elas|os riscos|as consequencias|o argumento|a ideia|a tese|a proposta|o tema|esse ponto|essa resposta|essa parte|esse detalhe|o exemplo|o resultado|o plano|o texto|o rascunho|a analise|o trecho|a segunda opcao|as fontes|essa obra|no capitulo)\b[^.!?]{0,90}|(?:continue|continua|desenvolva (?:isso|essa ideia|essa proposta)|desenvolve (?:isso|essa ideia|essa proposta)|explique (?:isso|essa parte|essa resposta|melhor)|explica (?:isso|essa parte|essa resposta|melhor)|fale mais(?: sobre isso)?|fala mais(?: sobre isso)?|escreva mais sobre isso|escreve mais sobre isso|redija mais sobre isso|redige mais sobre isso|me conta mais|e agora|o que mais|pode (?:detalhar isso|explicar melhor|desenvolver isso)|poderia (?:detalhar isso|explicar melhor|desenvolver isso)|qual deles|qual delas|por que|porque|quais os riscos|quais as consequencias|isso (?:funciona|serve|resolve))\b[^.!?]{0,90}|o que (?:isso|essa|esse) tem a ver[^.!?]{0,90})\s*$/;

export function understandPragmatics(prompt: string): PragmaticUnderstanding {
  const text = normalize(prompt);
  const explicitTopicSwitch = TOPIC_SWITCH.test(text);
  const requestedVerbosity = /\b(?:curto|breve|conciso|resumido|em poucas palavras|sem rodeios)\b/.test(text)
    ? "concise" : /\b(?:detalhado|com detalhes|em detalhes|passo a passo|aprofundado)\b/.test(text) ? "detailed" : undefined;
  const formalScore = (text.match(/\b(?:poderia|solicito|prezado|prezada|senhor|senhora|atenciosamente|agradeco desde ja|encaminho|gostaria de solicitar|por gentileza)\b/g) || []).length;
  const informalScore = (text.match(/\b(?:vc|vcs|ce|pra|pro|ta|to|tava|tavam|blz|valeu|kkk|rsrs|mano|tipo assim|me da uma forca|me ajuda ai|faz pra mim)\b/g) || []).length;
  const register = formalScore > informalScore ? "formal" : informalScore > formalScore ? "informal" : undefined;

  if (explicitTopicSwitch) return { intent: "TOPIC_SWITCH", confidence: 0.99, register, requestedVerbosity, explicitTopicSwitch: true, likelyFollowUp: false };
  if (CORRECTION.test(text)) return { intent: "CORRECTION", confidence: 0.96, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: false };
  if (CLARIFICATION.test(text)) return { intent: "CLARIFICATION_REQUEST", confidence: 0.93, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: true };
  if (FOLLOW_UP.test(text)) return { intent: "FOLLOW_UP", confidence: 0.88, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: true };
  if (requestedVerbosity || /\b(?:registro formal|registro informal|de forma formal|de forma informal|responda formalmente|responda informalmente)\b/.test(text)) {
    return { intent: "STYLE_REQUEST", confidence: 0.94, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: false };
  }
  if (!text || text.length < 3 || /^(?:isso|esse|essa|ele|ela|o segundo|a segunda|qual deles|e ai)$/.test(text)) {
    return { intent: "UNCERTAIN", confidence: 0.42, register, explicitTopicSwitch: false, likelyFollowUp: false };
  }
  return { intent: "SUBSTANTIVE", confidence: 0.72, register, requestedVerbosity, explicitTopicSwitch: false, likelyFollowUp: false };
}

/**
 * VARYNTH OS — ATHENA INTENT TAXONOMY & CORPUS
 * Canonical Intent Definitions and Development Training Examples
 * 
 * Note: Blind evaluation holdouts are kept separate in evaluation suites.
 */

import { AthenaCanonicalIntent, IntentCorpusItem } from "./types";

export interface IntentDefinition {
  intent: AthenaCanonicalIntent;
  description: string;
  isOperational: boolean;
  requiresPendingContext: boolean;
  examples: IntentCorpusItem[];
}

export const CANONICAL_INTENT_TAXONOMY: Record<AthenaCanonicalIntent, IntentDefinition> = {
  TASK_QUERY: {
    intent: "TASK_QUERY",
    description: "Consulta sobre tarefas, pendências, afazeres e itens na fila de trabalho.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "quais sao minhas tarefas pendentes", category: "canonical", intent: "TASK_QUERY" },
      { canonicalPhrase: "quais tarefas eu tenho", category: "formal", intent: "TASK_QUERY" },
      { canonicalPhrase: "tem coisa pendente", category: "colloquial", intent: "TASK_QUERY" },
      { canonicalPhrase: "o que ficou para fazer", category: "colloquial", intent: "TASK_QUERY" },
      { canonicalPhrase: "estou devendo alguma coisa", category: "colloquial", intent: "TASK_QUERY" },
      { canonicalPhrase: "tem algo na fila", category: "colloquial", intent: "TASK_QUERY" },
      { canonicalPhrase: "que trabalho falta", category: "casual", intent: "TASK_QUERY" },
      { canonicalPhrase: "o que ainda nao terminei", category: "casual", intent: "TASK_QUERY" },
      { canonicalPhrase: "como estao minhas tarefas", category: "formal", intent: "TASK_QUERY" },
      { canonicalPhrase: "minhas pendencias", category: "short", intent: "TASK_QUERY" },
      { canonicalPhrase: "o que tenho pendente", category: "casual", intent: "TASK_QUERY" },
      { canonicalPhrase: "tarefas ativas", category: "short", intent: "TASK_QUERY" },
      { canonicalPhrase: "o que tenho pra entregar", category: "colloquial", intent: "TASK_QUERY" },
      { canonicalPhrase: "minha lista de tarefas", category: "formal", intent: "TASK_QUERY" },
    ],
  },

  PROJECT_QUERY: {
    intent: "PROJECT_QUERY",
    description: "Consulta ou navegação sobre projetos ativos, status, prazos e escopo.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "quais sao meus projetos ativos", category: "canonical", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "como estao meus projetos", category: "formal", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "quantos projetos ativos eu tenho", category: "formal", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "como esta o projeto", category: "casual", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "como esta aquele projeto", category: "casual", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "como esta esse projeto", category: "casual", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "meus prazos de projetos", category: "formal", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "situacao dos projetos", category: "short", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "abra o projeto", category: "short", intent: "PROJECT_QUERY" },
      { canonicalPhrase: "ver detalhes do projeto", category: "casual", intent: "PROJECT_QUERY" },
    ],
  },

  ECOSYSTEM_STATUS: {
    intent: "ECOSYSTEM_STATUS",
    description: "Visão geral integrada do ecossistema VARYNTH OS e recursos.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "como esta o varynth", category: "canonical", intent: "ECOSYSTEM_STATUS" },
      { canonicalPhrase: "como esta meu sistema", category: "formal", intent: "ECOSYSTEM_STATUS" },
      { canonicalPhrase: "como esta o sistema", category: "formal", intent: "ECOSYSTEM_STATUS" },
      { canonicalPhrase: "minha situacao no sistema", category: "formal", intent: "ECOSYSTEM_STATUS" },
      { canonicalPhrase: "saude do sistema", category: "short", intent: "ECOSYSTEM_STATUS" },
      { canonicalPhrase: "panorama geral", category: "short", intent: "ECOSYSTEM_STATUS" },
      { canonicalPhrase: "status do ecossistema", category: "formal", intent: "ECOSYSTEM_STATUS" },
    ],
  },

  ECOSYSTEM_BRIEFING: {
    intent: "ECOSYSTEM_BRIEFING",
    description: "Resumo executivo cronológico de acontecimentos e atualizações.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "me de um briefing", category: "canonical", intent: "ECOSYSTEM_BRIEFING" },
      { canonicalPhrase: "o que aconteceu desde a ultima vez", category: "formal", intent: "ECOSYSTEM_BRIEFING" },
      { canonicalPhrase: "resumo executivo do dia", category: "formal", intent: "ECOSYSTEM_BRIEFING" },
      { canonicalPhrase: "me atualize sobre o que mudou", category: "casual", intent: "ECOSYSTEM_BRIEFING" },
      { canonicalPhrase: "briefing executivo", category: "short", intent: "ECOSYSTEM_BRIEFING" },
    ],
  },

  ATHENA_SELF_STATUS: {
    intent: "ATHENA_SELF_STATUS",
    description: "Diagnóstico e saúde dos módulos cognitivos e kernel da Athena.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "como esta seu kernel", category: "canonical", intent: "ATHENA_SELF_STATUS" },
      { canonicalPhrase: "sua memoria esta operacional", category: "formal", intent: "ATHENA_SELF_STATUS" },
      { canonicalPhrase: "tem algum problema na sua memoria", category: "formal", intent: "ATHENA_SELF_STATUS" },
      { canonicalPhrase: "seus modulos estao saudaveis", category: "casual", intent: "ATHENA_SELF_STATUS" },
      { canonicalPhrase: "diagnostico da athena", category: "short", intent: "ATHENA_SELF_STATUS" },
      { canonicalPhrase: "voce esta funcionando normalmente", category: "casual", intent: "ATHENA_SELF_STATUS" },
    ],
  },

  SOCIAL_CONVERSATION: {
    intent: "SOCIAL_CONVERSATION",
    description: "Interação social genuína, saudações, desabafos e humor.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "ola athena", category: "canonical", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "bom dia", category: "casual", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "boa tarde", category: "casual", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "tudo bem com voce", category: "casual", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "como voce esta", category: "canonical", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "maravilha quebrou tudo de novo kkk", category: "colloquial", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "valeu obrigado", category: "casual", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "kkkk muito bom", category: "colloquial", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "parabens athena nota do", category: "colloquial", intent: "SOCIAL_CONVERSATION" },
      { canonicalPhrase: "esse projeto esta me deixando maluco", category: "casual", intent: "SOCIAL_CONVERSATION" },
    ],
  },

  EXECUTION_REQUEST: {
    intent: "EXECUTION_REQUEST",
    description: "Comandos de mutação direta no banco de dados local.",
    isOperational: true,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "crie uma tarefa para amanha", category: "canonical", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "adicione uma tarefa", category: "formal", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "crie uma nota", category: "formal", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "anote isso", category: "casual", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "mova para a lixeira", category: "formal", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "exclua esse item", category: "formal", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "se nao for incomodo voce poderia criar uma tarefa", category: "polite", intent: "EXECUTION_REQUEST" },
      { canonicalPhrase: "adicione na minha lista", category: "casual", intent: "EXECUTION_REQUEST" },
    ],
  },

  CREATIVE_INTENT: {
    intent: "CREATIVE_INTENT",
    description: "Intenção criativa multi-Studio estruturada (vídeo, site, imagem, jogo).",
    isOperational: true,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "crie um video de 90 segundos", category: "canonical", intent: "CREATIVE_INTENT" },
      { canonicalPhrase: "gere uma imagem de capa", category: "formal", intent: "CREATIVE_INTENT" },
      { canonicalPhrase: "crie um site no web studio", category: "formal", intent: "CREATIVE_INTENT" },
      { canonicalPhrase: "estruture um jogo investigativo", category: "formal", intent: "CREATIVE_INTENT" },
      { canonicalPhrase: "transforme este artigo em site e video", category: "canonical", intent: "CREATIVE_INTENT" },
      { canonicalPhrase: "crie site imagem e video", category: "formal", intent: "CREATIVE_INTENT" },
    ],
  },

  APPROVAL: {
    intent: "APPROVAL",
    description: "Confirmação afirmativa de ação ou plano pendente.",
    isOperational: false,
    requiresPendingContext: true,
    examples: [
      { canonicalPhrase: "pode fazer", category: "canonical", intent: "APPROVAL" },
      { canonicalPhrase: "pode", category: "short", intent: "APPROVAL" },
      { canonicalPhrase: "manda bala", category: "colloquial", intent: "APPROVAL" },
      { canonicalPhrase: "fechado", category: "casual", intent: "APPROVAL" },
      { canonicalPhrase: "vai em frente", category: "casual", intent: "APPROVAL" },
      { canonicalPhrase: "aprovado", category: "formal", intent: "APPROVAL" },
      { canonicalPhrase: "autorizado", category: "formal", intent: "APPROVAL" },
    ],
  },

  REJECTION: {
    intent: "REJECTION",
    description: "Rejeição ou insatisfação com proposta ou plano apresentado.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "nao gostei dessa ideia", category: "canonical", intent: "REJECTION" },
      { canonicalPhrase: "nao quero assim", category: "casual", intent: "REJECTION" },
      { canonicalPhrase: "perfeito era exatamente isso que eu nao queria", category: "colloquial", intent: "REJECTION" },
      { canonicalPhrase: "nao e isso athena", category: "casual", intent: "REJECTION" },
      { canonicalPhrase: "nao concordo com essa proposta", category: "formal", intent: "REJECTION" },
    ],
  },

  CANCELLATION: {
    intent: "CANCELLATION",
    description: "Cancelamento imediato de plano ou fluxo antes da execução.",
    isOperational: false,
    requiresPendingContext: true,
    examples: [
      { canonicalPhrase: "espera nao faz", category: "canonical", intent: "CANCELLATION" },
      { canonicalPhrase: "cancele o plano", category: "formal", intent: "CANCELLATION" },
      { canonicalPhrase: "para tudo", category: "colloquial", intent: "CANCELLATION" },
      { canonicalPhrase: "deixa esse assunto por enquanto", category: "casual", intent: "CANCELLATION" },
      { canonicalPhrase: "aborte a execucao", category: "formal", intent: "CANCELLATION" },
    ],
  },

  CORRECTION: {
    intent: "CORRECTION",
    description: "Correção de dados, datas, prazos ou entidades selecionadas.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "corrigindo o prazo na verdade e dia 22", category: "canonical", intent: "CORRECTION" },
      { canonicalPhrase: "nao na verdade eu falei da pesquisa cnj", category: "casual", intent: "CORRECTION" },
      { canonicalPhrase: "mudei de ideia quero vertical", category: "casual", intent: "CORRECTION" },
      { canonicalPhrase: "repito estamos falando do projeto b", category: "formal", intent: "CORRECTION" },
      { canonicalPhrase: "nao e projeto a e projeto b", category: "casual", intent: "CORRECTION" },
    ],
  },

  CLARIFICATION_RESPONSE: {
    intent: "CLARIFICATION_RESPONSE",
    description: "Resposta curta preenchendo slot aberto em diálogo de esclarecimento.",
    isOperational: false,
    requiresPendingContext: true,
    examples: [
      { canonicalPhrase: "a pesquisa do cnj", category: "canonical", intent: "CLARIFICATION_RESPONSE" },
      { canonicalPhrase: "o primeiro", category: "short", intent: "CLARIFICATION_RESPONSE" },
      { canonicalPhrase: "o segundo", category: "short", intent: "CLARIFICATION_RESPONSE" },
      { canonicalPhrase: "formato vertical", category: "casual", intent: "CLARIFICATION_RESPONSE" },
    ],
  },

  EPISTEMIC_QUERY: {
    intent: "EPISTEMIC_QUERY",
    description: "Questões teóricas, filosóficas, conceituais e hermenêuticas.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "o que e epistemologia", category: "canonical", intent: "EPISTEMIC_QUERY" },
      { canonicalPhrase: "explique o metodo hermeneutico", category: "formal", intent: "EPISTEMIC_QUERY" },
      { canonicalPhrase: "qual a diferenca entre deducao e inducao", category: "formal", intent: "EPISTEMIC_QUERY" },
      { canonicalPhrase: "conceito de responsabilidade objetiva", category: "formal", intent: "EPISTEMIC_QUERY" },
    ],
  },

  ARTIFACT_QUERY: {
    intent: "ARTIFACT_QUERY",
    description: "Consulta sobre arquivos, notas, documentos ou mídias no Vault/Codex.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "mostre minhas notas sobre hermeneutica", category: "canonical", intent: "ARTIFACT_QUERY" },
      { canonicalPhrase: "onde esta aquele fichamento", category: "casual", intent: "ARTIFACT_QUERY" },
      { canonicalPhrase: "busque no vault", category: "formal", intent: "ARTIFACT_QUERY" },
      { canonicalPhrase: "quais artigos estao salvos", category: "formal", intent: "ARTIFACT_QUERY" },
    ],
  },

  UNKNOWN_INPUT: {
    intent: "UNKNOWN_INPUT",
    description: "Entrada incompreensível, pontuação isolada ou ruído alfanumérico.",
    isOperational: false,
    requiresPendingContext: false,
    examples: [
      { canonicalPhrase: "xyz987abc", category: "short", intent: "UNKNOWN_INPUT" },
      { canonicalPhrase: "asdklj", category: "short", intent: "UNKNOWN_INPUT" },
      { canonicalPhrase: "???", category: "short", intent: "UNKNOWN_INPUT" },
      { canonicalPhrase: "123123", category: "short", intent: "UNKNOWN_INPUT" },
    ],
  },
};

export const ALL_INTENT_EXAMPLES: IntentCorpusItem[] = Object.values(CANONICAL_INTENT_TAXONOMY).flatMap(
  (def) => def.examples
);

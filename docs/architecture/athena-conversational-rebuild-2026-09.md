# Reconstrução Conversacional da Athena — Setembro de 2026

## Objetivo

Substituir sucesso técnico aparente por sucesso conversacional observável. A Athena deve compreender o resultado esperado, preservar o contexto entre turnos, pedir somente a informação ausente e bloquear respostas genéricas antes que cheguem ao usuário.

## Fluxo canônico

1. A mensagem é normalizada sem perder o texto original.
2. A interpretação produz intenção, confiança, ambiguidade, informações ausentes e um estado explícito de compreensão.
3. O `ConversationManager` combina esses sinais com objetivo, projeto, entidades, correções e pergunta pendente da sessão.
4. O roteador escolhe exatamente um contrato: `ANSWER_SELF`, `USE_AGENT` ou `USE_TOOL`.
5. A estratégia cria o plano estruturado da resposta.
6. O `FactLock` protege fatos e alegações de execução.
7. O `ResponseCompletenessValidator` bloqueia evasão, respostas genéricas e omissões.
8. A resposta e o diagnóstico sanitizado são preservados localmente.

Os antigos manipuladores `legacy.project-plan-manager`, `legacy.contextual-memory` e `legacy.global-intelligence` não antecedem mais a interpretação e não podem sequestrar a mensagem.

## Estados de compreensão

| Estado | Significado | Comportamento |
| --- | --- | --- |
| `UNDERSTOOD` | Pedido e resultado identificados | Responder ou planejar diretamente |
| `PARTIALLY_UNDERSTOOD` | Direção conhecida, baixa certeza | Responder com limite explícito ou pedir um dado |
| `AMBIGUOUS` | Duas ou mais leituras plausíveis | Apresentar alternativas reais |
| `MISSING_INFORMATION` | Ação conhecida, slot obrigatório ausente | Solicitar somente o slot faltante |
| `UNKNOWN` | Nenhuma leitura segura | Pedir o resultado esperado sem fingir compreensão |

## Estado de sessão

Além do histórico limitado, cada sessão mantém objetivo atual, último pedido compreendido, pergunta pendente, informações fornecidas, projeto ativo, entidades recentes, correções e tópicos interrompidos. A memória durável é auxiliar: uma falha de persistência não invalida a resposta atual.

## Qualidade e feedback

As superfícies Hub e Sidecar permitem classificar localmente cada resposta como útil, não compreendida, genérica ou sem contexto. O registro é limitado a 500 itens e não utiliza rede.

O diagnóstico `REQUEST_CONTEXT` expõe intenção, assunto, confiança, estado de compreensão, informações ausentes e candidatos semânticos. Respostas reparadas geram `CONVERSATION_RESPONSE_REPAIRED`.

## Portões de aceitação

- Nenhuma resposta institucional pode substituir uma resposta cognitiva ou operacional.
- Entrada desconhecida não pode ser classificada por padrão como conversa social.
- Nenhuma ação pode ser alegada sem resultado confirmado do contrato `USE_TOOL`.
- Referências curtas devem usar o estado da sessão ou pedir o alvo.
- Correções do usuário devem atualizar o estado sem apagar o contexto válido.
- Os fluxos síncrono e assíncrono devem aplicar a mesma interpretação e barreira de qualidade.
- A certificação inclui conversas completas, falhas observadas em produção e todos os contratos.

## Evidência automatizada

As baterias combinadas cobrem mais de 160 cenários entre semântica, conversação, qualidade, inteligência comportamental e resultados multi-turno. `athena-conversation-outcome.test.ts` é o portão específico de resultado útil e anti-fallback genérico.

## Limites deliberados

A arquitetura permanece local-first. Modelos locais podem melhorar linguagem e paráfrases, mas não concedem autoridade, não alteram fatos estruturados e não são necessários para o funcionamento básico. Nenhuma API externa foi adicionada.

# Matriz de Compatibilidade — Contratos de Interação da Athena

## Objetivo

Esta matriz consolida o roteamento público da Athena em três contratos canônicos sem remover ou renomear as vias já aceitas pelo sistema. Os tipos legados continuam válidos; a nova camada explicita quem deve responder e quais limites de execução se aplicam.

| Via existente (`InteractionType`) | Contrato canônico | Responsável | Pode consultar contexto | Pode usar agentes | Pode usar ferramentas | Pode mutar estado | Compatibilidade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CONVERSATION` | `ANSWER_SELF` | Athena, diretamente | Não por padrão | Não | Não | Não | Total; mantém o Fast Path e respostas sociais atuais |
| `COGNITIVE_REQUEST` | `USE_AGENT` | Agente cognitivo selecionado, com síntese da Athena | Sim, quando solicitado pela interpretação | Sim | Não por este contrato | Não | Total; mantém modelo local, persona determinística e conselho como implementações compatíveis |
| `OPERATIONAL_REQUEST` | `USE_TOOL` | Ferramenta registrada pelo `ToolManager` | Sim | Não como executor da mutação | Sim | Somente após política de permissão | Total; mantém workflows, confirmação, auditoria e Action Layer |

## Compatibilidade por ponto de entrada

| Superfície atual | Situação anterior | Integração consolidada | Garantia preservada |
| --- | --- | --- | --- |
| `processAthenaQueryAsync` | Ramificava diretamente por `InteractionType` | Resolve um `InteractionContractDecision` antes da execução | Ollama local e fallback determinístico continuam disponíveis |
| `processAthenaQuery` | Ramificava diretamente por `InteractionType` | Usa o mesmo resolvedor canônico | API síncrona permanece exportada e com a mesma assinatura |
| `ExecutiveController.process` | Separava não operacional de operacional | Valida o contrato antes de responder ou executar | Budget, memória, proveniência e eventos permanecem intactos |
| `ConversationManager` | Produz `ParsedCognitiveContext` legado | Continua sendo a fonte da classificação sem alteração de formato | Histórico, anáforas, elipses e clarificação permanecem compatíveis |
| `InteractionContractRouter` | Não existia como fronteira explícita | Converte a interpretação em decisão canônica e validada | Centraliza ownership sem substituir o roteador cognitivo existente |
| `ToolManager` | Executa `ActionType` sob `PermissionPolicyEngine` | Permanece a única fronteira de `USE_TOOL` | Nenhuma ferramenta contorna confirmação ou negação |
| `CognitiveRouter` / agentes | Seleciona agentes competentes para tarefas | Permanece disponível sob `USE_AGENT` | Registry e manifests não mudam |

## Invariantes dos contratos

1. `ANSWER_SELF` não autoriza agentes, ferramentas nem mutação.
2. `USE_AGENT` autoriza raciocínio delegado, mas não autoriza mutação ou uso implícito de ferramenta.
3. `USE_TOOL` exige o caminho operacional e a política de permissão existente.
4. Uma decisão incompatível com a via legada falha de forma explícita antes da execução.
5. Clarificação ocorre antes da execução do contrato e nunca concede autoridade adicional.
6. Atalhos especializados existentes podem continuar respondendo antes da classificação; eles não passam a receber novas permissões por causa desta consolidação.

## Estratégia incremental

1. Introduzir tipos, matriz executável, resolvedor e validador sem alterar os tipos existentes.
2. Integrar `ANSWER_SELF` e `USE_AGENT` aos caminhos de resposta síncrono e assíncrono.
3. Integrar `USE_TOOL` às fronteiras operacionais existentes, preservando `ToolManager` e `PermissionPolicyEngine`.
4. Expor a decisão em metadados de diagnóstico e cobrir mapeamento, capacidades e fail-closed por regressão.

## Gateway único implementado

O `InteractionContractGateway` é a fronteira comum dos executores `AnswerSelfExecutor`, `UseAgentExecutor` e `UseToolExecutor`. Ele valida ownership antes de invocar a operação e mantém telemetria local limitada aos 200 eventos mais recentes (`ROUTED`, `COMPLETED`, `SKIPPED` ou `FAILED`).

Os handlers especializados anteriores ao classificador foram preservados e encapsulados:

| Handler legado | Contrato do gateway | Motivo |
| --- | --- | --- |
| `AthenaProjectPlanManager` | `USE_TOOL` | Mantém planos e pode aplicar alterações após aprovação |
| `AthenaProjectOperations` | `USE_TOOL` | Executa mutações determinísticas, confirmação e undo |
| `AthenaContextualMemory` | `USE_TOOL` | Pode persistir fatos, além de consultá-los |
| `AthenaGlobalIntelligence` | `ANSWER_SELF` | Executa somente leitura e síntese de estado local |

O caminho operacional geral continua delegando chamadas concretas ao `ToolManager`, que permanece responsável por `PermissionPolicyEngine` e eventos de auditoria. Os handlers legados mantêm suas confirmações e mecanismos de undo existentes enquanto passam pelo ownership de `USE_TOOL`; sua migração futura para ferramentas registradas pode ocorrer individualmente, sem novo desvio de roteamento.

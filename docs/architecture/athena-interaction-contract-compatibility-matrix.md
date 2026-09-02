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

## Seleção por capacidades implementada

O `ExecutableCapabilityRegistry` projeta, sem duplicar estado, os manifests ativos do `AgentRegistry` e as definições do `registeredTools`. Cada capacidade executável declara tipo, domínio, skills, custo, prioridade, autoridade, mutação, confirmação, undo e entradas obrigatórias conhecidas.

O `CapabilitySelector` aplica seleção determinística:

- ferramentas exigem correspondência exata de `ActionType`;
- agentes precisam declarar `canHandle=true`;
- prioridade e aderência de skills compõem o score;
- empate no maior score retorna `AMBIGUOUS` e pede esclarecimento;
- capacidade ausente ou atribuída sem competência retorna `NO_MATCH`;
- candidatos aceitos e rejeitados permanecem disponíveis nos metadados diagnósticos.

O agente `athena-generalist` é o owner explícito, local e de menor prioridade para deliberação geral. Ele substitui o fallback implícito sem competir com especialistas. Nos workflows, ferramenta e agente são revalidados pelo selector imediatamente antes do `ToolManager` ou da execução do agente.

## Planos compostos implementados

O `CapabilityPlanBuilder` generaliza `AthenaWorkflow` como um plano inspecionável, sem introduzir um motor paralelo. Cada etapa fixa capacidade, entradas, resultado esperado, dependências, risco, autoridade, confirmação, undo e política de falha. Dependências ausentes e ciclos são rejeitados antes da aprovação.

O ciclo formal é `UNDERSTAND → PLAN → APPROVE → EXECUTE`: percepção e contexto produzem a tarefa compreendida; o builder produz `PLANNED`; a aprovação vincula o hash canônico exato; e o `CapabilityPlanExecutor` recalcula esse hash e revalida capacidades antes de delegar ao `WorkflowExecutor` existente. Alteração pós-aprovação resulta em `BLOCKED`.

A síntese estruturada distingue `COMPLETED`, `PARTIAL`, `BLOCKED`, `FAILED` e `REVERTED`, listando etapas concluídas, falhas, bloqueadas e ignoradas. A aprovação `POLICY` autoriza somente o envelope do plano: confirmações humanas específicas continuam no `PermissionPolicyEngine` por meio do `ToolManager`.

## Persistência e recuperação implementadas

O `CapabilityPlanStore` mantém planos completos no armazenamento local com fallback em memória. Plano, revisão, hashes, aprovação, etapas, resultados, erros, checkpoint, journal de eventos e métricas são gravados antes da execução e após cada etapa.

O `CapabilityPlanRuntime` oferece máquina de estados, reconciliação e controles de pausa, retomada, cancelamento, retry e reversão. Na inicialização, planos `EXECUTING` tornam-se `INTERRUPTED`; a retomada exige hash aprovado válido e capacidades ainda disponíveis. O `WorkflowExecutor` ignora etapas já `COMPLETED`, garantindo idempotência após crash ou reload.

Reversão nunca é presumida: somente etapas mutáveis que declaram `supportsUndo` podem ser revertidas, e o runtime exige um executor de undo explícito. O diagnóstico local apresenta progresso, próxima etapa, último evento, capacidades, confirmações, duração, falhas, bloqueios, retries e reversões sem serviços remotos.

## Interface de inspeção e controle implementada

O `AthenaCapabilityPlanPanel` é um Client Component restrito à fronteira interativa, pois consome `localStorage`, eventos locais e controles. A visão completa está no Athena Command Center; o Sidecar apresenta um resumo compacto dos planos ativos.

## Confirmação e reversão governadas implementadas

Planos aprovados não concedem implicitamente autoridade às mutações sensíveis. Cada etapa de alto risco exige uma confirmação humana de uso único vinculada ao hash, à revisão e aos parâmetros exibidos. O executor revalida esse envelope imediatamente antes da etapa e bloqueia divergências por anti-TOCTOU.

Etapas mutáveis registram estado anterior e posterior. A reversão automática só é exposta quando a ferramenta possui um executor concreto de `undo`; as demais continuam bloqueadas de forma explícita. As operações permanecem locais e não introduzem API de rede.

## Validação ponta a ponta

Os contratos consolidados são validados pela suíte `interaction-contract-e2e.test.ts`, da entrada do usuário até resposta, capacidade ou mutação persistida. O relatório de evidências, critérios e lacunas remanescentes está em `docs/architecture/athena-contract-e2e-validation.md`.

O painel mostra objetivo, status, progresso, hash, revisão, capacidades, autoridade, risco, confirmações, dependências do DAG, resultados, erros, journal, checkpoint e métricas. A máquina de estados determina quais ações aparecem: aprovar, executar, pausar, reconciliar e retomar, cancelar e repetir etapa.

Reversão sem executor concreto de undo aparece explicitamente indisponível; a interface nunca simula restauração. Toda atualização ocorre pelo evento local `varynth_capability_plans_updated`, sem `fetch`, endpoint ou API HTTP.

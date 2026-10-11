# Athena — validação ponta a ponta dos contratos

**Data:** 11 de outubro de 2026

**Escopo:** `ANSWER_SELF`, `USE_AGENT` e `USE_TOOL`  
**Premissa:** execução local, sem dependência de API de rede.

## Resultado consolidado

| Contrato | Entrada validada | Caminho observado | Autoridade | Evidência final |
|---|---|---|---|---|
| `ANSWER_SELF` | conversa direta | percepção → roteador → gateway → resposta determinística | somente resposta | texto produzido, zero mutações e telemetria concluída |
| `USE_AGENT` | análise crítica contextual | percepção → roteador → seletor → agente/determinístico | propor, sem mutação | capacidade identificada, projeto preservado e telemetria concluída |
| `USE_TOOL` | criação operacional | percepção → roteador → plano → aprovação → executor → checkpoint | mutação governada | tarefa criada, plano persistido e hash exposto na resposta |

## Cenários automatizados

A suíte `interaction-contract-e2e.test.ts` cobre 30 evidências:

1. roteamento real dos três contratos;
2. ausência de mutação em `ANSWER_SELF` e `USE_AGENT`;
3. mutação verdadeira e resultado honesto em `USE_TOOL`;
4. identidade e hash do plano na resposta;
5. isolamento entre dois projetos e duas conversas;
6. recuperação do plano após reinstanciar o armazenamento;
7. telemetria local de conclusão por contrato;
8. presença dos controles de confirmação, retomada e reversão na interface;
9. ausência de `fetch` e de rota `/api/` no painel de planos;
10. rejeição de alegações factuais e operacionais não sustentadas por um especialista;
11. ausência de uma segunda geração por modelo local após a resposta real do especialista;
12. preservação da resposta limitada à evidência e da identidade visível única de Athena;
13. rejeição de conteúdo parcial quando o próprio especialista sinaliza execução malsucedida e descarte de recomendações/críticas desse retorno;
14. projeção das fontes e limitações aceitas para a divulgação expansível no Hub e no Sidecar, mantendo confiança explicitamente heurística.

As suítes complementares de governança e recuperação exercitam DAG, confirmação vinculada, cancelamento, pausa, retomada idempotente, falha parcial, repetição segura e undo concreto.

## Apresentação conversacional dos especialistas

O adaptador compartilhado preserva correções explícitas, referências de continuidade, preferências de estilo confirmadas e os limites de cada persona. Ele não acrescenta uma autoapresentação nem um convite genérico ao fim de toda resposta: cada agente mantém sua voz e começa pelo conteúdo de domínio. Preferências de concisão e registro detectadas na mensagem atual ou confirmadas em Experience são carregadas como metadados estruturados do executor, sem contaminar o texto do pedido nem alterar a resolução de referências; inferências momentâneas não são persistidas. A camada comum não reescreve arbitrariamente conteúdo especializado apenas para imitar um registro, evitando distorcer evidência ou sentido. Em superfícies de Athena, a identidade do subagente continua oculta e Athena permanece a interlocutora visível.

Os testes `base-agent-conversation.test.ts`, `agent-persona-grounding.test.ts` e `music-curator.test.ts` verificam adaptação, continuidade, preservação de identidade nativa de Euterpe e limites de autoridade.

## Critérios de segurança

- aprovação e confirmação possuem escopos distintos;
- planos alterados após aprovação falham por anti-TOCTOU;
- confirmações são de uso único;
- etapas concluídas são preservadas por checkpoint;
- respostas não convertem propostas em alegações de execução;
- reversão permanece indisponível quando não existe executor concreto;
- nenhum fluxo desta fase exige serviço remoto.

## Lacunas remanescentes

- inspeção visual em dispositivo físico continua sendo validação manual, embora os contratos móveis sejam automatizados;
- ferramentas que ainda não possuem captura e `undo` concretos permanecem corretamente bloqueadas para reversão;
- disponibilidade de modelos locais é opcional e não interfere no caminho determinístico validado.

## Decisão

Os três contratos estão aptos para uso integrado local. A próxima evolução recomendada é observabilidade operacional consolidada, sem ampliar autoridade nem introduzir dependência externa.

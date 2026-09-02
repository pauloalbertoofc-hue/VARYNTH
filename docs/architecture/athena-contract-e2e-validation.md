# Athena — validação ponta a ponta dos contratos

**Data:** 2 de setembro de 2026  
**Escopo:** `ANSWER_SELF`, `USE_AGENT` e `USE_TOOL`  
**Premissa:** execução local, sem dependência de API de rede.

## Resultado consolidado

| Contrato | Entrada validada | Caminho observado | Autoridade | Evidência final |
|---|---|---|---|---|
| `ANSWER_SELF` | conversa direta | percepção → roteador → gateway → resposta determinística | somente resposta | texto produzido, zero mutações e telemetria concluída |
| `USE_AGENT` | análise crítica contextual | percepção → roteador → seletor → agente/determinístico | propor, sem mutação | capacidade identificada, projeto preservado e telemetria concluída |
| `USE_TOOL` | criação operacional | percepção → roteador → plano → aprovação → executor → checkpoint | mutação governada | tarefa criada, plano persistido e hash exposto na resposta |

## Cenários automatizados

A suíte `interaction-contract-e2e.test.ts` cobre 15 evidências:

1. roteamento real dos três contratos;
2. ausência de mutação em `ANSWER_SELF` e `USE_AGENT`;
3. mutação verdadeira e resultado honesto em `USE_TOOL`;
4. identidade e hash do plano na resposta;
5. isolamento entre dois projetos e duas conversas;
6. recuperação do plano após reinstanciar o armazenamento;
7. telemetria local de conclusão por contrato;
8. presença dos controles de confirmação, retomada e reversão na interface;
9. ausência de `fetch` e de rota `/api/` no painel de planos.

As suítes complementares de governança e recuperação exercitam DAG, confirmação vinculada, cancelamento, pausa, retomada idempotente, falha parcial, repetição segura e undo concreto.

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

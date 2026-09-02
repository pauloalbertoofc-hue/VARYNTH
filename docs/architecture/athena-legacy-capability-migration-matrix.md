# Athena — matriz de migração do adaptador legado

**Data:** 2 de setembro de 2026  
**Estratégia:** migração incremental, fail-closed e sem remoção prematura do fallback.

| Comando legado | Capacidade consolidada | Política | Mutação real | Undo concreto | Estado |
|---|---|---|---|---|---|
| criar tarefa | `tasks.create` | criação local permitida | sim | excluir tarefa criada | migrado |
| criar nota | `notes.create` | criação local permitida | sim | excluir nota criada | migrado |
| alterar prazo/prioridade/status do projeto | `projects.update` | confirmação humana | sim | restaurar snapshot anterior | migrado |
| arquivar projeto | `projects.update` | confirmação humana | sim | restaurar status anterior | migrado |
| concluir/reabrir tarefa | `tasks.update` | confirmação humana | sim | restaurar tarefa anterior | migrado |
| excluir tarefa | `tasks.trash` | confirmação + soft delete | sim | restaurar registro da lixeira | migrado |
| excluir projeto | `projects.trash` | confirmação + soft delete | sim | restaurar registro da lixeira | migrado |
| organizar próximas tarefas | — | confirmação composta legada | sim | undo composto legado | fallback preservado |
| confirmar/cancelar/desfazer ação legada | — | estado por sessão legado | conforme ação | conforme ação | fallback preservado |

## Regras de transição

- Apenas comandos com alvo determinístico entram no runtime consolidado.
- Mutações sensíveis permanecem persistidas e aguardam confirmação; não são executadas durante o planejamento.
- Cada ferramenta migrada captura estado anterior e posterior.
- O fallback continua disponível para comandos sem paridade consolidada.
- Cada uso do fallback é marcado como `LEGACY_FALLBACK_USED` no diagnóstico local.
- Nenhuma capacidade usa API de rede.

## Critério para remoção futura

Uma interceptação legada só poderá ser removida depois que sua ferramenta consolidada possuir paridade de resultado, confirmação, recuperação após recarga, journal e undo testados.

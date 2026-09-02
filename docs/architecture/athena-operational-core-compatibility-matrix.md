# Athena — matriz permanente do núcleo operacional

**Data:** 2 de setembro de 2026  
**Estratégia:** consolidação concluída, fail-closed e sem fallback operacional paralelo.

| Comando legado | Capacidade consolidada | Política | Mutação real | Undo concreto | Estado |
|---|---|---|---|---|---|
| criar tarefa | `tasks.create` | criação local permitida | sim | excluir tarefa criada | migrado |
| criar nota | `notes.create` | criação local permitida | sim | excluir nota criada | migrado |
| alterar prazo/prioridade/status do projeto | `projects.update` | confirmação humana | sim | restaurar snapshot anterior | migrado |
| arquivar projeto | `projects.update` | confirmação humana | sim | restaurar status anterior | migrado |
| concluir/reabrir tarefa | `tasks.update` | confirmação humana | sim | restaurar tarefa anterior | migrado |
| excluir tarefa | `tasks.trash` | confirmação + soft delete | sim | restaurar registro da lixeira | migrado |
| excluir projeto | `projects.trash` | confirmação + soft delete | sim | restaurar registro da lixeira | migrado |
| organizar próximas tarefas | `tasks.organize` | confirmação humana | transação local | restaurar prioridades e remover criações | migrado |
| confirmar/cancelar/desfazer | controle de plano persistido | sessão + projeto + hash | conforme plano | conforme ferramenta | migrado |

## Regras de transição

- Apenas comandos com alvo determinístico entram no runtime consolidado.
- Mutações sensíveis permanecem persistidas e aguardam confirmação; não são executadas durante o planejamento.
- Cada ferramenta migrada captura estado anterior e posterior.
- O adaptador de operações legado, sua chave de compatibilidade e seu estado paralelo de confirmação/undo foram removidos.
- Comandos operacionais passam exclusivamente pelo plano persistido, pelo `ToolManager` e pela política de permissão.
- Nenhuma capacidade usa API de rede.

## Consolidação final

As interceptações e a implementação antiga de operações de projeto foram removidas após comprovarem paridade de resultado, confirmação, recuperação após recarga, journal e undo. Os adaptadores especializados de leitura, memória e planejamento não pertencem a essa camada operacional e permanecem independentes.

## Invariantes permanentes

- Agentes podem propor, mas nunca recebem autoridade de mutação.
- Toda mutação operacional é uma ferramenta registrada e atravessa o `ToolManager`.
- Operações classificadas como sensíveis exigem confirmação humana de uso único.
- Toda capacidade declarada como reversível possui executor concreto de undo.
- Um plano aceita somente uma execução ou reversão ativa por vez.
- Confirmações e controles são isolados por sessão e projeto.
- Entradas locais corrompidas são rejeitadas antes de qualquer execução.

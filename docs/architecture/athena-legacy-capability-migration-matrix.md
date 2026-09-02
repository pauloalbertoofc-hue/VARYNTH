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
| organizar próximas tarefas | `tasks.organize` | confirmação humana | transação local | restaurar prioridades e remover criações | migrado |
| confirmar/cancelar/desfazer | controle de plano persistido | sessão + projeto + hash | conforme plano | conforme ferramenta | migrado |

## Regras de transição

- Apenas comandos com alvo determinístico entram no runtime consolidado.
- Mutações sensíveis permanecem persistidas e aguardam confirmação; não são executadas durante o planejamento.
- Cada ferramenta migrada captura estado anterior e posterior.
- O adaptador de operações legado fica desligado por padrão; a chave local `varynth_athena_legacy_operations_compat=enabled` permite rollback explícito de compatibilidade.
- Se a compatibilidade for ativada, cada uso do fallback é marcado como `LEGACY_FALLBACK_USED` no diagnóstico local.
- Nenhuma capacidade usa API de rede.

## Critério para remoção futura

As interceptações de operações de projeto foram retiradas do caminho padrão após comprovarem paridade de resultado, confirmação, recuperação após recarga, journal e undo. Outros adaptadores de leitura especializados não pertencem a essa camada de mutação e permanecem independentes.

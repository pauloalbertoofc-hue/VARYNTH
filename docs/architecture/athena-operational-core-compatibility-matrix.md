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

## Evolução versionada

Planos declaram a versão do esquema persistido, do contrato de interação e das ferramentas utilizadas. Migrações puramente estruturais preservam hash, aprovação, confirmação e undo; mudanças incompatíveis de contrato bloqueiam a reconciliação antes da execução.

Antes de converter registros, o armazenamento cria um backup local e marca a transação como em andamento. Uma inicialização após interrupção retoma pelo backup, grava a versão atual e somente então remove o marcador. Versões futuras, downgrade de escrita e entradas sem suporte são rejeitados em modo fail-closed. O diagnóstico expõe versão atual, quantidade migrada, itens rejeitados e existência do backup, sem rede ou API.

## Certificação e travas locais

`npm run certify:athena` executa a barreira local de contratos, capacidades, planos, governança, recuperação, concorrência, versionamento, observabilidade e permissões. O resultado é salvo em `.varynth-data/diagnostics/athena-certification-latest.json`. O ciclo de build executa essa certificação antes de compilar e falha se uma garantia obrigatória for violada.

Permissões, fronteira do `ToolManager`, isolamento entre sessão/projeto e rejeição de versões incompatíveis são obrigatórios. Serialização de operações do mesmo plano e bloqueio de confirmação repetida são ajustáveis, ficam ligados por padrão e podem ser alterados no Athena Command Center. A preferência é local ao navegador; desligamentos geram evento no diagnóstico e não afetam as proteções obrigatórias.

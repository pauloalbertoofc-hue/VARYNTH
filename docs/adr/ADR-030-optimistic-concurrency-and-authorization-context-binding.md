# ADR-030: Controle de Concorrência Otimista (OCC) e Vinculação Contextual de Autorização

## Status
Aceito

## Contexto
Em ambientes multi-aba locais ou com processamento assíncrono em segundo plano, duas tarefas podem tentar modificar o mesmo artefato simultaneamente. Além disso, existe o risco de Time-of-Check to Time-of-Use (TOCTOU), onde o usuário confirma uma ação sensível para um estado X, mas o estado evolui para Y antes do token ser consumido.

## Decisão
1. Adicionar o campo numérico `revision` em `Artifact`, separado e desacoplado do versionamento criativo de `VersionManager`.
2. Em operações de escrita concorrentes, exigir `expectedRevision`. Caso haja divergência com o estado persistido, rejeitar com erro `WRITE_CONFLICT`.
3. Para artefatos legados sem o campo `revision`, aplicar migração determinística na inicialização atribuindo `revision = 1`.
4. Implementar serialização canônica determinística para o cálculo do `authorizationContextHash` em `ActionConfirmation`.
5. Rejeitar a execução de qualquer token de confirmação com `CONFIRMATION_STALE` caso a revisão, versão ou parâmetros críticos tenham sido alterados após a emissão da confirmação.

## Consequências
- **Positivas**: Previne perda de dados por sobrescrita cega e neutraliza ataques ou anomalias do tipo TOCTOU.
- **Trade-offs**: Abas com estado desatualizado precisam recarregar a versão mais recente do artefato antes de salvar.


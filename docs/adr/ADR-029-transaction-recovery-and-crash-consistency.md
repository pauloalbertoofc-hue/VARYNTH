# ADR-029: Recuperação Transacional e Consistência contra Crashes

## Status
Aceito

## Contexto
Operações cross-studio complexas (como atualização de versões de dependência em cascata e promoção de outputs de build) realizam mutações lógicas e físicas em múltiplos subsistemas. Um fechamento repentino do navegador ou falha de I/O no meio do processo poderia deixar dados inconsistentes.

## Decisão
1. Implementar o `TransactionJournal` com persistência síncrona antes do primeiro side effect.
2. Formalizar os estados transacionais: `STARTED` -> `PREPARED` -> `COMMITTING` -> `COMMITTED` / `ROLLING_BACK` -> `ROLLED_BACK`.
3. Persistir snapshots de rollback duráveis e serializados que sobrevivam ao encerramento completo do processo.
4. Na inicialização do sistema, executar uma rotina de `StartupRecovery` estritamente idempotente que detecte transações incompletas e reverta estados não confirmados para a última versão segura.
5. Efeitos colaterais (como emissão de eventos no `athenaEventBus` e notificações visuais) são disparados exclusivamente **após** o commit definitivo da transação.

## Consequências
- **Positivas**: Atomicidade total em mutações complexas, sem propagação de eventos prematuros para a interface.
- **Trade-offs**: Pequeno overhead de I/O para escrita prévia do journal em transações de alta criticidade.


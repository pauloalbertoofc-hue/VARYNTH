# Job Runtime & Processamento Assíncrono

O **Job Runtime Engine** gerencia tarefas computacionais de longa duração (renderização audiovisual, compilação de código, geração de backups massivos e validações autônomas).

---

## 1. Ciclo de Vida do Job

```text
  [QUEUED] ──► [RUNNING] ──► [COMPLETED]
     │             │
     ▼             ▼
[CANCELLED]    [FAILED]
```

1. **`QUEUED`**: Tarefa submetida à fila com payload, logs iniciais e autor.
2. **`RUNNING`**: Processamento ativo com progresso incremental (0% a 100%) e stream de logs.
3. **`COMPLETED`**: Execução finalizada com 100% de progresso, timestamp de término e resultado gravado.
4. **`FAILED`**: Erro de execução com log detalhado e notificação crítica.
5. **`CANCELLED`**: Cancelamento manual solicitado pelo usuário.

---

## 2. Integração com EventBus & Notificações

* Todo evento de ciclo de vida (`JOB_QUEUED`, `JOB_PROGRESS`, `JOB_COMPLETED`, `JOB_FAILED`) é emitido no barramento central.
* Ao finalizar ou falhar, o `JobManager` notifica o usuário na **Central de Notificações**, permitindo navegação direta para o artefato gerado.


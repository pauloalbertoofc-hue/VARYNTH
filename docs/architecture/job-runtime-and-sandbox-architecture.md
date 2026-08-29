# Job Runtime & Sandbox Architecture (Execution Foundation)

A **Execution Foundation** é a infraestrutura responsável por executar processos computacionais de longa duração (renderizações de vídeo, compilações de código, builds de jogos, exportações e indexações vetoriais) com monitoramento de progresso, cancelamento atômico, tolerância a falhas e isolamento rigoroso de sandbox.

---

## 1. Princípio Fundamental de Separação

```text
ARTIFACT (O Produto Criativo)
     ↓
JOB (A Tarefa Longa em Execução)
     ↓
CREATION ENGINE (O Motor de Transformação)
     ↓
SANDBOX (O Ambiente Isolado de Execução)
     ↓
ASSET VALIDATION (A Verificação Física)
     ↓
ARTIFACT ACTIVE (O Produto Oficializado)
```

* **`Artifact`**: A entidade conceitual e seu ciclo de vida (`DRAFT` ──► `ACTIVE` ──► `PUBLISHED`).
* **`Job`**: A unidade assíncrona de trabalho com progresso, logs e checkpoints.
* **`CreationEngine`**: Sabe como transformar inputs em assets físicos.
* **`SandboxRuntime`**: Garante que o código ou processo nunca viole o Core do VARYNTH.

---

## 2. Máquina de Estados Universal de Jobs

```text
      QUEUED
        │ (startJob)
        ▼
     RUNNING ──────────► PAUSED ──► RUNNING
        │                    
 ┌──────┼──────────────┬──────────────┐
 ▼      ▼              ▼              ▼
COMPLETED  FAILED    CANCELLED   INTERRUPTED
            │ (retry)
            ▼
          QUEUED
```

* **Job Recovery**: Em caso de recarregamento do navegador ou reinicialização da aplicação, jobs ativos são detectados e transitam para `INTERRUPTED`, impedindo bloqueios perpétuos.
* **Checkpoints de Segurança**: Etapas longas gravam snapshots intermediários de progresso para possibilitar retomada segura.

---

## 3. Isolamento da Sandbox (Core Sovereign Guard)

* **Rede**: Estritamente `DENY` por padrão.
* **Filesystem**: Isolado em escopo temporário (`SCOPED`).
* **Host Protection**: Tentativas de acessar `process.exit`, `localStorage.clear`, `cookies` ou IO direto do host são bloqueadas imediatamente com diagnóstico de violação.
* **Promoção Validada**: Outputs gerados na Sandbox só se tornam assets oficiais após validação física pelo `AssetManager`.


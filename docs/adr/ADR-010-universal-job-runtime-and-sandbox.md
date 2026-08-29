# ADR-010: Job Runtime Universal, Checkpoints e Modelo de Isolamento de Sandbox

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

Tarefas de longa duração (renderizações de vídeo, compilações de código e backups) precisam de acompanhamento assíncrono transparente, persistência de checkpoints, cancelamento seguro e recuperação após reinicialização da aplicação. Além disso, executar código ou protótipos gerados por IA exige contenção rigorosa para evitar violações no Core do sistema.

---

## 2. Decisão

Centralizar a execução de processos de longa duração no **`JobManager`** e a execução de código no **`SandboxRuntime`**, garantindo:
1. **Máquina de Estados de Jobs**: Transições formais (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`, `INTERRUPTED`, `PAUSED`).
2. **Job Recovery**: Detecção automática de interrupção ao inicializar a aplicação, sem travamento de estado.
3. **Core Sovereign Guard**: A Sandbox bloqueia qualquer acesso destrutivo ao host, rede externa ou código-fonte do Core.
4. **Promoção Validada**: Resultados de execuções na Sandbox só se tornam assets oficiais após validação pelo `AssetManager`.

---

## 3. Consequências

### Ganhos:
* Tolerância a falhas e visibilidade completa do progresso em tempo de execução.
* Proteção estrita do Core contra scripts arbitrários.
* Capacidade de retomar tarefas longas através de checkpoints de segurança.

### Trade-offs:
* Execuções na Sandbox necessitam de wrappers e validações adicionais de saída antes da persistência física.


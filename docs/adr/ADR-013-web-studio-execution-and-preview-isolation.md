# ADR-013: Web Studio Execution Model e Prevenção de Falso Sucesso

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

A criação de aplicações web exige a execução de pipelines de compilação e execução de scripts de terceiros/gerados por IA. Executar código diretamente no Core ou reportar sucesso sem assets válidos compromete a soberania e estabilidade do sistema.

---

## 2. Decisão

Centralizar todo o pipeline de build no `JobManager` executado dentro da `SandboxRuntime` com watchdog preemptivo de timeout. Qualquer falha no build mantém o status do artefato como `DRAFT` (zero falso sucesso). O produto gerado no diretório `dist/` é promovido formalmente como asset físico via `AssetManager`.

---

## 3. Consequências

### Ganhos:
* Execuções longas ou com falha não travam o runtime do VARYNTH.
* Detecção e interrupção honesta de loops infinitos (`EXECUTION_TIMEOUT`).
* Rastreabilidade total de builds no Job Center.

### Trade-offs:
* Exige que os arquivos de saída passem pela etapa de promoção de assets antes da publicação.


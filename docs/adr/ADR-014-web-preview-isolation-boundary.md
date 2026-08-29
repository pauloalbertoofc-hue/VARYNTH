# ADR-014: Web Preview Isolation Boundary e Canal de Mensagens Autenticado

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

A renderização em tempo real de websites no browser envolve riscos de injeção de scripts maliciosos ou loops de mensagens capazes de exfiltrar dados ou causar Denial of Service na interface. A restrição tradicional baseada unicamente em `event.origin` é insuficiente em iframes com origem opaca `null`.

---

## 2. Decisão

Implementar uma barreira estrita em duas camadas para o Web Preview:
1. Iframe com atributo `sandbox="allow-scripts"` (sem `allow-same-origin`), garantindo isolamento de DOM e storage.
2. Protocolo autenticado de envelopes (`WebPreviewEnvelope`) gerenciado pelo `WebPreviewBridge`, validando `schemaVersion`, `previewSessionId`, `channelToken` criptográfico, allowlist de tipos e limitadores de taxa de mensagens (anti-flood).

---

## 3. Consequências

### Ganhos:
* Impossibilidade física de acesso ao Core, cookies ou localStorage do VARYNTH.
* Proteção contra spoofing de mensagens ou flood de eventos.
* Isolamento garantido mesmo em origens opacas.

### Trade-offs:
* O preview necessita de um script cliente injetado para encaminhar os logs do console para o host.


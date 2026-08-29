# Web Studio Architecture (Studio 2)

O **Web Studio** é o segundo estúdio oficial da sequência canônica do VARYNTH OS, responsável pela criação, edição, empacotamento, compilação em Sandbox e preview isolado de aplicações web, landing pages, dashboards e portais.

---

## 1. Princípio Fundamental

```text
WEBSITE ARTIFACT ≠ SOURCE FILES ≠ BUILD ≠ PREVIEW ≠ PUBLISHED OUTPUT
```

O Web Studio desacopla rigorosamente:
1. **Website Artifact**: O produto digital formal no Universal Artifact System (`type: "WEBSITE"`).
2. **Arquivos Fonte**: Arquivos virtuais (`HTML`, `CSS`, `JS`, `TS`, `JSON`, `Markdown`, `SVG`).
3. **Build Pipeline**: Execução local controlada pelo `JobManager` dentro da `SandboxRuntime`.
4. **Isolated Preview**: Visualização sandboxed via iframe opaco (`sandbox="allow-scripts"`) com envelope de segurança e bridge autenticada.
5. **Publicação**: Transição de status para `PUBLISHED` sujeita a confirmação explícita humana (`CONFIRM`).

---

## 2. Fronteira de Isolamento e Segurança

```text
UNTRUSTED WEB CODE (Iframe / Sandbox)
        │
   [postMessage Envelope (schemaVersion, sessionId, channelToken, allowlisted type, sizeLimit)]
        ▼
   WebPreviewBridge (Host Watchdog, Rate Limiter, Abuse Protection)
        │
   VARYNTH CORE (Totalmente Inviolável)
```

* **Sem `allow-same-origin`**: O iframe opera com origem opaca `null`, tornando impossível qualquer acesso a `window.parent.localStorage`, cookies ou stores do VARYNTH.
* **Canal Autenticado**: Cada sessão de preview possui um token efêmero (`channelToken`). Mensagens sem token válido ou com IDs forjados são sumariamente descartadas.
* **Prevenção de Runaway Code**: Watchdog externo encerra qualquer execução em loop infinito (`while(true){}`) por timeout preemptivo, registrando honestamente o Job como `FAILED`/`EXECUTION_TIMEOUT`.
* **Proteção contra Flood**: Rate-limiting rígido encerra a sessão de preview caso o código emita mensagens em taxa abusiva.

---

## 3. Integração Cognitiva da Athena

* **ChangeSets Multi-Arquivo**: Propostas de alteração em múltiplos arquivos simultâneos são apresentadas em modal com diff antes de qualquer consolidação.
* **Snapshot de Segurança Obrigatório**: A aplicação de propostas da IA gera automaticamente um snapshot prévio no `VersionManager` seguindo o Princípio Alex.
* **Proteção de Sites Publicados**: Modificações em websites no estado `PUBLISHED` exigem confirmação explícita do usuário.


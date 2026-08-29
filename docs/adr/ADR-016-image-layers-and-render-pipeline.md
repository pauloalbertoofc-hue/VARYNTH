# ADR-016: Arquitetura de Camadas de Imagem e Pipeline de Renderização Local

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

A composição de imagens demanda suporte a múltiplos tipos de camadas (imagens, textos, formas geométricas, grupos) com rastreamento honesto de progresso de renderização, limites de segurança de memória e ausência de dependências de cloud APIs.

---

## 2. Decisão

Construir o `ImageRenderEngine` localmente com:
1. Suporte a camadas `IMAGE`, `TEXT`, `SHAPE`, `GROUP`, `BACKGROUND` com proteção contra ciclos em grupos.
2. Limites de recursos em runtime (`MAX_CANVAS_DIMENSION = 8192px` / `MAX_PIXEL_MEMORY_BYTES = 128MB`).
3. Formatos de exportação raster reais e verificáveis (`PNG`, `JPEG`, `WEBP`).
4. Pipeline assíncrono via `JobManager` para rastreamento de tarefas de exportação.

---

## 3. Consequências

### Ganhos:
* Composição determinística rápida sem chamadas de rede.
* Prevenção de travamento do navegador por canvases gigantes.
* Rastreabilidade total no Job Center.

### Trade-offs:
* Exportação vetorial SVG adiada para versão futura especializada.


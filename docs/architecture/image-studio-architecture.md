# Image Studio Architecture (Studio 3)

O **Image Studio** é o terceiro estúdio oficial da sequência canônica do VARYNTH OS, responsável pela criação, manipulação não-destrutiva de camadas, renderização gráfica e exportação de composições visuais (cards, capas de documentos, posters e thumbnails).

---

## 1. Princípio Fundamental

```text
IMAGE ARTIFACT ≠ SOURCE ASSET ≠ LAYER STACK ≠ TRANSFORMATIONS ≠ RENDERED OUTPUT
```

> *"The original is evidence. The editable state is interpretation. The render is a derived result."*

O Image Studio desacopla rigorosamente:
1. **Image Artifact**: O produto digital formal no Universal Artifact System (`type: "IMAGE"`).
2. **Source Asset**: O arquivo binário bruto original importado, imutável e preservado integralmente (`isSource = true`).
3. **Layer Stack & Transformations**: Metadados declarativos reativos (`ImageDocumentState` e `ImageLayer[]`), editáveis sem modificação do arquivo físico.
4. **Rendered Output**: Produto visual gerado pelo `ImageRenderEngine` e promovido como `Derived Asset` (`isDerived = true`).

---

## 2. Sistema de Camadas e Não-Destrutividade

* **Tipos de Camadas Suportados**:
  * `IMAGE`: Camada referenciando um asset visual.
  * `TEXT`: Tipografia com controle de tamanho, peso, alinhamento e cores.
  * `SHAPE`: Formas geométricas (retângulo, elipse, linha).
  * `GROUP`: Agrupamento hierárquico acíclico validado estruturalmente.
  * `BACKGROUND`: Configuração de cor de fundo do canvas.
* **Ajustes Não-Destrutivos**:
  * Brilho, contraste, saturação e escala de cinza manipulados via metadados de camada sem reescrever o arquivo binário.
* **Histórico de Sessão (Undo / Redo)**:
  * Pilha de comandos de edição em memória independente do `VersionManager`, permitindo `undo/redo` ágil sem poluição do histórico de versões por pixel.

---

## 3. Segurança e Limites de Runtime

* **Proteção contra Sobrecarga de Canvas**: Limite de segurança (`MAX_CANVAS_DIMENSION = 8192px` e `MAX_PIXEL_MEMORY_BYTES = 128MB`), bloqueando canvases gigantes com o erro `IMAGE_DIMENSIONS_EXCEED_RUNTIME_LIMIT`.
* **Sanitização de SVG**: Neutralização automática de tags `<script>`, handlers `onload` e execução ativa em arquivos SVG importados.
* **Integridade de Assets**: Validação contínua de integridade via `AssetManager`. Se uma camada referenciar um asset indisponível, o sistema emite alerta `ASSET_MISSING` e proíbe a promoção do artefato para `ACTIVE` ou `PUBLISHED`.
* **Alinhamento Estrito de Recursos de Exportação**: Suporte determinístico honesto a formatos raster (`PNG`, `JPEG`, `WEBP`).

---

## 4. Integração Cognitiva da Athena

* **Ações Determinísticas**: Comandos contextuais para centralização, escala, rotação, ajustes e criação de formas/textos.
* **ChangeSets Atômicos**: Propostas compostas da Athena são executadas em bloco transacional com rollback automático em caso de falha e snapshot prévio obrigatório de segurança no `VersionManager` (Princípio Alex).


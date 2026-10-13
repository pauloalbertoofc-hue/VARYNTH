# VARYNTH Visual Ecosystem — Auditoria inicial

Data da auditoria: 2026-10-11

## Escopo

Esta auditoria inicia a especificação `VARYNTH VISUAL ECOSYSTEM`. O checkout foi tratado como fonte de verdade; a árvore de trabalho já contém alterações do usuário e não foi limpa, resetada ou reorganizada.

## Arquitetura encontrada

- Next.js App Router 16.3.3, React 19 e TypeScript.
- `src/app/modules/studio/page.tsx` é o hub e workspace dos seis estúdios atuais: Document, Web, Image, Audio, Video e Game.
- `src/lib/studio/studio-registry.ts` é o registro central atual; ele ainda não modela Visual Core, Camera, Handbook ou Pictor como produtos independentes.
- Image Studio já possui documento editável, camadas, grupos, texto, formas, transformações, undo/redo, change sets, persistência local e renderização determinística.
- `artifactService`, `assetManager`, `versionManager` e os serviços por estúdio formam a infraestrutura reutilizável para artefatos, assets, versões e integração entre módulos.
- A persistência visual existente é híbrida: estado de composição de imagem em `localStorage` e blobs de assets em IndexedDB, com artefatos/versionamento no subsistema de artifacts.
- Athena já possui ações visuais e change sets; a fronteira correta é proposta auditável e aceite explícito, não mutação silenciosa.
- Existem 44 route handlers em `src/app/**/route.ts` no checkout auditado. Esse número é uma fotografia do estado atual e não deve virar constante fixa em documentação.

## Componentes reutilizáveis

1. Modelo `Artifact`/asset/version para identidade, proveniência e exportação.
2. Image document state e `ImageOperation` como núcleo inicial de documento visual editável.
3. Render engine e limites de canvas para processamento determinístico no navegador.
4. `StudioShell`, painéis de assets/relações/versões e contratos de change set.
5. Event bus, jobs, sandbox e integração Athena para tarefas assíncronas e governadas.

## Limitações confirmadas

- Não há ainda contrato universal versionado para documentos visuais abrangendo raster, vetor, procedural, shader, 3D, dependências e proveniência completa.
- Image Studio não equivale ainda a um editor profissional completo: nós, shaders, 3D e análise científica continuam fora do escopo implementado; Camera, Digital Painting e Vector Studio já existem como módulos locais integrados, com limites explícitos.
- O registro atual mistura estúdios de produção existentes com a futura separação Capture/Enhance/Edit/Create/Analyze/Produce.
- Capacidades de hardware e GPU não devem ser anunciadas antes de um adapter real e de um estado explícito de suporte/permissão.

## Riscos de integração

- A árvore de trabalho está amplamente modificada; alterações devem ser pequenas e aditivas.
- Novas rotas exigem atualização da regressão de documentação derivada do inventário real.
- Persistência de blobs, proveniência e migração de schema precisam permanecer compatíveis com artifacts e Vault.
- Execução de código visual deve permanecer isolada no sandbox; nunca usar execução arbitrária no contexto privilegiado.
- Produção não pode ser inferida de testes locais ou de uma tela renderizada.

## Estratégia aprovada para as próximas fatias

### Etapa 1 — Contratos fundamentais

Adicionar tipos versionados para documento visual, operações, capacidades, proveniência e execução, sem substituir `ImageDocumentState`. Criar adaptadores compatíveis e testes de invariantes.

### Etapa 2 — Visual Core

Extrair contratos de asset, renderização, cor, geometria, máscara, efeitos e scheduler a partir das abstrações já presentes. Implementar primeiro o caminho determinístico suportado pelo navegador.

### Etapa 3 — Integração incremental

Conectar Image Studio ao contrato universal através de migração explícita. Só depois adicionar Camera, pintura/vetor, procedural/shader e recursos avançados, cada um com capacidade real, persistência, exportação e testes.

## Plano de validação

- Teste unitário de schema, migração, proveniência e round-trip de serialização.
- Regressão existente de Image Studio e operabilidade manual.
- `npx tsc --noEmit` após cada alteração TypeScript relevante.
- `npm run test:docs:regression` se o inventário de rotas/documentação mudar.
- `npm run build` completo antes de qualquer alegação de integração publicada.

## Decisão

O primeiro incremento de código deve ser o contrato universal e seu adaptador para Image Studio. Não criar uma nova tela que apenas anuncie os estúdios ainda inexistentes.

## Incrementos implementados após a auditoria

- `src/lib/visual-core/index.ts` passou a ser o entrypoint público do Visual Core.
- O contrato universal ganhou migração legada, proveniência validada e receita opcional de grafo de processamento.
- Camera possui adapter Web, sessão de captura, modos AUTO/DOCUMENT/VIDEO, Quality Gate local, biblioteca persistente e caminho Camera → Image Studio.
- Foram adicionados os fundamentos determinísticos de geometria, cor, máscaras, efeitos, proveniência e runtime de processamento.
- O módulo visível `/modules/camera` foi incluído no catálogo do VARYNTH; suas limitações de hardware permanecem explícitas.
- Foram adicionados os módulos locais `Visual Studio`, `Visual Handbook`, `Visual Compare`, `Digital Painting` e `Vector Studio`, com rotas reais, persistência quando aplicável, exportação e integração incremental com Image Studio.
- Camera agora cobre os seis perfis AUTO, SMART, PRO, DOCUMENT, VIDEO e STUDIO; VIDEO usa `MediaRecorder` quando suportado e a mídia original é persistida em IndexedDB.
- Pictor foi integrado ao registro Athena como agente consultivo parcial: recebe somente texto e métricas locais do Quality Gate, pode interpretar relatórios de qualidade/proveniência e permanece sem acesso a blobs, arquivos ou ferramentas. O Visual Studio preserva até 20 consultas localmente, com recuperação após reload e limpeza explícita pelo usuário. Isso não equivale ainda à autonomia espacial, personalidade durável ou edição autorizada descritas na especificação.
- Vector Studio agora suporta formas, texto e curvas Bézier parametrizadas com persistência local, exportação SVG e encaminhamento ao Image Studio. Edição individual de nós, gradientes, clipping paths e operações booleanas permanecem explicitamente fora do escopo implementado.
- Vector Studio também oferece histórico de edição local limitado a 50 estados por `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y` e `Ctrl/Cmd+Shift+Z`; o histórico não substitui ainda um versionamento persistente de documentos.
- O `3D & Rendering Studio` agora oferece uma cena WebGL2 real com cubo indexado, câmera parametrizada, material de cor, persistência local e exportação PNG. Iluminação física, importação de malhas e materiais avançados continuam explicitamente ausentes.
- O `Mathematical Art Studio` agora oferece Mandelbrot e Julia determinísticos em Canvas 2D, com iterações, zoom, parâmetro complexo local, persistência e exportação PNG. Aceleração GPU e composição matemática avançada continuam ausentes.

## Lacunas ainda abertas

- Não há backend nativo Android/Desktop de câmera nem captura RAW/DNG validada.
- Não há ainda editor dedicado de nós, shaders editáveis ou AI Image Studio; o 3D cobre apenas o primeiro corte WebGL2 explicitamente documentado.
- ICC/HDR, segmentação semântica, depth capture, multiframe HDR e processamento GPU permanecem não implementados.
- A validação de proveniência atual é estrutural; integridade criptográfica e cadeia assinada ainda exigem decisão de armazenamento.
- As revisões posteriores ao último deploy confirmado estão no branch GitHub, mas a publicação Vercel está temporariamente impedida pelo limite diário `api-deployments-free-per-day`; produção não deve ser inferida do build local.

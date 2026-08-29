# Universal Artifact System & Arquitetura de Criação

O **Universal Artifact System** é a espinha dorsal de criação, transformação, versionamento e preservação digital do VARYNTH OS. Ele permite que o usuário e a Athena gerenciem entidades criativas complexas (código, documentos, websites, imagens, áudio, vídeos, jogos, diagramas e datasets) sob uma infraestrutura soberana e local-first.

---

## 1. Princípio Fundamental: File != Artifact

No VARYNTH OS, existe uma separação estrita entre:

```text
PROJECT
   ≠
ARTIFACT
   ≠
FILE / ASSET
   ≠
VERSION
   ≠
JOB
```

Exemplo prático:
```text
VIDEO ARTIFACT (id: "art-video-01", type: "VIDEO", status: "DRAFT")
├── Metadata: { durationMs: 45000, resolution: "1080p", fps: 30 }
├── Relationships: [ { type: "DERIVED_FROM", target: "art-doc-research" } ]
├── Provenance: { creator: "ATHENA", prompt: "Gerar vídeo explicativo...", engineUsed: "local-document-engine" }
├── Versions: [ v1.0 (Initial), v2.0 (Script Updated) ]
└── Asset Files (Físicos):
    ├── script.md      (Asset: roteiro estruturado)
    ├── scene-01.png   (Asset: storyboard)
    ├── voice.wav      (Asset: áudio local)
    ├── subtitles.srt  (Asset: legendas)
    └── render.mp4     (Asset: vídeo compilado)
```

---

## 2. Tipos de Artefatos Suportados

1. `DOCUMENT`: Monografias, tratados, artigos e pareceres estruturados.
2. `CODE`: Bibliotecas, scripts, módulos e motores compilados (Rust/WASM, Python, TS).
3. `WEBSITE`: Páginas, aplicações web e portais interativos.
4. `IMAGE`: Storyboards, diagramas conceituais e assets visuais.
5. `AUDIO`: Gravações, narrações locais e trilhas.
6. `VIDEO`: Projetos audiovisuais compostos por cenas e timeline.
7. `GAME`: Projetos lúdicos com mecânicas, assets e código de gameplay.
8. `DATASET`: Coleções de dados estruturados (JSON, CSV, embeddings).
9. `DIAGRAM`: Mapas arquiteturais, fluxogramas e diagramas conceituais.
10. `INTERACTIVE`: Experiências exploratórias baseadas em WebGL/Canvas.
11. `OTHER`: Artefatos multimídia genéricos.

---

## 3. AssetManager & Armazenamento Físico de Binários

* **Zero Base64 em LocalStorage**: Grandes binários (vídeos, áudios, compilações de jogos) são armazenados em `OPFS` ou `IndexedDB Blob`.
* **Verificação de Integridade**: O `AssetManager` valida se os assets físicos registrados existem e estão íntegros (`VALID`, `ASSET_MISSING`, `ASSET_CORRUPTED`).
* **Consistência Obrigatória**: Artefatos multimídia (`VIDEO`, `GAME`, `AUDIO`, `IMAGE`) não podem ser promovidos para status `ACTIVE` sem assets físicos reais vinculados.
* **Detecção de Órfãos**: O `AssetManager` rastreia assets que não possuem artefatos vinculados para auditoria de espaço.

---

## 4. VersionManager & Alex Principle

Toda modificação relevante gera uma versão imutável:
* **Snapshot Pré-Modificação**: Antes de qualquer intervenção, o estado anterior é capturado.
* **Rollback Não-Destrutivo (Alex Principle)**: Restaurar uma versão antiga (ex: v1.0) cria uma nova versão (ex: v4.0) com o estado restaurado, sem apagar o histórico intermediário (v2.0 e v3.0).
* **Comparação Estruturada**: Diff de metadados, tags e assets físicos adicionados/removidos.

---

## 5. CreationEngine & Transparência de Capacidade

* **Zero Falso Sucesso**: Quando uma capacidade de criação não está disponível localmente (ex: renderização final de vídeo sem engine FFmpeg instalada), o sistema retorna explicitamente `CAPABILITY_UNAVAILABLE`, em vez de simular sucesso.
* **Status Inicial DRAFT**: A Athena pode estruturar rascunhos completos de vídeos, jogos e sites em status `DRAFT` autonomamente.

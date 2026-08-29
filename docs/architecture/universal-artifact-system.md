# Universal Artifact System & Arquitetura de Criação

O **Universal Artifact System** é a espinha dorsal de criação e preservação digital do VARYNTH OS. Ele permite que tanto o usuário quanto a Athena gerenciem entidades criativas complexas (código, monografias, websites, áudio, vídeos, jogos e datasets) sob um modelo soberano, versionado e relacionado.

---

## 1. Princípio Fundamental: File != Artifact

No VARYNTH OS, existe uma separação estrita entre a entidade conceitual (**Artifact**) e os recursos físicos/digitais que a compõem (**Files / Assets**):

```text
VIDEO ARTIFACT (id: "art-video-01", type: "VIDEO")
├── Metadata: { durationMs: 45000, resolution: "1080p", fps: 30 }
├── Relationships: [ { type: "DERIVED_FROM", target: "art-doc-research" } ]
├── Provenance: { creator: "ATHENA", prompt: "Gerar vídeo explicativo..." }
└── Asset Files:
    ├── project.json   (File: roteiro estruturado)
    ├── scene-01.png   (File: storyboard)
    ├── voice.wav      (File: áudio local)
    ├── subtitles.srt  (File: legendas)
    └── render.mp4     (File: vídeo compilado)
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

## 3. Versionamento Universal & Snapshots de Segurança

Toda modificação relevante em um artefato gera automaticamente uma nova versão congelada (`v1.0 -> v2.0`):

* **Snapshot Pré-Modificação**: Antes de qualquer intervenção autônoma da Athena, um snapshot do estado anterior é registrado.
* **Rollback Atômico**: Qualquer versão anterior pode ser restaurada com um clique, sem perda de dados históricos.
* **Trilha de Auditoria**: Registra quem realizou a alteração (`USER`, `ATHENA`, `SYSTEM`), a data/hora e o sumário da mudança.

---

## 4. Grafo de Relacionamentos & Proveniência

Os artefatos se conectam na **Rede Epistêmica do VARYNTH**:

```text
Projeto de Pesquisa
       ↓
Tratado de IA (DOCUMENT)
 ├── SOURCE_OF → Roteiro do Vídeo (VIDEO)
 ├── ADAPTED_TO → Jogo Educativo (GAME)
 └── PUBLISHED_IN → Portal Interativo (WEBSITE)
```

Cada artefato registra sua **Proveniência**:
* Autor (`creator`);
* Contexto ou prompt de geração (`generationPrompt`);
* Artefatos originais de onde foi derivado (`derivedFromArtifactIds`);
* ID de execução segura na Sandbox (`sandboxRunId`).


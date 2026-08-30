# VARYNTH OS — Cross-Studio Integration Architecture (Phase 1)

## 1. Visão Geral e Princípio Unificador

A suíte criativa do VARYNTH OS é composta por seis Studios canônicos:

```text
DOCUMENT (1) → WEB (2) → IMAGE (3) → AUDIO (4) → VIDEO (5) → GAME (6)
```

O princípio fundamental da **VARYNTH Creation Foundation** é:

```text
SIX STUDIOS ≠ SIX ISLANDS
SIX STUDIOS + SHARED ARTIFACT GRAPH + SHARED ASSETS + PROVENANCE + VERSIONED DEPENDENCIES = ONE CREATIVE SYSTEM
```

Os artefatos e assets fluem através dos estúdios sem duplicação física redundante e com rastreabilidade formal:

```text
USER / INTENT
↓
ATHENA COGNITIVE OS
↓
CREATIVE GRAPH (Dependency & Provenance Graph)
↓
UNIVERSAL ARTIFACTS
├── DOCUMENT
├── WEBSITE / CODE
├── IMAGE / DIAGRAM
├── AUDIO
├── VIDEO
└── GAME / INTERACTIVE
↓
ASSET USAGE REGISTRY (Physical Blobs, SHA-256 Checksums, Alex Principle GC)
↓
VERSION MANAGER (Alex Principle Snapshots & Rollback to vNext)
↓
JOB MANAGER (Deterministic Render & Build Pipelines in Sandboxes)
```

---

## 2. Separação Estrita: Artifact Relationship vs. Asset Usage

A arquitetura formaliza a distinção entre **Intenção de Projeto** (nível lógico/semântico) e **Consumo Físico de Ativos** (nível binário imutável):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ARTIFACT RELATIONSHIP                           │
│ (Semântica de Projeto: Intenção, Versionamento Lógico e Provenance)    │
│                                                                        │
│ Video Studio Artifact "Documentário CNJ" (v3)                          │
│   ├── DEPENDS_ON ──> Audio Studio Artifact "Trilha Principal" (v2)     │
│   ├── DESCRIBES  ──> Document Studio Artifact "Roteiro Oficial" (v1)   │
│   └── USES       ──> Image Studio Artifact "Logo Animado" (v4)         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ compila / renderiza
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PHYSICAL ASSET USAGE                          │
│ (Autoridade Física: AssetManager, SHA-256, Blobs e Cache Imutável)     │
│                                                                        │
│ Video Clip (Track 2, Clip 1)                                           │
│   └── USES_ASSET ──> "trilha-mix-v2.wav" (AssetID: blob-8371, 14.2MB)  │
│ Video Clip (Track 1, Clip 3)                                           │
│   └── USES_ASSET ──> "logo-vector-v4.png" (AssetID: blob-9124, 1.8MB)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Creative Graph & Regras de Aresta

### 3.1 Tipos Estruturais Canônicos (`CreativeEdgeType`)
1. `DERIVED_FROM`: Artefato gerado a partir de outro (e.g. Sprite derivado de Image).
2. `DEPENDS_ON`: Dependência funcional/estrutural de composição.
3. `USES`: Consumo de elemento de outro artefato.
4. `REFERENCES`: Citação associativa (permite ciclos conceituais).
5. `GENERATED_FROM`: Geração via plano cognitivo da Athena.
6. `DESCRIBES`: Documento ou GDD que especifica o design de uma cena/jogo.
7. `IMPLEMENTS`: Código ou jogo que realiza a especificação.
8. `CONTAINS`: Relação estrutural de inclusão.
9. `PRODUCES`: Artefato que produz um Derived Asset físico.

### 3.2 Regras de Ciclo
- **Estritamente Acíclico (DAG)**: `DERIVED_FROM`, `GENERATED_FROM`, `PRODUCES`, `DEPENDS_ON`.
- **Ciclos Associativos Permitidos**: `REFERENCES`, `RELATED_TO`.

---

## 4. Version Pinning & Stale Dependencies

### 4.1 Identidade Imutável (`targetVersionId`)
A autoridade do version pinning reside em `targetVersionId` (e.g. `ver-174000-abc`), enquanto `targetVersionNumber` é mantido para exibição legível na interface.

### 4.2 Critério de Elegibilidade (`FOLLOW_LATEST`)
`FOLLOW_LATEST` consome a versão ativa mais recente elegível (rejeitando versões em status `TRASHED` ou `FAILED`). Artefatos `PUBLISHED` são pinados por padrão e alterações exigem confirmação explícita.

### 4.3 Detecção de Dependências Desatualizadas
Quando a origem evolui para `vN+1`, consumidores pinados em `vN` não sofrem mutações silenciosas; a engine reporta honestamente `UPDATE_AVAILABLE`.

---

## 5. Validador de Integridade Criativa (`CreativeIntegrityValidator`)

Avalia continuamente:
1. `SOURCE_MISSING`: Artefato de origem inexistente.
2. `SOURCE_TRASHED`: Artefato de origem na Lixeira (distinguindo degradação semântica de indisponibilidade física).
3. `UPDATE_AVAILABLE`: Versão mais recente disponível para revisão.
4. `ASSET_MISSING`: Blob físico ausente no armazenamento local.
5. `VERSION_MISMATCH`: Relação aponta para versão X, mas o asset físico foi gerado a partir da versão Y.
6. `BROKEN_PROVENANCE`: Elo ausente na árvore genealógica de proveniência.
7. `UNUSED_DEPENDENCY`: Dependência declarada sem consumo efetivo de assets.


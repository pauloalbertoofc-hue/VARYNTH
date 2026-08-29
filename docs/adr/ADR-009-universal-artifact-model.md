# ADR-009: Modelo Universal de Artefatos, VersionManager e AssetManager

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

À medida que o VARYNTH OS evolui para suportar múltiplos studios criativos (Document, Code, Video, Game, Audio, Web), tratar criações digitais como arquivos soltos ou modelos desconectados geraria fragmentação de persistência, inconsistência de versionamento e perda de rastreabilidade epistêmica.

---

## 2. Decisão

Adotar uma arquitetura universal centralizada no **`Artifact`**, separando formalmente:
1. **`Project`**: Organiza e planeja as metas de alto nível.
2. **`Artifact`**: A entidade criativa conceitual, com ciclo de vida (`DRAFT` ──► `ACTIVE` ──► `PUBLISHED` ──► `ARCHIVED`).
3. **`AssetFile`**: Os recursos físicos reais (vídeo, áudio, código, imagem) gerenciados pelo `AssetManager` em `OPFS`/`IndexedDB Blob` (zero Base64 em LocalStorage).
4. **`VersionManager`**: Preserva a evolução histórica através de snapshots atômicos e rollbacks não-destrutivos (Alex Principle).
5. **`CreationEngine`**: Camada local extensível de engines com transparência (`CAPABILITY_UNAVAILABLE` quando não há engine local, proibindo falsos sucessos).

---

## 3. Consequências

### Ganhos:
* Todos os tipos de criação compartilham as mesmas regras de auditoria, permissões, persistência e exportação.
* Permite à Athena criar rascunhos de vídeos e jogos estruturados mesmo antes de termos engines de renderização instaladas.
* Garantia de integridade física: artefatos de mídia não se tornam `ACTIVE` sem arquivos físicos reais.

### Trade-offs:
* Exige sincronização entre metadados conceituais (`ArtifactRepository`) e blobs físicos (`AssetStorage`).


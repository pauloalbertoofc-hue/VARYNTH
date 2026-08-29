# Document Studio Architecture (Studio 1)

O **Document Studio** é o primeiro estúdio oficial do VARYNTH OS, responsável pela criação, estruturação, versionamento, exportação e assistência de inteligência artificial sobre monografias, tratados, pareceres jurídicos, relatórios técnicos, ensaios e roteiros audiovisuais.

---

## 1. Princípio Fundamental

O Document Studio **NÃO** é um editor de texto isolado. Ele é a primeira implementação concreta do **Universal Artifact System**, integrando:
* `ArtifactType = DOCUMENT`;
* `VersionManager` com o Princípio Alex de preservação histórica;
* `AssetManager` para anexos e figuras;
* `PermissionPolicyEngine` para proteger documentos publicados;
* `Athena Copilot Criativo` para ideação, estruturação e sugestões de reescrita;
* Exportadores determinísticos (`Markdown`, `HTML`, `PDF / Print`).

---

## 2. Modelo de Dados do Documento

```text
PROJECT (Opcional)
   ↓
DOCUMENT ARTIFACT (Tipo DOCUMENT, Status DRAFT ──► ACTIVE ──► PUBLISHED)
   ↓
VERSIONS (Histórico sequencial v1.0, v2.0... com diff e rollback não-destrutivo)
   ↓
METADATA & OUTLINE (Classificação, Status Editorial, Seções e Referências)
   ↓
CONTENT & ASSETS (Texto em Markdown e arquivos físicos no AssetManager)
   ↓
EXPORT (Markdown / HTML / PDF)
```

---

## 3. Classificação e Status Editorial

* **Tipos Nativos**:
  * `ARTICLE`: Artigos acadêmicos e científicos;
  * `RESEARCH`: Relatórios de pesquisa e descobertas;
  * `LEGAL_DOCUMENT`: Pareceres jurídicos, petições e notas técnicas;
  * `SCRIPT`: Roteiros estruturados em cenas (base para o futuro Video Studio);
  * `MANUAL`: Manuais de engenharia e especificações técnicas;
  * `REPORT`, `ESSAY`, `NOTEBOOK`, `PRESENTATION_SCRIPT`, `GENERIC`.

* **Status Editorial** (distinto do ciclo de vida do Artifact):
  * `WRITING` ──► `REVIEW` ──► `FINAL`.

---

## 4. Integração Cognitiva da Athena

* **Modo de Sugestão (Tracked Changes)**: A Athena propõe alterações pontuais que podem ser visualizadas e aceitas ou rejeitadas pelo usuário antes de serem consolidadas no documento.
* **Snapshot de Segurança**: Antes de qualquer intervenção automatizada da Athena no conteúdo, um snapshot prévio de versão é gerado automaticamente.
* **Governança de Publicação**: Modificações feitas pela Athena em documentos com status `PUBLISHED` são terminantemente bloqueadas sem confirmação explícita humana (`CONFIRM`).


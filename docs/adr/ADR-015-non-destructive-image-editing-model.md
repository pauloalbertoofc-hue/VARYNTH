# ADR-015: Modelo de Edição Não-Destrutiva de Imagens e Imutabilidade de Source Assets

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

A edição visual tradicional em ferramentas simples costuma achatar ou reescrever permanentemente o arquivo de imagem no disco após transformações de corte, rotação ou filtros. No VARYNTH OS, a soberania e a auditabilidade dos dados exigem que o arquivo de origem permaneça inalterado para permitir rollbacks perfeitos e reinterpretações futuras.

---

## 2. Decisão

Estabelecer o modelo de **Edição Não-Destrutiva**:
1. Imagens importadas são registradas no `AssetManager` como `isSource: true` e permanecem imutáveis.
2. Todas as mutações e transformações visuais são expressas na estrutura de dados reativa `ImageDocumentState`.
3. O render produz um novo `Derived Asset` (`isDerived: true`) vinculado ao artefato, preservando o asset original.

---

## 3. Consequências

### Ganhos:
* Garantia absoluta de preservação do arquivo de origem (Princípio Alex).
* Capacidade de modificar filtros, textos e cortes a qualquer momento sem perda de qualidade.
* Reutilização segura de um mesmo source asset por múltiplos artefatos (ex: Web, Vídeo, Documento).

### Trade-offs:
* Exige que o motor de renderização componha as camadas sob demanda ao exportar.


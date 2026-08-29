# ADR-008: Modelo de Autoridade e Matriz de Permissões da Athena

* **Status:** Accepted (Draft via Review Center)
* **Data:** 2026-08-29
* **Decisores:** Paulo Alberto (Fundador & Arquiteto), Athena (Copilot Cognitivo)

---

## 1. Contexto

A Athena está evoluindo de um assistente de ideação e pesquisa para um coautor capaz de criar artefatos digitais complexos (código, vídeos, websites, jogos, documentação e versões). À medida que a capacidade cognitiva da IA cresce, o risco de mutações acidentais, destruição de dados ou alterações indevidas no código-fonte do sistema aumenta exponencialmente.

---

## 2. Decisão

Adotar o princípio arquitetural:
> **"Capacidade não implica autoridade" (Capability does not imply authority).**

Centralizar 100% das decisões operacionais no **`PermissionPolicyEngine`**, aplicando as seguintes diretrizes invioláveis:
1. **Core Sovereign Rule**: A Athena é proibida (`DENY`) de alterar autonomamente o código do Core do VARYNTH.
2. **Hard Delete Proibido**: A Athena não possui permissão para expurgar dados da Lixeira (`DELETE_HARD: DENY`).
3. **Fronteira de Sandbox**: Execução de código permitida exclusivamente sob `SANDBOX`, sem escalonamento para o host.
4. **Publicação com Confirmação**: Todo documento ou artefato publicado exige validação humana prévia.
5. **Perfis Especializados**: Agentes do conselho (Justitia, Logos, Strategos, Critias, Mnemosyne) possuem escopos e limites de autoridade estritos.

---

## 3. Consequências

### Ganhos:
* A Athena pode se tornar infinitamente mais capaz e inteligente sem adquirir controle irrestrito do VARYNTH OS.
* Proteção absoluta contra deleção destrutiva acidental.
* Auditoria completa com tokens de confirmação de uso único (anti-replay).

### Trade-offs:
* Operações de alta relevância (publicações e exclusões) exigem interação e consentimento explícito do usuário.


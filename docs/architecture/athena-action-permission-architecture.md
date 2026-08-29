# Athena Action & Permission Architecture

A **Athena Action & Permission Architecture** é a camada central de governança e controle operacional do VARYNTH OS. Ela estabelece com precisão matemática o que a Athena pode compreender, planejar, executar, publicar ou destruir dentro do ecossistema.

---

## 1. Princípio Fundamental de Autoridade

```text
ATHENA CAN UNDERSTAND
        ≠
ATHENA CAN EXECUTE
        ≠
ATHENA CAN PUBLISH
        ≠
ATHENA CAN DESTROY
```

* **Capacidade Cognitiva Ampla**: Athena possui compreensão irrestrita do contexto, do código, dos projetos e da documentação.
* **Autoridade Operacional Controlada**: Nenhuma ação mutável ou destrutiva ocorre sem verificação prévia no `PermissionPolicyEngine`.

---

## 2. Core Sovereign Rule

> **A Athena pode compreender o Core, documentar o Core, analisar o Core e sugerir melhorias no Core.**
> **Porém, a Athena é terminantemente PROIBIDA (`DENY`) de alterar ou executar autonomamente sobre o Core do VARYNTH.**

Toda evolução do Core segue o fluxo:
```text
Athena identifica melhoria ──► Cria proposta/draft ──► Revisão Humana ──► Implementação
```

---

## 3. Matriz Universal de Permissões da Athena

| Ação Universal | Rascunhos (Draft) | Itens Ativos (Active) | Publicados (Published) | Core do VARYNTH | Lixeira (Trash) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`READ`** | ✅ `ALLOW` | ✅ `ALLOW` | ✅ `ALLOW` | ✅ `ALLOW` | ✅ `ALLOW` |
| **`CREATE`** | ✅ `ALLOW` (v1.0) | ⚠️ `CONFIRM` | ⚠️ `CONFIRM` | ⛔ `DENY` | ⛔ `DENY` |
| **`MODIFY`** | ✅ `ALLOW` | ⚠️ `CONFIRM` | ⚠️ `CONFIRM` | ⛔ `DENY` | ⛔ `DENY` |
| **`DELETE_SOFT`** | ⚠️ `CONFIRM` (Lixeira) | ⚠️ `CONFIRM` (Lixeira) | ⚠️ `CONFIRM` (Lixeira) | ⛔ `DENY` | ⛔ `DENY` |
| **`DELETE_HARD`** | ⛔ `DENY` | ⛔ `DENY` | ⛔ `DENY` | ⛔ `DENY` | ⛔ `DENY` |
| **`EXECUTE`** | 🧪 `SANDBOX` | 🧪 `SANDBOX` | 🧪 `SANDBOX` | ⛔ `DENY` | ⛔ `DENY` |
| **`PUBLISH`** | ⚠️ `CONFIRM` | ⚠️ `CONFIRM` | ⚠️ `CONFIRM` | ⛔ `DENY` | ⛔ `DENY` |
| **`EXPORT`** | ✅ `ALLOW` (Sanitizado)| ✅ `ALLOW` (Sanitizado)| ✅ `ALLOW` (Sanitizado)| ⛔ `DENY` | ⛔ `DENY` |

---

## 4. Perfis de Especialistas do Conselho de Agentes

Cada agente autônomo opera sob restrições especializadas de autoridade:

1. **`Justitia` (Direito & Hermenêutica)**:
   * Leitura de Teses e Vault: `ALLOW`.
   * Criação de Pareceres e Rascunhos: `ALLOW`.
   * Publicação de Teses Oficiais e Exclusão: `CONFIRM` / `DENY`.
2. **`Logos` (Ciência & Epistemologia)**:
   * Análise de Evidências e Pesquisas: `ALLOW`.
   * Execução de Scripts em Sandbox: `SANDBOX`.
   * Publicação de Conclusões: `CONFIRM`.
3. **`Strategos` (Planejamento & Projetos)**:
   * Consulta a Projetos, Tarefas e Chronos: `ALLOW`.
   * Proposta de Cronogramas em Draft: `ALLOW`.
   * Arquivamento e Mutações de Projetos: `CONFIRM`.
4. **`Mnemosyne` (Memória & Contexto)**:
   * Organização de Contexto: `ALLOW`.
   * Gravação em Memória Permanente: `CONFIRM` via `MemoryGate`.
5. **`Critias` (Auditoria & Crítica)**:
   * Leitura e Auditoria Crítica: `ALLOW`.
   * Mutação Direta no Objeto Auditado: `DENY` (somente-leitura).

---

## 5. Tokens de Confirmação Única (Anti-Replay)

Para ações que exigem validação humana (`CONFIRM`), o motor gera um **One-Time Token**:
* Expira em 15 minutos.
* Consumo único estrito (rejeita ataques de repetição).
* Apresenta sumário e consequências explícitas ao usuário antes da execução.


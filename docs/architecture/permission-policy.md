# Modelo de Permissões & Políticas de Execução

Este documento formaliza o **Permission Policy Engine** do VARYNTH OS, garantindo que operações autônomas da Athena não comprometam a integridade do sistema ou o controle soberano do usuário.

---

## 1. Políticas de Execução

* **`ALLOW`**: Ação autorizada para execução autônoma imediata (ex: criação de notas, rascunhos de artefatos, leituras contextuais).
* **`CONFIRM`**: Ação sensível que requer validação e consentimento explícito do usuário (ex: exclusão de projetos, publicação de decisões em `/docs`, modificação de artefatos ativos).
* **`DENY`**: Ação estritamente proibida pelo protocolo de segurança soberana (ex: modificação do código do Core do VARYNTH, destruição permanente de dados sem passar pela lixeira).
* **`SANDBOX`**: Execução permitida exclusivamente em ambiente isolado, sem acesso ao IO do host ou à rede externa (ex: execução de código no Forge ou prototipação no Labs).

---

## 2. Matriz de Ação x Domínio

| Operação | Domínio Alvo | Ator | Política | Rationale de Segurança |
| :--- | :--- | :--- | :---: | :--- |
| `MODIFY` | `CORE_SYSTEM` | ATHENA | **DENY** | Proíbe mutações não autorizadas no código do sistema |
| `EXECUTE` | `CORE_SYSTEM` | ATHENA | **DENY** | Proíbe execução direta no processo do host |
| `EXECUTE` | `SANDBOX_LABS` | ATHENA | **SANDBOX** | Permite execução segura de protótipos |
| `CREATE` | `ARTIFACT_DRAFT`| ATHENA | **ALLOW** | Criação de novos rascunhos com snapshot v1.0 |
| `MODIFY` | `ARTIFACT_ACTIVE`| ATHENA | **CONFIRM** | Evita sobrescrita de artefatos em produção |
| `DELETE` | `WORKSPACE_PROJECT`| ATHENA | **CONFIRM** | Aplica o Alex Principle (Lixeira 10d + Undo) |
| `DELETE` | `TRASH_BIN` | ATHENA | **DENY** | Proíbe IA de esvaziar a lixeira |
| `PUBLISH` | `TECHNICAL_DOCS`| ATHENA | **CONFIRM** | Requer aprovação humana no Review Center |
| `EXPORT` | `DATA_EXPORT` | ATHENA | **ALLOW** | Geração de pacotes de backup sanitizados |


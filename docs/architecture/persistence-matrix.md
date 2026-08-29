# Matriz de Persistência Soberana (Local-First)

Este documento registra a localização exata, a fonte da verdade e o comportamento de resiliência de todas as entidades do **VARYNTH OS**.

---

## 1. Princípio Local-First

O VARYNTH OS armazena todos os dados do usuário no cliente local (`localStorage` / memória do dispositivo), garantindo que a plataforma opere com 100% de autonomia e zero dependência de servidores de terceiros ou nuvens comerciais.

---

## 2. Matriz Completa de Entidades

| Entidade | Chave de Armazenamento | Fonte da Verdade | Sobrevive a Reload? | Sobrevive a Restart? | Backup Exportável? |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Projetos (`Project`)** | `varynth_os_projects` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Artefatos (`Artifact`)** | `varynth_artifacts_v4` | `ArtifactStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Tarefas (`Task`)** | `varynth_os_tasks` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Notas (`Note`)** | `varynth_os_notes` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Vault (`VaultItem`)** | `varynth_os_vault` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Chronos (`ChronosEvent`)** | `varynth_os_chronos` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Colaboradores (`Person`)** | `varynth_os_people` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Laboratório (`LabItem`)** | `varynth_os_labs` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Teses (`ArgumentThesis`)**| `varynth_os_theses` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Evidências (`EvidenceItem`)**| `varynth_os_evidences` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Editais (`Opportunity`)** | `varynth_os_opportunities` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Forge (`ForgeFile`)** | `varynth_os_forge` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Lixeira Segura (`TrashItem`)**| `varynth_os_trash` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Trilha de Auditoria (`Activity`)**| `varynth_os_activities` | `useVarynthStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Jobs em Background (`Job`)**| `varynth_jobs_v4` | `JobManager` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Fila de Revisão Documental** | `varynth_docs_review_queue_v4` | `ReviewStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Auditoria Documental** | `varynth_docs_audit_log_v4` | `ReviewStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Notificações (`Notification`)**| `varynth_notifications_v4` | `NotificationStore` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Memória da Athena** | `varynth_athena_episodic_memory` | `MemoryManager` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Histórico de Chat** | `varynth_athena_messages` | `AthenaHub / Sidecar` | ✅ SIM | ✅ SIM | ✅ SIM |


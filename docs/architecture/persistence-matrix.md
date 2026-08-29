# Matriz de Persistência Soberana (Local-First) & Capability-Aware Fallback

Este documento registra a localização exata, a fonte da verdade e o comportamento de resiliência de todas as entidades do **VARYNTH OS**.

---

## 1. Princípio Fundamental: Local-First ≠ LocalStorage-First

O VARYNTH OS armazena os dados do usuário com 100% de soberania local, utilizando a tecnologia física adequada para cada classe de dados:

1. **Lightweight State (LocalStorage)**: Preferências e flags de UI (< 25 KB).
2. **Structured Application Data (IndexedDB)**: Projetos, tarefas, notas, vault, lixeira, trilhas e artefatos.
3. **Cognitive Data (IndexedDB / Memory)**: Diálogos e episódios da Athena.
4. **Large Assets & Binários (OPFS / IndexedDB Blobs)**: Arquivos de vídeo, áudio, imagens e builds (`File != Artifact`).
5. **Technical Documentation (Filesystem / Git)**: Documentação oficial imutável em `/docs`.

---

## 2. Capability-Aware Fallback & Protected Mode

O fallback nunca realiza despejo cego (*blind dump*) de dados estruturados em `localStorage`:

* **`STORAGE_HEALTHY`**: IndexedDB e LocalStorage operacionais.
* **`STORAGE_DEGRADED`**: Apenas preferências leves usam LocalStorage.
* **`STORAGE_PROTECTED`**: Quando o IndexedDB fica indisponível para dados estruturados, escritas críticas são bloqueadas (`FAIL_CLOSED`) com erro explícito e notificação, garantindo que o sistema **nunca reporte falso sucesso**.
* **`STORAGE_UNAVAILABLE`**: Nenhum armazenamento local disponível.

---

## 3. Máquina de Estados de Migração Durável (Alex Principle)

```text
NOT_STARTED ──► BACKUP_READY ──► MIGRATING ──► VERIFYING ──► COMMITTED
                     │                                            │
                     └────────────────► ROLLED_BACK ◄─────────────┘
```

* **Snapshot Durável**: Antes de migrar qualquer dado, um backup persistente é gerado.
* **Quarentena Não-Destrutiva**: Os dados legados permanecem intactos e autoritativos até o estágio final de `COMMITTED`.
* **Recuperação de Interrupção**: Se o processo morrer durante `MIGRATING` ou `VERIFYING`, a próxima inicialização detecta a interrupção e reverte com segurança (`ROLLED_BACK`).

---

## 4. Matriz Completa de Entidades

| Entidade | Armazenamento Primário | Fallback Permitido | Sobrevive a Reload? | Sobrevive a Restart? | Backup Exportável? |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Projetos (`Project`)** | IndexedDB (`projects`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Artefatos (`Artifact`)** | IndexedDB (`artifacts`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Asset Blobs (`Blob`)** | OPFS / IndexedDB Blobs | `FAIL_CLOSED` (Nunca LocalStorage) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Tarefas (`Task`)** | IndexedDB (`tasks`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Notas (`Note`)** | IndexedDB (`notes`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Vault (`VaultItem`)** | IndexedDB (`vault`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Chronos (`ChronosEvent`)** | IndexedDB (`chronos`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Colaboradores (`Person`)** | IndexedDB (`people`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Laboratório (`LabItem`)** | IndexedDB (`labs`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Teses (`ArgumentThesis`)**| IndexedDB (`theses`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Evidências (`EvidenceItem`)**| IndexedDB (`evidences`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Editais (`Opportunity`)** | IndexedDB (`opportunities`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Forge (`ForgeFile`)** | IndexedDB (`forge`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Lixeira Segura (`TrashItem`)**| IndexedDB (`trash`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Trilha de Auditoria (`Activity`)**| IndexedDB (`activities`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Jobs em Background (`Job`)**| IndexedDB / RAM | Checkpoints no IndexedDB | ✅ SIM | ✅ SIM | ✅ SIM |
| **Fila de Revisão Documental** | IndexedDB (`doc_reviews`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Auditoria Documental** | IndexedDB (`doc_audit`) | `FAIL_CLOSED` (Protected Mode) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Notificações (`Notification`)**| LocalStorage / IndexedDB | `LOCAL_STORAGE` (< 25 KB) | ✅ SIM | ✅ SIM | ✅ SIM |
| **Memória da Athena** | IndexedDB (`athena_episodes`) | `MEMORY_ONLY` | ✅ SIM | ✅ SIM | ✅ SIM |
| **Histórico de Chat** | IndexedDB (`athena_messages`) | `MEMORY_ONLY` | ✅ SIM | ✅ SIM | ✅ SIM |

# Universal Backup & Recuperação Soberana

O **Backup & Recovery Engine** assegura a portabilidade e a preservação total de todos os dados do VARYNTH OS sem dependência de plataformas proprietárias.

---

## 1. Estrutura do Pacote (.varynth-backup)

O arquivo `.varynth-backup` (formato JSON sanitizado) contém:

```json
{
  "manifest": {
    "varynthVersion": "4.0.0",
    "schemaVersion": 1,
    "exportedAt": "2026-08-29T18:00:00Z",
    "exportSource": "Paulo Alberto - VARYNTH OS Sovereign",
    "entitiesCount": { ... }
  },
  "data": {
    "projects": [ ... ],
    "artifacts": [ ... ],
    "tasks": [ ... ],
    "notes": [ ... ],
    "vault": [ ... ],
    "chronos": [ ... ],
    "people": [ ... ],
    "theses": [ ... ],
    "researches": [ ... ],
    "evidences": [ ... ],
    "opportunities": [ ... ],
    "forgeFiles": [ ... ],
    "trash": [ ... ],
    "activities": [ ... ]
  }
}
```

---

## 2. Fluxo de Restauração Segura

1. **Validação de Esquema**: Verifica a presença do manifesto, a versão do esquema e as coleções obrigatórias.
2. **Previsualização de Entidades**: Apresenta a contagem de itens ao usuário antes de aplicar modificações.
3. **Estratégias de Aplicação**:
   * **`MERGE` (Mesclar)**: Adiciona novos registros e atualiza itens existentes mantendo o restante.
   * **`REPLACE` (Substituir)**: Sobrescreve as coleções com o estado exato do backup.
4. **Disparo de Eventos**: Notifica o sistema (`BACKUP_RESTORED`) e sincroniza todos os componentes abertos.


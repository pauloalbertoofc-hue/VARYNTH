# Dashboard Central & Cockpit Executivo — VARYNTH OS

## 1. Visão Geral
O **Dashboard** (`/dashboard`) funciona como a torre de controle integrada do VARYNTH OS, consolidando em uma única tela métricas de produtividade, marcos temporais iminentes no Chronos, distribuição de projetos ativos e acesso imediato ao copilot cognitivo.

---

## 2. Componentes e Widgets do Cockpit

```mermaid
graph TD
    DASH[Dashboard Central] --> METRICS[Cards de Métricas de Alto Nível]
    DASH --> PROJ_LIST[Workspaces em Destaque]
    DASH --> CHRONO_WIDGET[Próximos Prazos do Chronos]
    DASH --> ATHENA_QUICK[Barra de Acesso Rápido à Athena]
    DASH --> RECENT_ACT[Últimas Atividades Auditadas]
    
    METRICS --> M1[Total de Projetos Ativos]
    METRICS --> M2[Tarefas Pendentes & Urgentes]
    METRICS --> M3[Obras no Vault & Teses no Codex]
    METRICS --> M4[Status de Hardware da Athena]
```

---

## 3. Dinâmica de Atualização
- **Reatividade Local**: O dashboard lê os dados locais consolidados do ecossistema e recalcula agregações instantaneamente sem requisições HTTP redundantes.
- **Minimal Disclosure**: Mostra indicadores estratégicos e destaca apenas os 3 prazos mais próximos para evitar sobrecarga cognitiva.


# Chronos — Motor Temporal, Prazos & Linha do Tempo

## 1. Visão Geral
O **Chronos** (`/modules/chronos`) é o motor temporal do VARYNTH OS. Ele sincroniza prazos processuais fatais, datas de submissão de artigos em conferências e marcos de entrega de projetos em uma visão unificada de linha do tempo e calendário.

---

## 2. Estrutura de Dados (`ChronosEvent`)

```ts
export type ChronosEventType = "prazo_processual" | "entrega_projeto" | "submissao_artigo" | "reuniao" | "marco_critico";

export interface ChronosEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  type: ChronosEventType;
  projectId?: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  completed: boolean;
  notes?: string;
}
```

---

## 3. Integração com a Athena
- O estrategista **Strategos** monitora o Chronos para emitir alertas precoces de sobrecarga e orientar o foco diário nas prioridades mais urgentes.

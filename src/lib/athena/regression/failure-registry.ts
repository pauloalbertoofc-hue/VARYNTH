import { AthenaFailureRecord, RegressionCategory } from "./types";

export class AthenaFailureRegistry {
  private records: Map<string, AthenaFailureRecord> = new Map();

  constructor() {
    this.seedHistoricalFailures();
  }

  /**
   * Registers a newly observed conversational bug.
   */
  registerFailure(
    category: RegressionCategory,
    input: string,
    detectedBehavior: string,
    expectedBehavior?: string,
    context?: unknown
  ): AthenaFailureRecord {
    const id = `FAIL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record: AthenaFailureRecord = {
      id,
      category,
      input,
      context,
      detectedBehavior,
      expectedBehavior,
      fixed: false,
      createdAt: new Date().toISOString(),
    };

    this.records.set(id, record);
    return record;
  }

  /**
   * Marks a recorded failure as fixed by linking it to a regression test.
   */
  markFixed(id: string, regressionTestId: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    record.fixed = true;
    record.regressionTestId = regressionTestId;
    record.fixedAt = new Date().toISOString();
    return true;
  }

  getAllRecords(): AthenaFailureRecord[] {
    return Array.from(this.records.values());
  }

  getUnfixedRecords(): AthenaFailureRecord[] {
    return Array.from(this.records.values()).filter((r) => !r.fixed);
  }

  getRecordsByCategory(category: RegressionCategory): AthenaFailureRecord[] {
    return Array.from(this.records.values()).filter((r) => r.category === category);
  }

  /**
   * Seeds historical failures observed during real usage of Athena in VARYNTH OS.
   */
  private seedHistoricalFailures(): void {
    const seedCases: Array<Omit<AthenaFailureRecord, "id"> & { id: string }> = [
      {
        id: "ATH-FAIL-001",
        category: "SOCIAL_MISREAD",
        input: "Como você está? / Que novidade você tem?",
        detectedBehavior: "Despejou briefing completo de projetos, tarefas, prazos e obras do Vault.",
        expectedBehavior: "Resposta conversacional empática sem consultar dados privados ou despejar tarefas.",
        fixed: true,
        regressionTestId: "ATH-CONV-001",
        createdAt: "2026-08-29T14:30:00Z",
        fixedAt: "2026-08-29T15:00:00Z",
      },
      {
        id: "ATH-FAIL-002",
        category: "GENERIC_FALLBACK",
        input: "me dê ideias para hoje? que projeto que é interessante começar?",
        detectedBehavior: 'Afirmou "Entendi perfeitamente... Como gostaria de encaminhar essa reflexão agora?" sem dar nenhuma ideia.',
        expectedBehavior: "Proposição direta de 3 projetos estratégicos no Labs/Codex/Vault via Musa e Strategos.",
        fixed: true,
        regressionTestId: "ATH-CONV-002",
        createdAt: "2026-08-29T15:10:00Z",
        fixedAt: "2026-08-29T15:20:00Z",
      },
      {
        id: "ATH-FAIL-003",
        category: "DESTRUCTIVE_ACTION_AMBIGUITY",
        input: "Apague isso / Exclua",
        detectedBehavior: "Exclusão permanente de dados sem perguntar confirmação de alvo ambíguo ou retenção em lixeira.",
        expectedBehavior: "Mover para Lixeira de 10 dias com Undo e solicitar confirmação se o alvo for ambíguo (Alex Principle).",
        fixed: true,
        regressionTestId: "ATH-CONV-003",
        createdAt: "2026-08-29T03:00:00Z",
        fixedAt: "2026-08-29T03:30:00Z",
      },
      {
        id: "ATH-FAIL-004",
        category: "PRONOUN_RESOLUTION",
        input: "Estou entre o VARYNTH e a pesquisa CNJ -> E o segundo?",
        detectedBehavior: 'Não resolveu "o segundo", pedindo repetição do projeto.',
        expectedBehavior: 'Resolver contextualmente que "o segundo" refere-se à Pesquisa CNJ.',
        fixed: true,
        regressionTestId: "ATH-CONV-004",
        createdAt: "2026-08-29T15:18:00Z",
        fixedAt: "2026-08-29T15:23:00Z",
      },
      {
        id: "ATH-FAIL-005",
        category: "FOLLOW_UP_FAILURE",
        input: "Qual você recomenda? -> A -> Por quê?",
        detectedBehavior: 'Não conectou o "Por quê?" com a recomendação dada no turno anterior.',
        expectedBehavior: "Explicar os fundamentos estratégicos e técnicos da recomendação dada no turno anterior.",
        fixed: true,
        regressionTestId: "ATH-CONV-005",
        createdAt: "2026-08-29T15:18:00Z",
        fixedAt: "2026-08-29T15:23:00Z",
      },
    ];

    for (const item of seedCases) {
      this.records.set(item.id, item);
    }
  }
}

export const athenaFailureRegistry = new AthenaFailureRegistry();


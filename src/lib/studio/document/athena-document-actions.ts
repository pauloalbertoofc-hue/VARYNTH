import { DocumentClassification } from "./types";

export class AthenaDocumentActions {
  public suggestOutline(topic: string, type: DocumentClassification = "ARTICLE"): string[] {
    if (type === "LEGAL_DOCUMENT") {
      return [
        `I. Relatório e Fatos sobre ${topic}`,
        `II. Delimitação da Questão Controvertida`,
        `III. Fundamentação Hermenêutica e Jurisprudência Aplicável`,
        `IV. Síntese dos Argumentos e Dispositivo Final`,
      ];
    }

    if (type === "SCRIPT") {
      return [
        `Cena 1 — Gancho Inicial (Hook): Por que ${topic} importa?`,
        `Cena 2 — O Cenário Atual e os Pontos Críticos`,
        `Cena 3 — Demonstração Prática e Solução Conceitual`,
        `Cena 4 — Conclusão e Diretrizes Operacionais`,
      ];
    }

    if (type === "RESEARCH" || type === "ARTICLE") {
      return [
        `1. Introdução e Formulação do Problema: ${topic}`,
        `2. Fundamentação Teórica e Literatura Correlata`,
        `3. Metodologia de Análise Epistêmica`,
        `4. Discussão dos Resultados e Validação`,
        `5. Considerações Finais e Próximos Passos`,
      ];
    }

    return [
      `1. Visão Geral: ${topic}`,
      `2. Desenvolvimento Principal`,
      `3. Pontos de Atenção e Detalhes Técnicos`,
      `4. Conclusão`,
    ];
  }

  public rewriteSelection(selectedText: string, instruction = "Melhorar clareza e precisão"): string {
    const trimmed = selectedText.trim();
    if (!trimmed) return "";
    return `${trimmed} (Reescrita por Athena com maior rigor conceitual e precisão terminológica baseada na instrução: "${instruction}")`;
  }

  public expandSection(sectionText: string): string {
    return `${sectionText.trim()}\n\nAdicionalmente, cumpre ressaltar que a consistência deste modelo decorre da segregação clara de responsabilidades entre as camadas do sistema, mitigando acoplamentos e assegurando rastreabilidade integral de proveniência epistêmica.`;
  }

  public summarizeSection(sectionText: string): string {
    const words = sectionText.split(/\s+/).slice(0, 20).join(" ");
    return `Síntese executiva: ${words}... [O trecho consolida os princípios fundamentais e delimita o escopo de aplicação prática].`;
  }

  public critiqueDocument(content: string): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
    const hasHeadings = /#{1,3}\s+/.test(content);
    const wordCount = content.split(/\s+/).length;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (hasHeadings) {
      strengths.push("Estrutura hierárquica clara com uso de títulos semânticos.");
    } else {
      weaknesses.push("Ausência de subtítulos hierárquicos para guiar a leitura.");
      recommendations.push("Divida o texto em seções numeradas (Introdução, Desenvolvimento, Conclusão).");
    }

    if (wordCount > 150) {
      strengths.push("Desenvolvimento textual aprofundado.");
    } else {
      weaknesses.push("Conteúdo conciso demais para uma análise exaustiva.");
      recommendations.push("Expanda a fundamentação teórica com exemplos e referências adicionais.");
    }

    return { strengths, weaknesses, recommendations };
  }

  public createTitleOptions(topic: string, type: DocumentClassification = "ARTICLE"): string[] {
    return [
      `${topic}: Uma Análise Crítica e Fundamentação Epistêmica`,
      `Tratado sobre ${topic}: Governança, Princípios e Aplicações`,
      `A Arquitetura de ${topic} no VARYNTH OS: Da Teoria à Prática`,
    ];
  }
}

export const athenaDocumentActions = new AthenaDocumentActions();


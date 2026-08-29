import {
  ExportScope,
  ExportFormat,
  ExportProfile,
  PublicationDocument,
  PublicationChapter,
  PublicationMetadata,
} from "./types";
import { TECHNICAL_DOCS, ADR_LIST, LESSONS_LEARNED_LIST, TechnicalDocItem } from "../docs-data";
import { documentationGuardian } from "../../athena/guardian/documentation-guardian";

export class DocumentationBuilder {
  /**
   * Constrói o modelo de publicação estruturado a partir da fonte da verdade (/docs e docs-data).
   */
  buildPublication(
    scope: ExportScope,
    profile: ExportProfile = "PUBLIC_SAFE",
    specificComponentId?: string
  ): PublicationDocument {
    const health = documentationGuardian.assessHealth();
    const timestamp = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    let title = "VARYNTH OS — Manual Técnico & Arquitetural";
    let subtitle = "Especificação Oficial de Engenharia, Soberania Local-First e Copilot Cognitivo Athena";
    let chapters: PublicationChapter[] = [];

    switch (scope) {
      case "COMPLETE_HANDBOOK": {
        title = "VARYNTH OS — Technical Handbook & Arquitetura Oficial";
        subtitle = "Compêndio Completo de Engenharia: Filosofia, Kernel Cognitivo, Módulos e Decisões";
        chapters = this.buildHandbookChapters(profile);
        break;
      }

      case "ATHENA_MANUAL": {
        title = "Athena Cognitive OS — Manual Técnico de Engenharia";
        subtitle = "Arquitetura Cognitiva em 3 Vias, Kernel V4, Conselho de Especialistas e Safety";
        chapters = this.buildAthenaChapters(profile);
        break;
      }

      case "ARCHITECTURE_SPEC": {
        title = "VARYNTH OS — Especificação Macro-Arquitetural";
        subtitle = "Soberania Local-First, Topologia de Subsistemas, Fluxo de Dados e Segurança";
        chapters = this.buildArchitectureChapters(profile);
        break;
      }

      case "MODULES_MANUAL": {
        title = "VARYNTH OS — Manual dos Módulos Especializados";
        subtitle = "Vault, Codex Argument Arena, Research Evidence Board, Chronos, Labs e Lixeira";
        chapters = this.buildModulesChapters(profile);
        break;
      }

      case "ADRS_COMPENDIUM": {
        title = "VARYNTH OS — Architecture Decision Records (ADRs)";
        subtitle = "Registro Oficial de Decisões de Engenharia, Rationale e Trade-offs";
        chapters = this.buildADRChapters(profile);
        break;
      }

      case "HISTORY_AND_LESSONS": {
        title = "VARYNTH OS — Memória de Engenharia & Lições Aprendidas";
        subtitle = "Evolução Histórica da Plataforma, Falhas Reais e Princípios Arquiteturais Derivados";
        chapters = this.buildHistoryChapters(profile);
        break;
      }

      case "CURRENT_COMPONENT": {
        const doc = TECHNICAL_DOCS.find((d) => d.id === specificComponentId) || TECHNICAL_DOCS[0];
        title = `${doc.title} — Especificação Técnica`;
        subtitle = `Ficha Técnica Oficial do Componente (${doc.categoryLabel})`;
        chapters = [this.convertDocToChapter("1", doc, profile)];
        break;
      }
    }

    const tableOfContents = chapters.map((chap, idx) => ({
      number: chap.number || String(idx + 1),
      title: chap.title,
      anchor: `chapter-${chap.id}`,
    }));

    const metadata: PublicationMetadata = {
      title,
      subtitle,
      version: "4.0.0 (Cognitive Sovereignty Edition)",
      generatedAt: timestamp,
      source: "VARYNTH Technical Archive — Single Source of Truth",
      profile,
      healthScore: health.score,
      healthStatus: health.status,
      includedComponentsCount: chapters.length,
      totalPagesEstimated: Math.max(1, Math.ceil(chapters.length * 2.5)),
      authors: ["Paulo Alberto", "VARYNTH Cognitive Engineering Team"],
    };

    return {
      id: `PUB-${Date.now()}`,
      metadata,
      tableOfContents,
      chapters,
    };
  }

  /**
   * Converte o documento para formato Markdown portátil (.md).
   */
  exportToMarkdown(pub: PublicationDocument): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${pub.metadata.title}`);
    lines.push(`> **${pub.metadata.subtitle}**`);
    lines.push("");
    lines.push(`- **Versão:** ${pub.metadata.version}`);
    lines.push(`- **Data de Geração:** ${pub.metadata.generatedAt}`);
    lines.push(`- **Perfil:** ${pub.metadata.profile === "PUBLIC_SAFE" ? "Público Seguro (Public-Safe)" : "Interno Completo"}`);
    lines.push(`- **Saúde Documental:** ${pub.metadata.healthScore}% (${pub.metadata.healthStatus})`);
    lines.push(`- **Fonte:** ${pub.metadata.source}`);
    lines.push("");
    lines.push("---");
    lines.push("");

    // Table of Contents
    lines.push("## 📑 Sumário Executivo");
    lines.push("");
    pub.tableOfContents.forEach((item) => {
      lines.push(`- [${item.number}. ${item.title}](#${item.anchor})`);
    });
    lines.push("");
    lines.push("---");
    lines.push("");

    // Chapters
    pub.chapters.forEach((chap) => {
      lines.push(`<a id="${chap.id}"></a>`);
      lines.push(`## ${chap.number}. ${chap.title}`);
      if (chap.status) {
        lines.push(`> **Status do Componente:** \`${chap.status}\``);
      }
      lines.push("");
      lines.push(chap.summary);
      lines.push("");
      lines.push(chap.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    });

    lines.push("*Documento gerado automaticamente pelo VARYNTH Documentation Guardian.*");
    return lines.join("\n");
  }

  /**
   * Converte o documento para HTML autossuficiente com CSS moderno e regras de impressão para PDF.
   */
  exportToHtml(pub: PublicationDocument): string {
    const tocHtml = pub.tableOfContents
      .map(
        (item) => `
        <li class="toc-item">
          <a href="#${item.anchor}">
            <span class="toc-number">${item.number}.</span>
            <span class="toc-title">${item.title}</span>
          </a>
        </li>`
      )
      .join("");

    const chaptersHtml = pub.chapters
      .map(
        (chap) => `
      <section class="chapter-section" id="chapter-${chap.id}">
        <div class="chapter-header">
          <span class="chapter-num">Capítulo ${chap.number}</span>
          <h2 class="chapter-title">${chap.title}</h2>
          ${
            chap.status
              ? `<span class="badge badge-implemented">${chap.status}</span>`
              : ""
          }
        </div>
        <p class="chapter-summary">${chap.summary}</p>
        <div class="chapter-body">
          ${this.formatContentToHtml(chap.content)}
        </div>
      </section>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pub.metadata.title}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #06b6d4;
      --accent-light: #22d3ee;
      --border: #1e293b;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --mono: "JetBrains Mono", Consolas, Menlo, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.6;
      padding: 40px 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 60px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    /* COVER PAGE */
    .cover {
      text-align: center;
      padding: 40px 0 60px;
      border-bottom: 2px solid var(--border);
      margin-bottom: 50px;
    }

    .cover-badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: var(--accent-light);
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .cover-title {
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 16px;
      color: var(--text-muted);
      max-width: 700px;
      margin: 0 auto 30px;
    }

    .cover-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 16px;
      font-size: 12px;
      font-family: var(--mono);
      color: var(--text-muted);
    }

    .cover-meta span {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 8px;
    }

    /* TABLE OF CONTENTS */
    .toc {
      background: rgba(2, 6, 23, 0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 60px;
    }

    .toc h3 {
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 20px;
      font-family: var(--mono);
    }

    .toc ul { list-style: none; }
    .toc-item { margin-bottom: 10px; }
    .toc-item a {
      color: var(--text);
      text-decoration: none;
      font-size: 14px;
      display: flex;
      gap: 12px;
      transition: color 0.2s;
    }
    .toc-item a:hover { color: var(--accent-light); }
    .toc-number { color: var(--accent); font-family: var(--mono); font-weight: bold; }

    /* CHAPTERS */
    .chapter-section {
      padding-top: 40px;
      margin-bottom: 60px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 40px;
    }

    .chapter-header {
      margin-bottom: 16px;
    }

    .chapter-num {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: bold;
    }

    .chapter-title {
      font-size: 22px;
      color: #ffffff;
      margin-top: 4px;
    }

    .chapter-summary {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
      font-style: italic;
    }

    .chapter-body {
      font-size: 14px;
      line-height: 1.7;
    }

    .chapter-body p { margin-bottom: 16px; }
    .chapter-body ul { margin-bottom: 16px; padding-left: 20px; }
    .chapter-body li { margin-bottom: 6px; }
    .chapter-body h3 { font-size: 16px; color: #fff; margin: 24px 0 12px; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-family: var(--mono);
      font-weight: bold;
    }
    .badge-implemented {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    /* CODE & DIAGRAMS */
    pre, code {
      font-family: var(--mono);
      font-size: 12px;
    }

    code {
      background: rgba(2, 6, 23, 0.8);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--accent-light);
    }

    pre {
      background: #020617;
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      color: #f8fafc;
    }

    /* PRINT STYLING */
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .cover {
        page-break-after: always;
        height: 90vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .cover-title { color: #000000; font-size: 28pt; }
      .cover-subtitle { color: #475569; font-size: 14pt; }
      .chapter-section {
        page-break-inside: avoid;
      }
      .chapter-title { color: #000000; }
      .toc { page-break-after: always; }
      pre { background: #f1f5f9; color: #000; border-color: #cbd5e1; }
      code { background: #f1f5f9; color: #000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- COVER -->
    <div class="cover">
      <div class="cover-badge">Documentação Oficial de Engenharia</div>
      <h1 class="cover-title">${pub.metadata.title}</h1>
      <p class="cover-subtitle">${pub.metadata.subtitle}</p>
      <div class="cover-meta">
        <span>Versão: ${pub.metadata.version}</span>
        <span>Data: ${pub.metadata.generatedAt}</span>
        <span>Saúde: ${pub.metadata.healthScore}% (${pub.metadata.healthStatus})</span>
        <span>Perfil: ${pub.metadata.profile}</span>
      </div>
    </div>

    <!-- TOC -->
    <div class="toc">
      <h3>Sumário da Publicação</h3>
      <ul>
        ${tocHtml}
      </ul>
    </div>

    <!-- CHAPTERS -->
    <div class="chapters-container">
      ${chaptersHtml}
    </div>
  </div>
</body>
</html>`;
  }

  // --- PRIVATE BUILDERS ---

  private buildHandbookChapters(profile: ExportProfile): PublicationChapter[] {
    const docs = TECHNICAL_DOCS;
    return docs.map((doc, idx) => this.convertDocToChapter(String(idx + 1), doc, profile));
  }

  private buildAthenaChapters(profile: ExportProfile): PublicationChapter[] {
    const athenaDocs = TECHNICAL_DOCS.filter((d) => d.category === "athena");
    return athenaDocs.map((doc, idx) => this.convertDocToChapter(String(idx + 1), doc, profile));
  }

  private buildArchitectureChapters(profile: ExportProfile): PublicationChapter[] {
    const archDocs = TECHNICAL_DOCS.filter((d) => d.category === "architecture");
    return archDocs.map((doc, idx) => this.convertDocToChapter(String(idx + 1), doc, profile));
  }

  private buildModulesChapters(profile: ExportProfile): PublicationChapter[] {
    const modDocs = TECHNICAL_DOCS.filter((d) => d.category === "modules");
    return modDocs.map((doc, idx) => this.convertDocToChapter(String(idx + 1), doc, profile));
  }

  private buildADRChapters(profile: ExportProfile): PublicationChapter[] {
    return ADR_LIST.map((adr, idx) => {
      const content = `### 1. Contexto & Problema\n${adr.context}\n\n### 2. Decisão Arquitetural\n${adr.decision}\n\n### 3. Rationale (Por quê?)\n${adr.rationale}\n\n### 4. Alternativas Avaliadas\n${adr.alternatives.map((a) => `- ${a}`).join("\n")}\n\n### 5. Ganhos e Tradeoffs\n**Ganhos:**\n${adr.consequences.gains.map((g) => `- ${g}`).join("\n")}\n\n**Tradeoffs:**\n${adr.consequences.tradeoffs.map((t) => `- ${t}`).join("\n")}`;

      return {
        id: `adr-${adr.id.toLowerCase()}`,
        number: String(idx + 1),
        title: `${adr.number}: ${adr.title}`,
        category: "ADR",
        status: adr.status,
        summary: `Decisão de engenharia registrada em ${adr.date} com status ${adr.status}.`,
        content: this.sanitizeContent(content, profile),
      };
    });
  }

  private buildHistoryChapters(profile: ExportProfile): PublicationChapter[] {
    return LESSONS_LEARNED_LIST.map((lesson, idx) => {
      const content = `### Problema Observado\n${lesson.problem}\n\n### Observação Empírica\n${lesson.observation}\n\n### Decisão Arquitetural\n${lesson.decision}\n\n### Resultado Técnico\n${lesson.result}${lesson.linkedRegressionTest ? `\n\n**Teste de Regressão Vinculado:** \`${lesson.linkedRegressionTest}\`` : ""}`;

      return {
        id: `lesson-${lesson.id.toLowerCase()}`,
        number: String(idx + 1),
        title: `Lição #${lesson.number}: ${lesson.title}`,
        category: "History",
        summary: `Princípio derivado de falhas reais e refatorações no VARYNTH OS.`,
        content: this.sanitizeContent(content, profile),
      };
    });
  }

  private convertDocToChapter(number: string, doc: TechnicalDocItem, profile: ExportProfile): PublicationChapter {
    return {
      id: doc.id,
      number,
      title: doc.title,
      category: doc.categoryLabel,
      status: doc.status,
      summary: doc.summary,
      content: this.sanitizeContent(doc.content, profile),
    };
  }

  private sanitizeContent(content: string, profile: ExportProfile): string {
    if (profile === "INTERNAL") return content;

    // PUBLIC-SAFE sanitization: remove absolute local machine paths
    return content
      .replace(/C:\\[a-zA-Z0-9_\-\\.]+/g, "[VARYNTH_ROOT]")
      .replace(/\/c\/Users\/[a-zA-Z0-9_\-\\.]+/g, "[VARYNTH_ROOT]");
  }

  private formatContentToHtml(content: string): string {
    return content
      .replace(/### (.*?)\n/g, "<h3>$1</h3>\n")
      .replace(/## (.*?)\n/g, "<h3>$1</h3>\n")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/• (.*?)\n/g, "<li>$1</li>");
  }
}

export const documentationBuilder = new DocumentationBuilder();

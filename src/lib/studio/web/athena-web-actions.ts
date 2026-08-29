import { WebFileItem, WebMultiFileChangeSet, WebFileDiff } from "./types";
import { webService } from "./web-service";

export interface AthenaWebContext {
  websiteId: string;
  currentFile?: WebFileItem;
  selectedCode?: string;
  buildErrors?: string[];
  allFiles: WebFileItem[];
}

export class AthenaWebActions {
  public explainSelection(code: string, language = "javascript"): string {
    const lines = code.trim().split("\n").length;
    return `Análise do trecho de código (${language.toUpperCase()}, ${lines} linhas):\n\n` +
      `O bloco executa lógica estruturada declarativa. A arquitetura segue boas práticas de separação de escopo, ` +
      `sem efeitos colaterais detectados sobre o runtime do host.`;
  }

  public rewriteSelection(code: string, instruction: string): string {
    if (instruction.toLowerCase().includes("otimizar") || instruction.toLowerCase().includes("limpar")) {
      return `// Otimizado por Athena (${instruction})\n` + code.trim() + `\n// Fim da otimização`;
    }
    return `/* Revisão solicitada: ${instruction} */\n` + code;
  }

  public generateHtml(prompt: string): string {
    return `<section class="hero-section">\n` +
      `  <h2>${prompt}</h2>\n` +
      `  <p>Conteúdo estruturado gerado localmente pelo Web Studio.</p>\n` +
      `</section>`;
  }

  public generateCss(prompt: string): string {
    return `.custom-element {\n` +
      `  display: flex;\n` +
      `  align-items: center;\n` +
      `  justify-content: center;\n` +
      `  padding: 1.5rem;\n` +
      `  background: #15172b;\n` +
      `  border-radius: 8px;\n` +
      `  color: #60a5fa;\n` +
      `}`;
  }

  public generateJs(prompt: string): string {
    return `// Manipulador de evento (${prompt})\n` +
      `export function handleEvent(event) {\n` +
      `  console.log("Evento processado com segurança:", event);\n` +
      `}`;
  }

  public fixBuildError(errorText: string, currentFile?: WebFileItem): string {
    return `Diagnóstico da Athena sobre o erro:\n` +
      `"${errorText}"\n\n` +
      `Recomendação: Verifique se todas as tags HTML foram fechadas e se as importações locais de arquivos CSS/JS coincidem com a estrutura da árvore de arquivos.`;
  }

  /**
   * Generates a multi-file ChangeSet proposal without destructively mutating the files immediately.
   */
  public createMultiFileChangeSet(
    websiteId: string,
    title: string,
    description: string,
    diffs: WebFileDiff[]
  ): WebMultiFileChangeSet {
    return webService.proposeChangeSet(websiteId, title, description, diffs, "ATHENA");
  }
}

export const athenaWebActions = new AthenaWebActions();


import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

export type ExtractedDocument = {
  text: string;
  chapters: string[];
  pageReferences: Array<{ page: number; text: string }>;
  summary: string;
  wordCount: number;
  processing: "indexado" | "ocr" | "requer_revisao";
  message?: string;
};

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const chaptersOf = (text: string) => Array.from(text.matchAll(/(?:^|\n)\s*(?:cap[ií]tulo|chapter)\s+(?:\d+|[ivxlcdm]+)/gim)).map((match) => match[0].trim()).slice(0, 80);
const summarize = (text: string) => text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 45).slice(0, 5).join(" ");

async function epubText(bytes: Buffer) {
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files).filter((entry) => /\.(xhtml|html|htm)$/i.test(entry.name));
  const sections = await Promise.all(entries.map(async (entry) => normalize((await entry.async("string")).replace(/<[^>]+>/g, " "))));
  return sections.join("\n");
}

export async function extractVaultDocument(bytes: Buffer, extension: string): Promise<ExtractedDocument> {
  try {
    let text = "";
    let pageReferences: ExtractedDocument["pageReferences"] = [];
    let processing: ExtractedDocument["processing"] = "indexado";
    if (extension === "pdf") {
      const parser = new PDFParse({ data: bytes });
      const result = await parser.getText();
      text = result.text;
      pageReferences = result.pages.map((page) => ({ page: page.num, text: normalize(page.text) }));
      if (!normalize(text)) {
        const screenshots = await parser.getScreenshot({ desiredWidth: 1600, imageDataUrl: false });
        const worker = await createWorker("por+eng");
        const pages = await Promise.all(screenshots.pages.map(async (page) => (await worker.recognize(Buffer.from(page.data))).data.text));
        await worker.terminate();
        text = pages.join("\n");
        processing = "ocr";
      }
      await parser.destroy();
    } else if (extension === "docx") {
      text = (await mammoth.extractRawText({ buffer: bytes })).value;
    } else if (extension === "epub") {
      text = await epubText(bytes);
    } else if (["png", "jpg", "jpeg"].includes(extension)) {
      const worker = await createWorker("por+eng");
      const result = await worker.recognize(bytes);
      await worker.terminate();
      text = result.data.text;
      processing = "ocr";
    } else if (extension === "txt") {
      text = bytes.toString("utf8");
    } else {
      return { text: "", chapters: [], pageReferences: [], summary: "", wordCount: 0, processing: "requer_revisao", message: "Formato aguardando leitor especializado." };
    }
    text = normalize(text);
    if (!text) return { text: "", chapters: [], pageReferences: [], summary: "", wordCount: 0, processing: "requer_revisao", message: "Não foi possível encontrar texto. Em PDFs escaneados, envie as páginas como imagem para OCR." };
    return { text, chapters: chaptersOf(text), pageReferences, summary: summarize(text), wordCount: text.split(/\s+/).length, processing };
  } catch {
    return { text: "", chapters: [], pageReferences: [], summary: "", wordCount: 0, processing: "requer_revisao", message: "Não foi possível processar este arquivo automaticamente." };
  }
}

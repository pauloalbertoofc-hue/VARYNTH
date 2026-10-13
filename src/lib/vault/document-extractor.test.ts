import JSZip from "jszip";
import { extractVaultDocument } from "./document-extractor";

async function run() {
  const zip = new JSZip();
  zip.file("word/document.xml", "<w:document xmlns:w=\"x\"><w:body><w:p><w:r><w:t>Capítulo 1</w:t></w:r></w:p><w:p><w:r><w:t>Texto DOCX seguro.</w:t></w:r></w:p></w:body></w:document>");
  const bytes = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  const result = await extractVaultDocument(bytes, "docx");
  if (!result.text.includes("Capítulo 1") || !result.text.includes("Texto DOCX seguro.") || result.processing !== "indexado") throw new Error(`DOCX extraction failed: ${JSON.stringify(result)}`);
  console.log("DOCX extraction passed:", result.wordCount);
}

void run();

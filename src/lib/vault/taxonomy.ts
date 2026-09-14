import type { VaultFormat, VaultItem, VaultLiteraryCategory, VaultWorkType } from "@/lib/types";

export const LITERARY_CATEGORIES: VaultLiteraryCategory[] = ["Ficção", "Não ficção", "Acadêmico/Técnico", "Referência", "Documento oficial", "Material educacional", "Produção pessoal", "Não classificado"];
export const WORK_TYPES: VaultWorkType[] = ["Livro", "Capítulo de livro", "Artigo científico", "Artigo/ensaio", "Tese", "Dissertação", "Monografia", "Legislação", "Jurisprudência", "Relatório", "Manual", "Notícia", "Página web", "Material audiovisual", "Nota", "Outro"];
export const VAULT_FORMATS: VaultFormat[] = ["PDF", "EPUB", "MOBI/AZW", "DOCX", "TXT", "Página web", "Imagem/OCR", "Áudio", "Vídeo", "Físico", "Outro"];
export const PRIMARY_SUBJECTS = ["Direito", "Criminologia", "Filosofia", "História", "Psicologia", "Estratégia e Poder", "Tecnologia", "Economia", "Política", "Sociologia", "Administração", "Ciência", "Literatura", "Educação", "Comunicação", "Saúde", "Religião e Espiritualidade", "Conhecimento geral", "Não classificado"];

const extensionFormat = (name = ""): VaultFormat => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "epub") return "EPUB";
  if (["mobi", "azw", "azw3"].includes(ext || "")) return "MOBI/AZW";
  if (["doc", "docx"].includes(ext || "")) return "DOCX";
  if (ext === "txt") return "TXT";
  if (["png", "jpg", "jpeg"].includes(ext || "")) return "Imagem/OCR";
  if (["mp3", "m4a"].includes(ext || "")) return "Áudio";
  return "Outro";
};

export function migrateVaultItem(item: VaultItem): VaultItem {
  if (item.taxonomyVersion === 2) return item;
  const originalFileName = item.source?.split(" · ").slice(1).join(" · ") || item.originalFileName;
  const legacyType: Record<string, VaultWorkType> = { livro: "Livro", artigo: "Artigo/ensaio", jurisprudencia: "Jurisprudência", lei: "Legislação", link: "Página web", video: "Material audiovisual", citacao: "Nota", codigo: "Nota", ideia: "Nota" };
  const categoryIsSubject = ["História", "Filosofia", "Ciência", "Direito", "Pesquisa"].includes(item.category);
  const format = originalFileName ? extensionFormat(originalFileName) : item.type === "link" ? "Página web" : item.type === "video" ? "Vídeo" : item.format || "Outro";
  return {
    ...item,
    literaryCategory: categoryIsSubject ? (item.category === "Pesquisa" ? "Acadêmico/Técnico" : "Não classificado") : (["Ficção", "Não ficção"].includes(item.category) ? item.category as VaultLiteraryCategory : "Não classificado"),
    workType: legacyType[item.type] || (item.type === "pdf" ? "Outro" : "Outro"),
    format,
    primarySubject: categoryIsSubject ? (item.category === "Pesquisa" ? "Conhecimento geral" : item.category) : "Não classificado",
    originalFileName,
    taxonomyVersion: 2,
    classificationSource: "migration",
  };
}

export type TaxonomySuggestion = { literaryCategory: VaultLiteraryCategory; workType: VaultWorkType; format: VaultFormat; primarySubject: string; tags: string[]; confidence: number };

export function suggestTaxonomy(input: { title: string; author: string; fileName: string; url: string }): TaxonomySuggestion {
  const text = `${input.title} ${input.author} ${input.fileName} ${input.url}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const format = input.fileName ? extensionFormat(input.fileName) : input.url ? "Página web" : "Outro";
  let literaryCategory: VaultLiteraryCategory = "Não ficção";
  let workType: VaultWorkType = format === "Página web" ? "Página web" : "Livro";
  let primarySubject = "Conhecimento geral";
  let tags: string[] = [];
  if (/tese|dissertacao|monografia/.test(text)) { literaryCategory = "Acadêmico/Técnico"; workType = /tese/.test(text) ? "Tese" : /dissertacao/.test(text) ? "Dissertação" : "Monografia"; }
  if (/artigo|journal|doi|paper/.test(text)) { literaryCategory = "Acadêmico/Técnico"; workType = "Artigo científico"; }
  if (/lei|codigo|constitui|jurisprud|acordao|tribunal/.test(text)) { literaryCategory = "Documento oficial"; workType = /jurisprud|acordao|tribunal/.test(text) ? "Jurisprudência" : "Legislação"; primarySubject = "Direito"; tags = ["Direito"]; }
  if (/poder|influenc|estrateg|maquiavel|greene|negoci/.test(text)) { primarySubject = "Estratégia e Poder"; tags = ["Poder", "Influência", "Estratégia", "Comportamento Humano", "Liderança", "Política", "Negociação"]; }
  else if (/psicolog|comportamento|mente|emoc/.test(text)) { primarySubject = "Psicologia"; tags = ["Psicologia", "Comportamento Humano"]; }
  else if (/crimin|penal|crime/.test(text)) { primarySubject = "Criminologia"; tags = ["Criminologia", "Direito Penal"]; }
  else if (/filosof|etica|epistem/.test(text)) { primarySubject = "Filosofia"; tags = ["Filosofia", "Ética"]; }
  else if (/historia|historico/.test(text)) { primarySubject = "História"; tags = ["História"]; }
  else if (/tecnolog|software|inteligencia artificial|algorit/.test(text)) { primarySubject = "Tecnologia"; tags = ["Tecnologia"]; }
  else if (/econom|financ|mercado/.test(text)) { primarySubject = "Economia"; tags = ["Economia"]; }
  return { literaryCategory, workType, format, primarySubject, tags, confidence: primarySubject === "Conhecimento geral" ? 0.58 : 0.88 };
}

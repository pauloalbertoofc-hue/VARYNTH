/**
 * VARYNTH OS — ATHENA SLOT EXTRACTOR
 * Extracts structured parameters with full provenance (source span, value, confidence)
 * and resolves intra-utterance self-corrections (e.g. "para terça, não, para quarta").
 */

import { SemanticSlotProvenance } from "./types";

export class SlotExtractor {
  static extractSlots(rawPrompt: string, cleanText: string): Record<string, SemanticSlotProvenance> {
    const slots: Record<string, SemanticSlotProvenance> = {};
    const text = cleanText.toLowerCase();

    // 1. Artifact Type Extraction
    if (text.includes("video") || text.includes("cutscene") || text.includes("teaser")) {
      slots.artifactType = {
        name: "artifactType",
        value: "VIDEO",
        sourceTextSpan: "video",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    } else if (text.includes("imagem") || text.includes("capa") || text.includes("banner") || text.includes("foto")) {
      slots.artifactType = {
        name: "artifactType",
        value: "IMAGE",
        sourceTextSpan: "imagem/capa",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    } else if (text.includes("site") || text.includes("landing page") || text.includes("web studio") || text.includes("pagina")) {
      slots.artifactType = {
        name: "artifactType",
        value: "WEBSITE",
        sourceTextSpan: "site",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    } else if (text.includes("jogo") || text.includes("game") || text.includes("investigativo")) {
      slots.artifactType = {
        name: "artifactType",
        value: "GAME",
        sourceTextSpan: "jogo",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    } else if (text.includes("pdf") || text.includes("artigo") || text.includes("documento") || text.includes("relatorio") || text.includes("fichamento")) {
      slots.artifactType = {
        name: "artifactType",
        value: "DOCUMENT",
        sourceTextSpan: "documento/artigo",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    }

    // 2. Duration Extraction (e.g. "90 segundos", "30s", "1 minuto")
    const durationMatch = text.match(/(\d+)\s*(segundos|segundo|s|minutos|minuto|min)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].startsWith("min") ? "minutes" : "seconds";
      const totalSeconds = unit === "minutes" ? num * 60 : num;
      slots.duration = {
        name: "duration",
        value: { amount: num, unit, totalSeconds },
        sourceTextSpan: durationMatch[0],
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    }

    // 3. Orientation & Dimensions Extraction (e.g. "vertical", "horizontal", "1080x1920", "9:16", "16:9")
    if (text.includes("vertical") || text.includes("9:16") || text.includes("1080x1920")) {
      slots.orientation = {
        name: "orientation",
        value: "VERTICAL",
        sourceTextSpan: text.includes("vertical") ? "vertical" : text.includes("9:16") ? "9:16" : "1080x1920",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    } else if (text.includes("horizontal") || text.includes("16:9") || text.includes("1920x1080")) {
      slots.orientation = {
        name: "orientation",
        value: "HORIZONTAL",
        sourceTextSpan: text.includes("horizontal") ? "horizontal" : text.includes("16:9") ? "16:9" : "1920x1080",
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    }

    const dimMatch = text.match(/(\d{3,4})x(\d{3,4})/i);
    if (dimMatch) {
      slots.dimensions = {
        name: "dimensions",
        value: { width: parseInt(dimMatch[1], 10), height: parseInt(dimMatch[2], 10) },
        sourceTextSpan: dimMatch[0],
        confidence: 0.98,
        extractedBy: "REGEX",
      };
    }

    // 4. Date & Deadline Resolution with Self-Correction Handling
    // e.g. "crie a tarefa para terça, não, na verdade para quarta-feira" -> latest wins!
    const daysOfWeek = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const foundDays: { day: string; index: number; span: string }[] = [];

    daysOfWeek.forEach((day) => {
      const idx = text.lastIndexOf(day);
      if (idx !== -1) {
        foundDays.push({ day, index: idx, span: day });
      }
    });

    if (foundDays.length > 0) {
      // Sort by last occurrence (latest correction wins)
      foundDays.sort((a, b) => b.index - a.index);
      const chosen = foundDays[0];
      slots.targetDay = {
        name: "targetDay",
        value: chosen.day,
        sourceTextSpan: chosen.span,
        confidence: foundDays.length > 1 ? 0.9 : 0.95,
        extractedBy: "REGEX",
      };
    }

    // Explicit date (e.g. "dia 22", "20 de novembro")
    const dateMatch = text.match(/dia\s*(\d{1,2})(\s*de\s*([a-z]+))?/i);
    if (dateMatch) {
      slots.explicitDate = {
        name: "explicitDate",
        value: { day: parseInt(dateMatch[1], 10), month: dateMatch[3] || undefined },
        sourceTextSpan: dateMatch[0],
        confidence: 0.95,
        extractedBy: "REGEX",
      };
    }

    // 5. Priority Extraction (e.g. "urgente", "alta", "media", "baixa")
    if (text.includes("urgente") || text.includes("prioridade maxima")) {
      slots.priority = { name: "priority", value: "urgente", sourceTextSpan: "urgente", confidence: 0.95, extractedBy: "REGEX" };
    } else if (text.includes("alta prioridade") || text.includes("prioridade alta")) {
      slots.priority = { name: "priority", value: "alta", sourceTextSpan: "alta", confidence: 0.9, extractedBy: "REGEX" };
    }

    return slots;
  }
}

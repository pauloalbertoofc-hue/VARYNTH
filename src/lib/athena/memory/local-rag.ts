export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export class TextChunker {
  chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
    if (!text || text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }
}

export class LocalSemanticRetriever {
  private chunker = new TextChunker();
  private index: DocumentChunk[] = [];

  indexDocument(documentId: string, text: string, metadata?: Record<string, unknown>): void {
    const rawChunks = this.chunker.chunkText(text);
    rawChunks.forEach((chunk, i) => {
      this.index.push({
        id: `${documentId}-chunk-${i}`,
        documentId,
        text: chunk,
        metadata,
      });
    });
  }

  search(query: string, topK = 3): DocumentChunk[] {
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (queryTokens.length === 0) return [];

    const scored = this.index.map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      let score = 0;
      queryTokens.forEach((token) => {
        if (textLower.includes(token)) {
          score += 1;
        }
      });
      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.chunk);
  }
}

export const localSemanticRetriever = new LocalSemanticRetriever();

export type MusicImportItemResult<T> =
  | { item: T; status: "imported" }
  | { item: T; status: "failed"; error: string };

/** Imports one-by-one and isolates failures so one bad file cannot cancel the rest of a selection. */
export async function importMusicBatch<T>(
  items: readonly T[],
  importOne: (item: T, index: number) => Promise<void>,
  onProgress?: (completed: number, total: number) => void,
): Promise<MusicImportItemResult<T>[]> {
  const results: MusicImportItemResult<T>[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    try { await importOne(item, index); results.push({ item, status: "imported" }); }
    catch (error) { results.push({ item, status: "failed", error: error instanceof Error ? error.message : "Falha desconhecida ao importar esta faixa." }); }
    onProgress?.(index + 1, items.length);
  }
  return results;
}

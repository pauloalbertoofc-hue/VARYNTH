import assert from "node:assert/strict";
import { importMusicBatch } from "./music-import";

void (async () => {
  const order: string[] = [];
  const progress: Array<[number, number]> = [];
  const result = await importMusicBatch(["first", "broken", "third"], async (item) => {
    order.push(item);
    if (item === "broken") throw new Error("Blob recusou este arquivo");
  }, (completed, total) => progress.push([completed, total]));

  assert.deepEqual(order, ["first", "broken", "third"]);
  assert.deepEqual(result.map((item) => item.status), ["imported", "failed", "imported"]);
  assert.equal(result[1].status === "failed" ? result[1].error : "", "Blob recusou este arquivo");
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
  console.log("Music batch import continues after an individual upload fails.");
})();

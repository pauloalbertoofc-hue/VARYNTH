import assert from "node:assert/strict";
import { pictorAgent } from "./pictor";

const task = {
  id: "pictor-test",
  title: "Analisar imagem",
  rawPrompt: "Analise esta imagem e a nitidez",
  type: "GENERAL_DELIBERATION",
  priority: "media",
  status: "CREATED",
  scope: "visual",
  entities: {},
  metadata: {
    visualQuality: {
      sharpness: 0.8,
      exposure: 0.6,
      warnings: ["baixo contraste"],
    },
  },
  createdAt: "",
  updatedAt: "",
} as const;
assert.equal(pictorAgent.canHandle(task), true);
void pictorAgent.execute(task, {} as never).then((result) => {
  assert.equal(result.metadata?.localFileAccess, false);
  assert.match(result.content, /não acessou a mídia original/);
  assert.deepEqual(result.recommendations, ["Revisar: baixo contraste"]);
  console.log("Pictor tests passed: advisory visual context is fail-closed.");
});
void pictorAgent
  .execute(
    {
      ...task,
      metadata: {
        visualQuality: {
          sharpness: Number.NaN,
          exposure: Number.POSITIVE_INFINITY,
          warnings: ["  baixo contraste  ", 42, ""].slice(0, 3),
        },
      },
    },
    {} as never,
  )
  .then((result) => {
    assert.match(result.content, /não informada/);
    assert.deepEqual(result.recommendations, ["Revisar: baixo contraste"]);
    console.log(
      "Pictor malformed quality test passed: metrics are finite and warnings are bounded.",
    );
  });

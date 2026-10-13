import assert from "node:assert/strict";
import { POST } from "./route";

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/api/visual/pictor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function run() {
  const empty = await POST(jsonRequest({ prompt: "  " }));
  assert.equal(empty.status, 400);
  assert.deepEqual(await empty.json(), { error: "PROMPT_REQUIRED" });

  const tooLong = await POST(jsonRequest({ prompt: "x".repeat(4001) }));
  assert.equal(tooLong.status, 413);
  assert.deepEqual(await tooLong.json(), {
    error: "PROMPT_TOO_LONG",
    maxLength: 4000,
  });

  const valid = await POST(
    jsonRequest({
      prompt: "Analise a nitidez",
      visualQuality: { sharpness: 0.8 },
    }),
  );
  assert.equal(valid.status, 200);
  const result = (await valid.json()) as {
    content?: string;
    metadata?: { localFileAccess?: boolean; toolAccess?: boolean };
  };
  assert.match(result.content ?? "", /não acessou a mídia original/);
  assert.equal(result.metadata?.localFileAccess, false);
  assert.equal(result.metadata?.toolAccess, false);
  console.log(
    "Pictor route contract tests passed: validation and advisory boundary are enforced.",
  );
}

void run();

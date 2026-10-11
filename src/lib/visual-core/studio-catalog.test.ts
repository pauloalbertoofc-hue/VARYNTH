import assert from "node:assert/strict";
import { visualCapabilities, visualWorkflows } from "./studio-catalog";

assert.deepEqual(visualWorkflows.map((item) => item.id), ["CAPTURE", "ENHANCE", "EDIT", "CREATE", "ANALYZE", "PRODUCE"]);

assert.equal(visualCapabilities.filter((item) => item.status === "PLANNED").every((item) => !item.href), true);

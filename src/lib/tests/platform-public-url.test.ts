import assert from "node:assert/strict";
import { getVarynthOrigin, VARYNTH_PUBLIC_ORIGIN, VARYNTH_PUBLIC_URL } from "../config/platform";
assert.equal(VARYNTH_PUBLIC_ORIGIN, "https://varynth-ynqv-plum.vercel.app");
assert.equal(VARYNTH_PUBLIC_URL, "https://varynth-ynqv-plum.vercel.app/dashboard");
assert.equal(getVarynthOrigin("http://localhost:3000"), "http://localhost:3000");
console.log("3/3 verificações do endereço público passaram.");

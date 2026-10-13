import assert from "node:assert/strict";
import { renderVectorSvg } from "./vector-renderer";

const svg = renderVectorSvg([
  {
    id: "shape",
    type: "rect",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: "#fff",
    color2: "#000",
    gradient: true,
  },
  {
    id: "text",
    type: "text",
    x: 0,
    y: 100,
    width: 100,
    height: 20,
    color: "#fff",
    text: "<safe>",
  },
]);
assert.match(svg, /linearGradient id="gradient-shape"/);
assert.match(svg, /url\(#gradient-shape\)/);
assert.match(svg, /&lt;safe&gt;/);
console.log("Vector renderer tests passed.");

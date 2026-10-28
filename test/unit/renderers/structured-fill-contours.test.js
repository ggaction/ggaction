import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { drawCircleGraphic } from "../../../src/renderers/canvas/circle.js";
import { drawPathGraphic } from "../../../src/renderers/canvas/path.js";

const fill = { type: "pattern", style: "cross", pitch: 6, strokeWidth: 1, phase: [0, 0],
  origin: { x: 0, y: 0 }, foreground: "#ff0000", background: "#0000ff" };
const cases = [
  { name: "circle", draw: drawCircleGraphic, properties: { x: 20, y: 20, radius: 10 }, edge: [29, 20] },
  { name: "path", draw: drawPathGraphic, properties: { commands: [
    { op: "M", x: 10, y: 10 }, { op: "L", x: 30, y: 10 }, { op: "L", x: 20, y: 30 }, { op: "Z" }
  ] }, edge: [20, 10] }
];
for (const entry of cases) test(`structured ${entry.name} fill restores the authored contour before its stroke`, () => {
  const canvas = createCanvas(40, 40), context = canvas.getContext("2d");
  context.fillStyle = "white"; context.fillRect(0, 0, 40, 40);
  entry.draw(context, entry.name, { properties: { ...entry.properties, fill, stroke: "#008000", strokeWidth: 3 } });
  const pixel = (x, y) => [...context.getImageData(x, y, 1, 1).data];
  assert.deepEqual(pixel(...entry.edge), [0, 128, 0, 255]);
  assert.deepEqual(pixel(3, 3), [255, 255, 255, 255]);
  const colors = [];
  for (let y = 17; y < 23; y++) for (let x = 17; x < 23; x++) colors.push(pixel(x, y));
  assert.ok(colors.some(([red, green, blue]) => red > blue && green === 0));
  assert.ok(colors.some(([red, green, blue]) => blue > red && green === 0));
});

test("zero-radius and no-paint circle entries leave the destination unchanged", () => {
  const canvas = createCanvas(40, 40), context = canvas.getContext("2d");
  context.fillStyle = "white"; context.fillRect(0, 0, 40, 40);
  const before = context.getImageData(0, 0, 40, 40).data;
  context.fillStyle = "red";
  drawCircleGraphic(context, "empty", { items: [
    { id: "zero", properties: { x: 5, y: 5, radius: 0, fill: "red", opacity: 0 } },
    { id: "none", properties: { x: 20, y: 20, radius: 8, fill: "none" } }
  ] });
  assert.deepEqual(context.getImageData(0, 0, 40, 40).data, before);
});

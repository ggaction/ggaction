import assert from "node:assert/strict";
import test from "node:test";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createGraph } from "../../../examples/graph-plots/program.js";
import { createGraphPrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";

for (const variant of variants) test(`graph ${variant.id} exports the primitive vector PDF`, async () => {
  const actual = await renderToPDFBuffer(createGraph(variant.id));
  const expected = await renderToPDFBuffer(createGraphPrimitive(variant.id));
  assert.deepEqual([actual.width, actual.height, actual.pages], [300, 240, 1]);
  assert.deepEqual(actual.buffer, expected.buffer);
  assert.match(Buffer.from(actual.buffer).toString("latin1"), /^%PDF-/);
});

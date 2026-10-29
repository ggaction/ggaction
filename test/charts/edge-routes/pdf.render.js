import assert from "node:assert/strict";
import test from "node:test";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createEdgeRoutes } from "../../../examples/edge-routes/program.js";
import { createEdgeRoutePrimitive } from "./primitive.program.js";

test("edge routes export the same complete vector PDF as the primitive", async () => {
  const actual = await renderToPDFBuffer(createEdgeRoutes()), expected = await renderToPDFBuffer(createEdgeRoutePrimitive());
  assert.deepEqual([actual.width, actual.height, actual.pages], [320, 240, 1]); assert.deepEqual(actual.buffer, expected.buffer);
});

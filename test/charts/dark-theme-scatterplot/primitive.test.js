import assert from "node:assert/strict";
import test from "node:test";

import { darkThemeRows } from
  "../../../examples/dark-theme-scatterplot/program.js";
import { createDarkThemeScatterplotPrimitive } from "./primitive.program.js";

test("keeps the explicit dark-style primitive baseline", () => {
  const program = createDarkThemeScatterplotPrimitive(darkThemeRows);

  assert.equal(program.graphicSpec.objects.canvas.properties.background, "#0f172a");
  assert.equal(program.graphicSpec.objects.xAxisLine.properties.stroke, "#cbd5e1");
  assert.equal(program.graphicSpec.objects.chartTitle.properties.fill, "#f8fafc");
  assert.equal(
    program.trace.children.some(node => node.op === "applyTheme"),
    false
  );
});

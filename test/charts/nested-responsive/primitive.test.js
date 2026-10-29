import assert from "node:assert/strict";
import test from "node:test";
import { createNestedResponsivePrimitive } from "./primitive.program.js";
import { namespaceGraphicId } from "../../../src/selectors/graphicCapacity.js";

test("literal nested panels retain measured plot dimensions and separate child Canvas placement", () => {
  const p = createNestedResponsivePrimitive();
  assert.deepEqual(p.semanticSpec.layers, []);
  assert.deepEqual(p.graphicSpec.objects.canvas.properties, { width: 1047, height: 942, background: "white" });
  const panel = p.graphicSpec.objects[namespaceGraphicId("report-panels", "canvas")];
  const overview = p.graphicSpec.objects[namespaceGraphicId("report-overview", "canvas")];
  assert.deepEqual([panel.properties.x, panel.properties.y, panel.properties.width, panel.properties.height], [0, 0, 675, 942]);
  assert.deepEqual([overview.properties.x, overview.properties.y, overview.properties.width, overview.properties.height], [707, 0, 340, 300]);
  const plot = p.graphicSpec.objects[namespaceGraphicId("report-panels", namespaceGraphicId("facet-facet-cell-1", "plot-background"))];
  assert.deepEqual([plot.properties.x, plot.properties.y, plot.properties.width, plot.properties.height], [58.5, 20, 261.5, 218.5]);
});

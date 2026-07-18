import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { createGapminderRegressionFacetPrimitives } from
  "./primitive.program.js";

function nestedCanvases(program) {
  return Object.entries(program.graphicSpec.objects)
    .filter(([id, object]) => id !== "canvas" && object.type === "canvas")
    .map(([, object]) => object);
}

test("authors both Gate I-A variants through concrete graphical primitives", () => {
  for (const xResolution of ["shared", "independent"]) {
    const program = createGapminderRegressionFacetPrimitives(loadGapminder(), {
      xResolution
    });
    assert.equal(program.graphicSpec.objects.canvas.properties.width, 908);
    assert.equal(program.graphicSpec.objects.canvas.properties.height, 588);
    assert.equal(nestedCanvases(program).length, 6);
    assert.equal(program.graphicSpec.objects.chartTitle.properties.x, 474);
    assert.equal(program.graphicSpec.objects.chartSubtitle.properties.x, 474);
    assert.deepEqual(
      [...new Set(program.trace.children.map(node => node.op))].sort(),
      ["createGraphics", "editGraphics"]
    );
    assert.equal(Object.keys(program.semanticSpec.datasets).length, 0);
  }
});

test("keeps one cell regression band, line, and point collection in draw order", () => {
  const program = createGapminderRegressionFacetPrimitives(loadGapminder());
  const canvas = nestedCanvases(program)[0];
  const children = canvas.children.map(id => program.graphicSpec.objects[id]);
  assert.equal(children[1].type, "path");
  assert.equal(children[1].properties.fill, "#111111");
  assert.equal(children[2].type, "circle");
  assert.equal(children[3].type, "path");
  assert.equal(children[3].properties.stroke, "#111827");
});

import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { createGapminderRegressionFacetPrimitives } from
  "./primitive.program.js";
import { createGapminderOuterGuideFacetPrimitives } from
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
      program.graphicSpec.objects.facetHeaders.items.map(item => item.properties.x),
      [174, 474, 774, 174, 474, 774]
    );
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

function decodeLocalGraphicId(id) {
  const encoded = id.split("_").at(-1);
  return [...encoded.matchAll(/.{6}/g)]
    .map(match => String.fromCodePoint(Number.parseInt(match[0], 16)))
    .join("");
}

test("keeps outer axes on occupied edges and one parent population legend", () => {
  const program = createGapminderOuterGuideFacetPrimitives(loadGapminder());
  const canvases = nestedCanvases(program);
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 1044);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 588);
  assert.equal(canvases.length, 5);

  const guideIds = canvases.map(canvas => canvas.children.map(decodeLocalGraphicId));
  const has = (index, id) => guideIds[index].includes(id);
  assert.deepEqual(
    guideIds.map((_, index) => ({
      x: has(index, "xTitle"),
      y: has(index, "yTitle")
    })),
    [
      { x: false, y: true },
      { x: false, y: false },
      { x: true, y: false },
      { x: true, y: true },
      { x: true, y: false }
    ]
  );
  assert.equal(program.graphicSpec.objects.populationGradientStrips.items.length, 60);
  assert.deepEqual(
    program.graphicSpec.objects.populationGradientLabels.items.map(
      item => item.properties.text
    ),
    ["83K", "326M", "652M", "979M", "1.3B"]
  );
  assert.equal(
    canvases.some(canvas => canvas.children.some(id =>
      decodeLocalGraphicId(id).includes("Gradient")
    )),
    false
  );
});

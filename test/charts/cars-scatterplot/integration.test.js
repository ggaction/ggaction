import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 2, colorValue: 4, opacityValue: 10 }),
  Object.freeze({ x: 10, y: 8, colorValue: 16, opacityValue: 30 })
]);

const initialCanvas = Object.freeze({
  width: 500,
  height: 300,
  margin: Object.freeze({ top: 30, right: 170, bottom: 50, left: 50 })
});

const resizedCanvas = Object.freeze({
  width: 620,
  height: 360,
  margin: Object.freeze({ top: 30, right: 190, bottom: 50, left: 50 })
});

function pointProgram() {
  return chart()
    .createCanvas(initialCanvas)
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("converges after scale editing and Canvas resizing in either order", () => {
  const original = pointProgram()
    .encodeColor({ field: "colorValue", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] });
  const originalGraphicSpec = original.graphicSpec;

  const scaleThenCanvas = original
    .editScale({ id: "x", reverse: true })
    .editCanvas(resizedCanvas);
  const canvasThenScale = original
    .editCanvas(resizedCanvas)
    .editScale({ id: "x", reverse: true });

  assert.deepEqual(scaleThenCanvas.semanticSpec, canvasThenScale.semanticSpec);
  assert.deepEqual(scaleThenCanvas.resolvedScales, canvasThenScale.resolvedScales);
  assert.deepEqual(scaleThenCanvas.graphicSpec, canvasThenScale.graphicSpec);
  assert.strictEqual(original.graphicSpec, originalGraphicSpec);
  assert.equal(original.graphicSpec.objects.canvas.properties.width, 500);
  assert.deepEqual(
    scaleThenCanvas.trace.children.at(-1).children.map(child => child.op),
    [
      "editGraphics",
      "editGraphics",
      "rematerializeScale",
      "rematerializeScale",
      "rematerializePointMark",
      "rematerializeLegend"
    ]
  );
});

test("updates inferred continuous titles and preserves explicit guide appearance", () => {
  const inferred = pointProgram()
    .encodeColor({ field: "colorValue", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] })
    .encodeColor({ field: "opacityValue", fieldType: "quantitative" });

  assert.equal(inferred.semanticSpec.guides.legend.color.title, "opacityValue");
  assert.equal(
    inferred.graphicSpec.objects.colorGradientTitle.properties.text,
    "opacityValue"
  );

  const explicit = pointProgram()
    .encodeColor({ field: "colorValue", fieldType: "quantitative" })
    .createLegend({
      channels: ["color"],
      title: "Intensity",
      labels: { color: "navy", fontSize: 11 },
      titleStyle: { color: "maroon", fontWeight: 700 }
    })
    .encodeColor({ field: "opacityValue", fieldType: "quantitative" });

  assert.equal(explicit.semanticSpec.guides.legend.color.title, "Intensity");
  assert.equal(explicit.guideConfigs.legend.gradient.labels.color, "navy");
  assert.equal(explicit.guideConfigs.legend.gradient.labels.fontSize, 11);
  assert.equal(explicit.guideConfigs.legend.gradient.titleStyle.color, "maroon");
  assert.equal(explicit.guideConfigs.legend.gradient.titleStyle.fontWeight, 700);
  assert.equal(
    explicit.graphicSpec.objects.colorGradientTitle.properties.text,
    "Intensity"
  );
});

test("preserves explicit opacity legend appearance across field reassignment", () => {
  const program = pointProgram()
    .encodeOpacity({ field: "colorValue" })
    .createLegend({
      channels: ["opacity"],
      title: "Visibility",
      labels: { color: "#123456" },
      titleStyle: { color: "#654321" }
    })
    .encodeOpacity({ field: "opacityValue" });

  assert.equal(program.semanticSpec.guides.legend.opacity.title, "Visibility");
  assert.equal(program.guideConfigs.legend.opacity.labels.color, "#123456");
  assert.equal(program.guideConfigs.legend.opacity.titleStyle.color, "#654321");
  assert.equal(
    program.graphicSpec.objects.opacityLegendTitle.properties.text,
    "Visibility"
  );
  assert.deepEqual(program.resolvedScales.opacity.domain, [10, 30]);
});

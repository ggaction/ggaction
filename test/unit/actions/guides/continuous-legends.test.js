import { graphicDrawOrder } from "../../../support/graphic-tree.js";
import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, value: 8 }),
  Object.freeze({ x: 2, y: 4, value: 12.2 }),
  Object.freeze({ x: 3, y: 6, value: 16.4 }),
  Object.freeze({ x: 4, y: 8, value: 20.6 }),
  Object.freeze({ x: 5, y: 10, value: 24.8 })
]);

function pointProgram({ position = "right", top = 100, right = 150, bottom = 100, left = 150 } = {}) {
  return chart()
    .createCanvas({
      width: 760,
      height: 460,
      margin: { top, right, bottom, left }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("rejects continuous legend sample counts above the generated item limit", () => {
  const base = pointProgram()
    .encodeOpacity({ field: "value" });
  assert.throws(
    () => base.createLegend({ channels: ["opacity"], count: 10_001 }),
    /must not exceed 10000/
  );
  const existing = base.createLegend({ channels: ["opacity"], count: 3 });
  assert.throws(
    () => existing.editLegend({ count: 10_001 }),
    /must not exceed 10000/
  );
});

test("creates the approved right gradient legend as concrete strips", () => {
  const program = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] });
  const strips = program.graphicSpec.objects.colorGradientStrips.items;
  const labels = program.graphicSpec.objects.colorGradientLabels.items;

  assert.equal(strips.length, 60);
  assert.deepEqual(strips[0].properties, {
    x: 640,
    y: 76,
    width: 12,
    height: 2,
    fill: "#f8e722",
    stroke: "#f8e722",
    strokeWidth: 0
  });
  assert.deepEqual(labels.map(label => label.properties.text), [
    "8", "12.2", "16.4", "20.6", "24.8"
  ]);
  assert.equal(program.semanticSpec.guides.legend.color.scale, "color");
  assert.equal(program.guideConfigs.legend.gradient.position, "right");
});

test("samples and labels full and close numeric legend domains without collapse", () => {
  for (const domain of [[-1e308, 1e308], [1e15, 1e15 + 1]]) {
    const values = [domain[0], domain[1]].map((value, index) => ({
      x: index,
      y: index,
      value
    }));
    const program = chart()
      .createCanvas({
        width: 760,
        height: 460,
        margin: { top: 30, right: 200, bottom: 60, left: 70 }
      })
      .createData({ values })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({
        field: "value",
        fieldType: "quantitative",
        scale: { domain }
      })
      .createLegend({ channels: ["color"] });
    const labels = program.graphicSpec.objects.colorGradientLabels.items.map(
      item => item.properties.text
    );
    assert.equal(new Set(labels).size, 5);
  }

  const tiny = chart()
    .createCanvas({ width: 760, height: 460, margin: { right: 200 } })
    .createData({
      values: [
        { x: 0, y: 0, value: Number.MIN_VALUE },
        { x: 1, y: 1, value: Number.MIN_VALUE * 2 }
      ]
    })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "value", fieldType: "quantitative" });
  assert.throws(
    () => tiny.createLegend({ channels: ["color"] }),
    /cannot represent 5 distinct samples/
  );
});

test("lays gradient legends out in all four positions", () => {
  for (const position of ["right", "left", "top", "bottom"]) {
    const program = pointProgram()
      .encodeColor({ field: "value", fieldType: "quantitative" })
      .createLegend({ channels: ["color"], position });
    const strips = program.graphicSpec.objects.colorGradientStrips.items;
    const first = strips[0].properties;
    const last = strips.at(-1).properties;
    if (["right", "left"].includes(position)) {
      assert.equal(first.x, last.x);
      assert.notEqual(first.y, last.y);
    } else {
      assert.notEqual(first.x, last.x);
      assert.equal(first.y, last.y);
      assert.equal(
        program.graphicSpec.objects.colorGradientLabels.items.every(
          label => label.properties.y > first.y + first.height
        ),
        true
      );
    }
  }
});

test("formats temporal gradient labels from normalized time domains", () => {
  const temporalRows = rows.map((row, index) => ({
    ...row,
    date: `${2020 + index}-01-01T00:00:00.000Z`
  }));
  const program = chart()
    .createCanvas({
      width: 760,
      height: 460,
      margin: { top: 90, right: 150, bottom: 90, left: 150 }
    })
    .createData({ id: "rows", values: temporalRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "date", fieldType: "temporal" })
    .createLegend({ channels: ["color"] });
  const labels = program.graphicSpec.objects.colorGradientLabels.items.map(
    label => label.properties.text
  );
  assert.equal(labels.length, 5);
  assert.equal(labels.every(label => typeof label === "string" && label.length > 0), true);
  assert.equal(program.guideConfigs.legend.gradient.fieldType, "temporal");
});

test("creates ascending opacity samples and removes them in constant mode", () => {
  const fieldProgram = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeOpacity({ field: "value" })
    .createLegend({ channels: ["opacity"] });
  assert.equal(
    fieldProgram.graphicSpec.objects.opacityLegendSymbols.items.every(
      (symbol, index) =>
        Math.abs(symbol.properties.opacity - (0.2 + index * 0.2)) < 1e-12
    ),
    true
  );
  assert.deepEqual(
    fieldProgram.graphicSpec.objects.opacityLegendLabels.items.map(
      label => label.properties.text
    ),
    ["8", "12.2", "16.4", "20.6", "24.8"]
  );

  const constantProgram = fieldProgram.encodeOpacity({ value: 0.5 });
  assert.equal(constantProgram.semanticSpec.layers[0].encoding.opacity, undefined);
  assert.equal(constantProgram.semanticSpec.guides.legend?.opacity, undefined);
  assert.equal(constantProgram.guideConfigs.legend?.opacity, undefined);
  assert.equal(constantProgram.graphicSpec.objects.opacityLegendSymbols, undefined);
  const encodeNode = constantProgram.trace.children.at(-1);
  const removeNode = encodeNode.children.find(
    child => child.op === "removeOpacityLegend"
  );
  assert.equal(removeNode.children[0].op, "editSemantic");
  assert.deepEqual(removeNode.children[0].args, {
    property: "guide.legend.opacity",
    remove: true
  });
  assert.equal(
    removeNode.children.filter(child => child.op === "editGraphics").length,
    3
  );
});

test("infers the only field-opacity legend through createGuides", () => {
  const program = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeOpacity({ field: "value" })
    .createGuides({ axes: false, grid: false });
  assert.equal(program.graphicSpec.objects.opacityLegendSymbols.items.length, 5);
});

test("lays opacity legends out in all four positions", () => {
  for (const position of ["right", "left", "top", "bottom"]) {
    const program = pointProgram()
      .encodeOpacity({ field: "value" })
      .createLegend({ channels: ["opacity"], position });
    const symbols = program.graphicSpec.objects.opacityLegendSymbols.items;
    if (["right", "left"].includes(position)) {
      assert.equal(symbols[0].properties.x, symbols.at(-1).properties.x);
      assert.notEqual(symbols[0].properties.y, symbols.at(-1).properties.y);
    } else {
      assert.notEqual(symbols[0].properties.x, symbols.at(-1).properties.x);
      assert.equal(symbols[0].properties.y, symbols.at(-1).properties.y);
      assert.equal(
        program.graphicSpec.objects.opacityLegendLabels.items.every(
          (label, index) => label.properties.y >
            symbols[index].properties.y + symbols[index].properties.radius
        ),
        true
      );
    }
  }
});

test("lays out a horizontal opacity title and samples on one reading line", () => {
  const program = pointProgram({ top: 120, left: 70, right: 70, bottom: 60 })
    .encodeOpacity({ field: "value" })
    .createLegend({
      channels: ["opacity"],
      position: "top",
      titlePosition: "left",
      count: 3
    });
  const title = program.graphicSpec.objects.opacityLegendTitle.properties;
  const symbols = program.graphicSpec.objects.opacityLegendSymbols.items;
  const labels = program.graphicSpec.objects.opacityLegendLabels.items;
  assert.equal(title.textAlign, "left");
  assert.equal(program.guideConfigs.legend.opacity.titlePosition, "left");
  assert.equal(program.guideConfigs.legend.opacity.itemGap, 20);
  assert.equal(program.guideConfigs.legend.opacity.labels.offset, 8);
  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index].properties;
    const label = labels[index].properties;
    assert.equal(symbol.y, title.y);
    assert.equal(label.y, title.y);
    assert.equal(label.x - symbol.x - symbol.radius, 8);
    assert.equal(label.textAlign, "left");
  }
});

test("rematerializes continuous legends after scale and Canvas edits", () => {
  const gradient = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({ channels: ["color"] });
  const firstColor = gradient.graphicSpec.objects.colorGradientStrips.items[0]
    .properties.fill;
  const reversed = gradient.editScale({ id: "color", reverse: true });
  assert.notEqual(
    reversed.graphicSpec.objects.colorGradientStrips.items[0].properties.fill,
    firstColor
  );

  const opacity = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeOpacity({ field: "value" })
    .createLegend({ channels: ["opacity"] });
  const resized = opacity.editCanvas({ width: 800, margin: { top: 30, right: 190, bottom: 60, left: 70 } });
  assert.equal(
    resized.graphicSpec.objects.opacityLegendSymbols.items[0].properties.x,
    647
  );
});

test("materializes optional continuous legend backgrounds before content", () => {
  const gradient = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeColor({ field: "value", fieldType: "quantitative" })
    .createLegend({
      channels: ["color"],
      border: { background: "white", padding: 8 }
    });
  assert.equal(
    graphicDrawOrder(gradient).indexOf("colorGradientBackground") <
      graphicDrawOrder(gradient).indexOf("colorGradientStrips"),
    true
  );
  assert.equal(
    gradient.graphicSpec.objects.colorGradientBackground.properties.fill,
    "white"
  );

  const opacity = pointProgram({ top: 30, left: 70, bottom: 60 })
    .encodeOpacity({ field: "value" })
    .createLegend({ channels: ["opacity"], border: true });
  assert.equal(
    graphicDrawOrder(opacity).indexOf("opacityLegendBackground") <
      graphicDrawOrder(opacity).indexOf("opacityLegendSymbols"),
    true
  );
});

test("rejects incompatible options and insufficient margins atomically", () => {
  const color = pointProgram({ top: 30, right: 20, bottom: 60, left: 70 })
    .encodeColor({ field: "value", fieldType: "quantitative" });
  assert.throws(
    () => color.createLegend({ channels: ["color"] }),
    /more Canvas margin space/
  );
  assert.throws(
    () => color.createLegend({ channels: ["color"], columns: 2 }),
    /does not accept columns/
  );
  assert.throws(
    () => color.createLegend({
      channels: ["color"],
      position: "top",
      titlePosition: "left"
    }),
    /Only horizontal opacity legends support left titlePosition/
  );

  const opacity = pointProgram()
    .encodeOpacity({ field: "value" });
  assert.throws(
    () => opacity.createLegend({ channels: ["opacity"], gradient: {} }),
    /does not accept gradient/
  );
  assert.throws(
    () => opacity.createLegend({
      channels: ["opacity"],
      position: "right",
      titlePosition: "left"
    }),
    /Only horizontal opacity legends support left titlePosition/
  );
  assert.equal(color.graphicSpec.objects.colorGradientStrips, undefined);
});

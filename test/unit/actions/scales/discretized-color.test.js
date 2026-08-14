import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import {
  formatDiscretizedIntervals,
  resolveDiscretizedColorScale
} from "../../../../src/grammar/scales/index.js";
import { graphicDrawOrder } from "../../../support/graphic-tree.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 1, value: 10 }),
  Object.freeze({ x: 2, y: 2, value: 20 }),
  Object.freeze({ x: 3, y: 3, value: 30 })
]);

function program(scale) {
  return chart()
    .createCanvas({
      width: 200,
      height: 160,
      margin: { top: 30, right: 120, bottom: 30, left: 30 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale
    });
}

test("persists, resolves, and maps each discretized quantitative color type", () => {
  for (const [type, domain] of [
    ["quantize", undefined],
    ["quantile", undefined],
    ["threshold", [15, 25]]
  ]) {
    const result = program({
      type,
      ...(domain === undefined ? {} : { domain }),
      range: ["red", "green", "blue"]
    });
    const fills = result.graphicSpec.objects.point.items.map(
      child => child.properties.fill
    );

    assert.equal(result.semanticSpec.scales.find(scale => scale.id === "color").type, type);
    assert.deepEqual(fills, ["red", "green", "blue"]);
  }
});

test("reverses the resolved class colors and interval legend together", () => {
  const result = program({
    type: "threshold",
    domain: [15, 25],
    range: ["red", "green", "blue"],
    reverse: true
  }).createLegend({
    labels: { fontSize: 10 },
    titleStyle: { fontSize: 10 }
  });

  assert.deepEqual(result.resolvedScales.color.range, ["blue", "green", "red"]);
  assert.deepEqual(
    result.graphicSpec.objects.point.items.map(child => child.properties.fill),
    ["blue", "green", "red"]
  );
  assert.deepEqual(
    result.graphicSpec.objects.colorLegendSymbols.items.map(
      child => child.properties.fill
    ),
    ["blue", "green", "red"]
  );
});

test("edits an interval legend through the shared public legend action", () => {
  const original = program({
    type: "threshold",
    domain: [15, 25],
    range: ["red", "green", "blue"]
  }).createLegend({ title: "Value", labels: { fontSize: 10 } });
  const edited = original.editLegend({
    itemGap: 20,
    symbol: { width: 10 },
    title: false
  });

  assert.equal(original.graphicSpec.objects.colorLegendTitle !== undefined, true);
  assert.equal(edited.graphicSpec.objects.colorLegendTitle, undefined);
  assert.deepEqual(
    edited.graphicSpec.objects.colorLegendSymbols.items.map(
      child => child.properties.width
    ),
    [10, 10, 10]
  );
});

test("creates, edits, and removes interval legend borders", () => {
  const original = program({
    type: "threshold",
    domain: [15, 25],
    range: ["red", "green", "blue"]
  }).createLegend({
    border: { background: "white", color: "navy", padding: 4 },
    labels: { fontSize: 10 },
    titleStyle: { fontSize: 10 }
  });
  const background = original.graphicSpec.objects.colorLegendBackground;
  assert.equal(background.properties.fill, "white");
  assert.equal(background.properties.stroke, "navy");
  assert.equal(
    graphicDrawOrder(original).indexOf("colorLegendBackground") <
      graphicDrawOrder(original).indexOf("colorLegendSymbols"),
    true
  );

  const withoutBorder = original.editLegend({ border: false });
  assert.equal(withoutBorder.graphicSpec.objects.colorLegendBackground, undefined);
  const restored = withoutBorder.editLegend({ border: true });
  assert.ok(restored.graphicSpec.objects.colorLegendBackground);
  const removed = restored.removeLegend({ channels: ["color"] });
  assert.equal(removed.graphicSpec.objects.colorLegendBackground, undefined);
});

test("rematerializes a shared discretized scale and interval legend after Canvas edits", () => {
  const scale = {
    type: "threshold",
    domain: [15, 25],
    range: ["red", "green", "blue"]
  };
  const original = program(scale)
    .createPointMark({ id: "second" })
    .encodeColor({
      target: "second",
      field: "value",
      fieldType: "quantitative",
      scale: { id: "color", ...scale }
    });
  assert.throws(() => original.createLegend(), /requires one eligible point/);
  const withLegend = original
    .createLegend({
      target: "point",
      labels: { fontSize: 10 },
      titleStyle: { fontSize: 10 }
    });
  const edited = withLegend.editCanvas({ width: 220 });

  assert.deepEqual(
    edited.graphicSpec.objects.point.items.map(child => child.properties.fill),
    edited.graphicSpec.objects.second.items.map(child => child.properties.fill)
  );
  assert.equal(
    edited.graphicSpec.objects.colorLegendSymbols.items[0].properties.x -
      withLegend.graphicSpec.objects.colorLegendSymbols.items[0].properties.x,
    20
  );
  assert.equal(withLegend.graphicSpec.objects.canvas.properties.width, 200);
});

test("rejects unsupported and invalid discretized color options atomically", () => {
  const base = chart()
    .createCanvas({
      width: 200,
      height: 160,
      margin: { top: 30, right: 80, bottom: 30, left: 30 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });

  assert.throws(() => base.encodeColor({
    field: "value",
    fieldType: "quantitative",
    scale: { type: "threshold", range: ["red", "blue"] }
  }), /explicit domain/);
  assert.throws(() => base.encodeColor({
    field: "value",
    fieldType: "quantitative",
    scale: {
      type: "threshold",
      domain: [20, 10],
      range: ["red", "green", "blue"]
    }
  }), /strictly increasing/);
  assert.equal(base.semanticSpec.scales.some(scale => scale.id === "color"), false);
});

test("keeps public discretized color classes finite across the full numeric range", () => {
  const extremeRows = [-1e308, 0, 1e308].map((value, index) => ({
    x: index,
    y: index,
    value
  }));
  for (const type of ["quantize", "quantile"]) {
    const result = chart()
      .createCanvas({ width: 240, height: 180 })
      .createData({ values: extremeRows })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({
        field: "value",
        fieldType: "quantitative",
        scale: {
          type,
          ...(type === "quantize" ? { domain: [-1e308, 1e308] } : {}),
          range: ["#000000", "#333333", "#777777", "#bbbbbb", "#ffffff"]
        }
      });
    const scale = result.resolvedScales.color;
    assert.equal(scale.thresholds.every(Number.isFinite), true, type);
    assert.deepEqual(
      result.graphicSpec.objects.point.items.map(item => item.properties.fill),
      ["#000000", "#777777", "#ffffff"]
    );
  }
});

test("rejects unrepresentable quantize classes and preserves tiny interval labels", () => {
  for (const domain of [
    [1e308, 1.0000000000000002e308],
    [Number.MIN_VALUE, Number.MIN_VALUE * 2]
  ]) {
    assert.throws(() => resolveDiscretizedColorScale({
      type: "quantize",
      domain,
      range: "auto",
      values: domain
    }), /more classes than its numeric domain can represent/);
  }
  assert.deepEqual(formatDiscretizedIntervals([Number.MIN_VALUE, 1e-323]), [
    "< 5e-324",
    "5e-324–1e-323",
    "≥ 1e-323"
  ]);
  assert.deepEqual(formatDiscretizedIntervals([0.04, 0.05]), [
    "< 0.04",
    "0.04–0.05",
    "≥ 0.05"
  ]);
  assert.deepEqual(formatDiscretizedIntervals([15, 25]), [
    "< 15",
    "15–25",
    "≥ 25"
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from
  "../../../../src/grammar/schemas/graphicBounds.js";
import { HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP } from
  "../../../../src/layout/legendLane.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", amount: 4, alpha: 0.2 }),
  Object.freeze({ x: 2, y: 5, group: "B", amount: 9, alpha: 0.6 }),
  Object.freeze({ x: 3, y: 3, group: "C", amount: 16, alpha: 1 })
]);

function base({ height = 520, left = 70, right = 230 } = {}) {
  return chart()
    .createCanvas({
      width: 760,
      height,
      margin: { top: 40, right, bottom: 60, left }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group", fieldType: "nominal" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "alpha" });
}

function createThree(program, position = "right", reverse = false) {
  const calls = [
    next => next.createLegend({ channels: ["color"], position }),
    next => next.createLegend({ channels: ["size"], count: 3 }),
    next => next.createLegend({ channels: ["opacity"], position, count: 3 })
  ];
  return (reverse ? [...calls].reverse() : calls).reduce(
    (next, create) => create(next),
    program
  );
}

function values(program, id, property) {
  return program.graphicSpec.objects[id].items.map(
    item => item.properties[property]
  );
}

function centers(program, id) {
  const graphic = program.graphicSpec.objects[id];
  return graphic.items.map(item => {
    const properties = item.properties;
    return (item.type ?? graphic.type) === "rect"
      ? properties.x + properties.width / 2
      : properties.x;
  });
}

function laneCoordinates(program) {
  const objects = program.graphicSpec.objects;
  return {
    titles: ["colorLegendTitle", "sizeLegendTitle", "opacityLegendTitle"]
      .map(id => ({ x: objects[id].properties.x, y: objects[id].properties.y })),
    symbols: [
      centers(program, "colorLegendSymbols"),
      values(program, "sizeLegendSymbols", "x"),
      values(program, "opacityLegendSymbols", "x")
    ],
    labels: ["colorLegendLabels", "sizeLegendLabels", "opacityLegendLabels"]
      .map(id => values(program, id, "x"))
  };
}

function horizontalBase(position, options = {}) {
  return chart()
    .createCanvas({
      width: 760,
      height: 620,
      margin: {
        top: position === "top" ? options.margin ?? 250 : 40,
        right: 70,
        bottom: position === "bottom" ? options.margin ?? 250 : 60,
        left: 70
      }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group", fieldType: "nominal" })
    .encodeOpacity({ field: "alpha" });
}

function createHorizontal(program, position, reverse = false) {
  const calls = [
    next => next.createLegend({
      target: "points",
      channels: ["color"],
      position,
      align: "left",
      columns: 3
    }),
    next => next.createLegend({
      target: "points",
      channels: ["opacity"],
      position,
      align: "right",
      count: 3
    })
  ];
  return (reverse ? [...calls].reverse() : calls).reduce(
    (next, create) => create(next),
    program
  );
}

function horizontalBounds(program, kind) {
  const ids = kind === "color"
    ? ["colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"]
    : ["opacityLegendSymbols", "opacityLegendLabels", "opacityLegendTitle"];
  return unionConcreteGraphicBounds(program.graphicSpec, ids);
}

function horizontalCoordinates(program) {
  return {
    color: ["colorLegendSymbols", "colorLegendLabels"]
      .map(id => program.graphicSpec.objects[id].items.map(
        item => ({ x: item.properties.x, y: item.properties.y })
      )),
    colorTitle: program.graphicSpec.objects.colorLegendTitle.properties,
    opacity: ["opacityLegendSymbols", "opacityLegendLabels"]
      .map(id => program.graphicSpec.objects[id].items.map(
        item => ({ x: item.properties.x, y: item.properties.y })
      )),
    opacityTitle: program.graphicSpec.objects.opacityLegendTitle.properties
  };
}

function horizontalAlignment(program, kind) {
  const prefix = kind === "gradient" ? "colorGradient" : `${kind}Legend`;
  const titleId = `${prefix}Title`;
  const elementId = kind === "gradient"
    ? "colorGradientStrips"
    : `${prefix}Symbols`;
  const title = program.graphicSpec.objects[titleId].properties;
  const titleBounds = resolveConcreteGraphicBounds(program.graphicSpec, titleId);
  const elementBounds = resolveConcreteGraphicBounds(
    program.graphicSpec,
    elementId
  );
  return {
    titleY: title.y,
    titleBottom: titleBounds.bottom,
    elementTop: elementBounds.top
  };
}

function assertSharedHorizontalRow(program, kinds) {
  const alignments = kinds.map(kind => horizontalAlignment(program, kind));
  assert.equal(new Set(alignments.map(item => item.titleY)).size, 1);
  assert.equal(new Set(alignments.map(item => item.elementTop)).size, 1);
  for (const alignment of alignments) {
    assert.equal(
      alignment.elementTop - alignment.titleBottom,
      HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP
    );
  }
}

test("aligns real multi-legend graphics and stacks their blocks", () => {
  const program = createThree(base());
  const coordinates = laneCoordinates(program);

  assert.deepEqual(coordinates.titles.map(item => item.x), [560, 560, 560]);
  assert.equal(coordinates.symbols.flat().every(x => x === 576), true);
  assert.equal(coordinates.labels.flat().every(x => x === 604), true);
  assert.ok(coordinates.titles[1].y > coordinates.titles[0].y);
  assert.ok(coordinates.titles[2].y > coordinates.titles[1].y);
});

test("converges to the same lane coordinates regardless of authoring order", () => {
  const forward = createThree(base());
  const reverse = createThree(base(), "right", true);
  assert.deepEqual(laneCoordinates(reverse), laneCoordinates(forward));
});

test("uses the same readable columns for a left-side lane", () => {
  const program = createThree(base({ left: 220, right: 80 }), "left");
  const coordinates = laneCoordinates(program);
  const [titleX] = coordinates.titles.map(item => item.x);
  const [symbolX] = coordinates.symbols.flat();
  const [labelX] = coordinates.labels.flat();

  assert.equal(coordinates.titles.every(item => item.x === titleX), true);
  assert.equal(coordinates.symbols.flat().every(x => x === symbolX), true);
  assert.equal(coordinates.labels.flat().every(x => x === labelX), true);
  assert.ok(titleX < symbolX);
  assert.ok(symbolX < labelX);
});

test("fails atomically when a second block cannot fit", () => {
  const program = base({ height: 180, right: 160 })
    .createLegend({ channels: ["color"] });
  assert.throws(
    () => program.createLegend({ channels: ["size"], count: 3 }),
    /requires more right-margin or vertical Canvas space/
  );
  assert.equal(program.guideConfigs.legend.size, undefined);
  assert.equal(program.graphicSpec.objects.sizeLegendSymbols, undefined);
});

test("aligns gradient and opacity recipes in the same side lane", () => {
  const program = chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 40, right: 230, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "amount", fieldType: "quantitative" })
    .encodeOpacity({ field: "alpha" })
    .createLegend({ channels: ["color"] })
    .createLegend({ channels: ["opacity"], count: 3 });
  const strip = program.graphicSpec.objects.colorGradientStrips.items[0].properties;

  assert.equal(program.graphicSpec.objects.colorGradientTitle.properties.x, 560);
  assert.equal(strip.x + strip.width / 2, 576);
  assert.equal(values(program, "colorGradientLabels", "x").every(x => x === 604), true);
  assert.equal(values(program, "opacityLegendSymbols", "x").every(x => x === 576), true);
  assert.equal(values(program, "opacityLegendLabels", "x").every(x => x === 604), true);
});

test("orders independent interval and stroke-width recipes by layer", () => {
  const lineRows = [
    { x: 1, y: 2, group: "A", amount: 4, weight: 2 },
    { x: 2, y: 5, group: "A", amount: 9, weight: 2 },
    { x: 1, y: 3, group: "B", amount: 12, weight: 10 },
    { x: 2, y: 6, group: "B", amount: 16, weight: 10 }
  ];
  const program = chart()
    .createCanvas({
      width: 760,
      height: 600,
      margin: { top: 40, right: 230, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: lineRows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({
      field: "amount",
      fieldType: "quantitative",
      scale: { type: "quantize", range: ["#cbd5e1", "#64748b", "#0f172a"] }
    })
    .createLineMark({ id: "lines", data: "rows" })
    .encodeX({ target: "lines", field: "x", scale: { id: "x" } })
    .encodeY({ target: "lines", field: "y", scale: { id: "y" } })
    .encodeGroup({ target: "lines", field: "group" })
    .encodeStrokeWidth({ target: "lines", field: "weight" })
    .createLegend({ target: "points", channels: ["color"] })
    .createLegend({ target: "lines", channels: ["strokeWidth"], count: 3 });
  const intervalTitle = program.graphicSpec.objects.colorLegendTitle.properties;
  const strokeTitle = program.graphicSpec.objects.strokeWidthLegendTitle.properties;

  assert.equal(intervalTitle.x, 560);
  assert.equal(strokeTitle.x, 560);
  assert.ok(intervalTitle.y < strokeTitle.y);
  assert.equal(centers(program, "colorLegendSymbols").every(x => x === 576), true);
  assert.equal(values(program, "strokeWidthLegendLabels", "x").every(x => x === 604), true);
});

for (const position of ["top", "bottom"]) {
  test(`packs ${position} blocks into one aligned row`, () => {
    const program = createHorizontal(horizontalBase(position), position);
    assertSharedHorizontalRow(program, ["color", "opacity"]);
    const color = horizontalBounds(program, "color");
    const opacity = horizontalBounds(program, "opacity");
    assert.equal(
      color.left,
      70
    );
    assert.ok(Math.abs(opacity.left - color.right - 24) < 1e-9);
  });

  test(`converges ${position} coordinates across authoring order`, () => {
    const forward = createHorizontal(horizontalBase(position), position);
    const reverse = createHorizontal(horizontalBase(position), position, true);
    assert.deepEqual(
      horizontalCoordinates(reverse),
      horizontalCoordinates(forward)
    );
  });
}

test("replays top lanes after Canvas edits", () => {
  const before = createHorizontal(horizontalBase("top"), "top");
  const resized = before.editCanvas({
    width: 820,
    height: 660,
    margin: { top: 270, right: 80, bottom: 60, left: 80 }
  });
  const direct = createHorizontal(
    chart()
      .createCanvas({
        width: 820,
        height: 660,
        margin: { top: 270, right: 80, bottom: 60, left: 80 }
      })
      .createData({ id: "rows", values: rows })
      .createPointMark({ id: "points" })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({ field: "group", fieldType: "nominal" })
      .encodeOpacity({ field: "alpha" }),
    "top"
  );
  assert.deepEqual(horizontalCoordinates(resized), horizontalCoordinates(direct));
});

test("converges horizontal lanes across legend, scale, and Canvas edits", () => {
  const program = createHorizontal(horizontalBase("top"), "top");
  const editedLegend = program.editLegend({
    target: "points",
    align: "center",
    itemGap: 30
  });
  assertSharedHorizontalRow(editedLegend, ["color", "opacity"]);
  const canvas = {
    width: 820,
    height: 660,
    margin: { top: 270, right: 80, bottom: 60, left: 80 }
  };
  const scaleThenCanvas = program
    .editScale({ id: "opacity", domain: [0, 1] })
    .editCanvas(canvas);
  const canvasThenScale = program
    .editCanvas(canvas)
    .editScale({ id: "opacity", domain: [0, 1] });
  assert.deepEqual(
    horizontalCoordinates(scaleThenCanvas),
    horizontalCoordinates(canvasThenScale)
  );
});

test("aligns top gradient and opacity recipes in one row", () => {
  const program = chart()
    .createCanvas({
      width: 760,
      height: 620,
      margin: { top: 280, right: 70, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "amount", fieldType: "quantitative" })
    .encodeOpacity({ field: "alpha" })
    .createLegend({ channels: ["color"], position: "top", align: "left" })
    .createLegend({
      channels: ["opacity"],
      position: "top",
      align: "right",
      count: 3
    });
  assertSharedHorizontalRow(program, ["gradient", "opacity"]);
  const gradient = unionConcreteGraphicBounds(program.graphicSpec, [
    "colorGradientStrips", "colorGradientTicks", "colorGradientLabels",
    "colorGradientTitle"
  ]);
  const opacity = horizontalBounds(program, "opacity");
  assert.equal(
    gradient.left,
    70
  );
  assert.ok(Math.abs(opacity.left - gradient.right - 24) < 1e-9);
});

function createThreeFamilyHorizontal(position) {
  return chart()
    .createCanvas({
      width: 760,
      height: 620,
      margin: {
        top: position === "top" ? 280 : 40,
        right: 70,
        bottom: position === "bottom" ? 280 : 60,
        left: 70
      }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "categorical" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group", fieldType: "nominal" })
    .encodeOpacity({ field: "alpha" })
    .createPointMark({ id: "quantitative", data: "rows" })
    .encodeX({ target: "quantitative", field: "x", scale: { id: "x" } })
    .encodeY({ target: "quantitative", field: "y", scale: { id: "y" } })
    .encodeColor({
      target: "quantitative",
      field: "amount",
      fieldType: "quantitative",
      scale: { id: "amountColor", type: "sequential" }
    })
    .createLegend({
      target: "categorical",
      channels: ["color"],
      position,
      align: "left",
      columns: 3,
      border: true
    })
    .createLegend({
      target: "categorical",
      channels: ["opacity"],
      position,
      align: "right",
      count: 3,
      border: true
    })
    .createLegend({
      target: "quantitative",
      channels: ["color"],
      position,
      align: "center",
      border: true
    });
}

for (const position of ["top", "bottom"]) {
  test(`aligns categorical, gradient, and opacity ${position} recipes`, () => {
    const program = createThreeFamilyHorizontal(position);
    assertSharedHorizontalRow(program, ["color", "opacity", "gradient"]);
    for (const [elementId, labelId] of [
      ["colorGradientStrips", "colorGradientLabels"],
      ["opacityLegendSymbols", "opacityLegendLabels"]
    ]) {
      const element = resolveConcreteGraphicBounds(program.graphicSpec, elementId);
      const labels = resolveConcreteGraphicBounds(program.graphicSpec, labelId);
      assert.equal(labels.top - element.bottom, 12);
    }
    for (const id of [
      "colorLegendBackground",
      "opacityLegendBackground",
      "colorGradientBackground"
    ]) {
      const background = resolveConcreteGraphicBounds(program.graphicSpec, id);
      assert.ok(background.top < horizontalAlignment(
        program,
        id.startsWith("colorGradient") ? "gradient"
          : id.startsWith("opacity") ? "opacity" : "color"
      ).titleBottom);
    }
  });
}

test("restores a retained horizontal block after removing its sibling target", () => {
  const encoded = chart()
    .createCanvas({
      width: 760,
      height: 620,
      margin: { top: 250, right: 70, bottom: 60, left: 70 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "colorPoints" })
    .encodeColor({ target: "colorPoints", field: "group", fieldType: "nominal" })
    .createPointMark({ id: "opacityPoints", data: "rows" })
    .encodeOpacity({ target: "opacityPoints", field: "alpha" });
  const standalone = encoded.createLegend({
    target: "opacityPoints",
    channels: ["opacity"],
    position: "top",
    count: 3
  });
  const program = encoded
    .createLegend({
      target: "colorPoints",
      channels: ["color"],
      position: "top"
    })
    .createLegend({
      target: "opacityPoints",
      channels: ["opacity"],
      position: "top",
      count: 3
    });
  const removed = program.removeLegend({ target: "colorPoints" });
  const opacity = horizontalBounds(removed, "opacity");

  assert.equal(removed.guideConfigs.legend.color, undefined);
  assert.equal(opacity.bottom < 250, true);
  for (const id of ["opacityLegendSymbols", "opacityLegendLabels"]) {
    assert.deepEqual(
      removed.graphicSpec.objects[id].items,
      standalone.graphicSpec.objects[id].items
    );
  }
  assert.deepEqual(
    removed.graphicSpec.objects.opacityLegendTitle.properties,
    standalone.graphicSpec.objects.opacityLegendTitle.properties
  );
});

test("rejects horizontal lane overflow without changing the source", () => {
  const program = horizontalBase("top", { margin: 80 })
    .createLegend({ channels: ["color"], position: "top" });
  assert.throws(
    () => program.createLegend({
      channels: ["opacity"],
      position: "top",
      count: 3
    }),
    /requires more (top-margin or )?Canvas margin space/
  );
  assert.equal(program.guideConfigs.legend.opacity, undefined);
  assert.equal(program.graphicSpec.objects.opacityLegendSymbols, undefined);
});

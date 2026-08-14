import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const VALUES = Object.freeze([
  Object.freeze({ x: 1, y: 4, group: "Alpha", value: 0 }),
  Object.freeze({ x: 2, y: 6, group: "Beta", value: 0.5 }),
  Object.freeze({ x: 3, y: 8, group: "Gamma", value: 1 })
]);

function categoricalBase() {
  return chart()
    .createCanvas({
      width: 720,
      height: 620,
      margin: { top: 180, right: 220, bottom: 180, left: 220 }
    })
    .createData({ id: "source", values: VALUES })
    .createPointMark({ id: "points", data: "source" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .encodeColor({ target: "points", field: "group" })
    .encodeShape({ target: "points", field: "group" })
    .encodePointRadius({ target: "points", value: 4 });
}

function categorical(position, offset, border = true) {
  return categoricalBase().createLegend({
    target: "points",
    channels: ["color", "shape"],
    position,
    offset,
    border
  });
}

function firstSymbol(program) {
  const graphic = Object.entries(program.graphicSpec.objects).find(
    ([id, value]) => id.includes("LegendSymbol") && value.items?.length > 0
  )?.[1];
  return graphic.items[0].properties;
}

function firstLabel(program) {
  const graphic = Object.entries(program.graphicSpec.objects).find(
    ([id]) => id.endsWith("LegendLabels")
  )?.[1];
  return graphic.items[0].properties;
}

function component(program, suffix) {
  return Object.entries(program.graphicSpec.objects).find(
    ([id]) => id.endsWith(suffix)
  )?.[1];
}

test("applies categorical legend offset from the plot edge in all directions", () => {
  const cases = [
    ["right", "x", 72],
    ["left", "x", -72],
    ["top", "y", -72],
    ["bottom", "y", 72]
  ];

  for (const [position, coordinate, expectedDelta] of cases) {
    const near = firstSymbol(categorical(position, 8));
    const far = firstSymbol(categorical(position, 80));
    assert.ok(
      Math.abs(far[coordinate] - near[coordinate] - expectedDelta) < 1e-9,
      `${position} categorical legend offset should move ${expectedDelta}px`
    );
  }
});

test("moves every right categorical component through create and focused edit", () => {
  const near = categorical("right", 8);
  const far = categorical("right", 80);
  const edited = near.editLegendLayout({ target: "points", offset: 80 });

  for (const candidate of [far, edited]) {
    assert.equal(firstSymbol(candidate).x - firstSymbol(near).x, 72);
    assert.equal(firstLabel(candidate).x - firstLabel(near).x, 72);
    assert.equal(
      component(candidate, "LegendTitle").properties.x -
        component(near, "LegendTitle").properties.x,
      72
    );
    assert.equal(
      component(candidate, "LegendBackground").properties.x -
        component(near, "LegendBackground").properties.x,
      72
    );
  }

  assert.deepEqual(edited.graphicSpec, far.graphicSpec);
  assert.equal(near.guideConfigs.legend.series.offset, 8);
  assert.equal(edited.guideConfigs.legend.series.offset, 80);
});

test("applies right offset without a categorical border", () => {
  const near = categorical("right", 8, false);
  const far = categorical("right", 80, false);

  assert.equal(firstSymbol(far).x - firstSymbol(near).x, 72);
  assert.equal(component(far, "LegendBackground"), undefined);
});

test("keeps the right continuous-gradient offset control unchanged", () => {
  const base = chart()
    .createCanvas({
      width: 720,
      height: 620,
      margin: { top: 180, right: 220, bottom: 180, left: 220 }
    })
    .createData({ id: "source", values: VALUES })
    .createPointMark({ id: "points", data: "source" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .encodeColor({
      target: "points",
      field: "value",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    });
  const near = base.createLegend({
    target: "points",
    channels: ["color"],
    position: "right",
    offset: 8
  });
  const far = base.createLegend({
    target: "points",
    channels: ["color"],
    position: "right",
    offset: 80
  });

  assert.equal(
    far.graphicSpec.objects.colorGradientStrips.items[0].properties.x -
      near.graphicSpec.objects.colorGradientStrips.items[0].properties.x,
    72
  );
});

test("rejects a right offset that cannot fit labels without partial state", () => {
  const prior = categoricalBase();
  assert.throws(
    () => prior.createLegend({
      target: "points",
      channels: ["color", "shape"],
      position: "right",
      offset: 210
    }),
    /more Canvas margin space/
  );
  assert.equal(prior.graphicSpec.objects.colorLegendSymbols, undefined);
  assert.equal(prior.guideConfigs.legend?.color, undefined);
});

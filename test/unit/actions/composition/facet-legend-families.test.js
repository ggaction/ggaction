import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { namespaceGraphicId } from
  "../../../../src/materialization/compositionSnapshot.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", category: "u", value: 10 }),
  Object.freeze({ x: 2, y: 3, group: "B", category: "v", value: 20 }),
  Object.freeze({ x: 3, y: 4, group: "A", category: "v", value: 30 }),
  Object.freeze({ x: 4, y: 5, group: "B", category: "u", value: 40 })
]);

function pointBase(values = rows) {
  return chart()
    .createCanvas({
      width: 500,
      height: 300,
      margin: { top: 30, right: 180, bottom: 50, left: 60 }
    })
    .createData({ values })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

const families = Object.freeze([
  {
    name: "categorical",
    kind: "color",
    root: "colorLegendSymbols",
    build: program => program
      .encodeColor({ field: "category" })
      .createLegend({ channels: ["color"] })
  },
  {
    name: "discretized",
    kind: "interval",
    root: "colorLegendSymbols",
    build: program => program
      .encodeColor({
        field: "value",
        fieldType: "quantitative",
        scale: {
          type: "threshold",
          domain: [20, 30],
          range: ["red", "green", "blue"]
        }
      })
      .createLegend({ channels: ["color"] })
  },
  {
    name: "size",
    kind: "size",
    root: "sizeLegendSymbols",
    build: program => program
      .encodeSize({ field: "value" })
      .createLegend({ channels: ["size"] })
  },
  {
    name: "opacity",
    kind: "opacity",
    root: "opacityLegendSymbols",
    build: program => program
      .encodeOpacity({ field: "value" })
      .createLegend({ channels: ["opacity"] })
  }
]);

test("promotes every compatible concrete legend family to one parent owner", () => {
  for (const family of families) {
    const source = family.build(pointBase());
    const faceted = source.facet({
      field: "group",
      guides: { legend: "shared" }
    });
    const owner = faceted.graphicSpec.objects["facet-shared-legend"];

    assert.equal(owner.type, "canvas", family.name);
    assert.equal(owner.children.includes(family.root), true, family.name);
    assert.ok(faceted.guideConfigs.legend[family.kind], family.name);
    assert.equal(
      faceted.compositionSpec.children.every(id =>
        faceted.graphicSpec.objects[namespaceGraphicId(
          `facet-${id}`,
          family.root
        )] === undefined
      ),
      true,
      family.name
    );
  }
});

test("rejects a shared legend when independent child scales are incompatible", () => {
  const values = Object.freeze([
    Object.freeze({ x: 1, y: 1, group: "A", category: "u" }),
    Object.freeze({ x: 2, y: 2, group: "A", category: "u" }),
    Object.freeze({ x: 3, y: 3, group: "B", category: "v" }),
    Object.freeze({ x: 4, y: 4, group: "B", category: "v" })
  ]);
  const source = pointBase(values)
    .encodeColor({ field: "category" })
    .createLegend({ channels: ["color"] });

  assert.throws(
    () => source.facet({
      field: "group",
      scales: { color: "independent" },
      guides: { legend: "shared" }
    }),
    /incompatible (color legend config|resolved legend scale)/
  );
  assert.equal(source.compositionSpec, undefined);
  assert.ok(source.graphicSpec.objects.colorLegendSymbols);
});

import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveConcreteGraphicBounds } from
  "../../../../src/grammar/schemas/graphicBounds.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
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
    background: "colorLegendBackground",
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
      .createLegend({ channels: ["color"], border: true })
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

function facetPlotUnion(program) {
  const bounds = program.compositionSpec.children.map(id => {
    const child = resolveGraphicBounds(program.children[id]);
    const canvas = program.graphicSpec.objects[namespaceGraphicId(
      `${program.compositionSpec.id}-${id}`,
      "canvas"
    )].properties;
    return {
      left: canvas.x + child.x,
      right: canvas.x + child.x + child.width,
      top: canvas.y + child.y,
      bottom: canvas.y + child.y + child.height
    };
  });
  return {
    left: Math.min(...bounds.map(value => value.left)),
    right: Math.max(...bounds.map(value => value.right)),
    top: Math.min(...bounds.map(value => value.top)),
    bottom: Math.max(...bounds.map(value => value.bottom))
  };
}

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
    if (family.background !== undefined) {
      assert.equal(
        owner.children.includes(family.background),
        true,
        `${family.name} background`
      );
      assert.equal(
        owner.children.indexOf(family.background) <
          owner.children.indexOf(family.root),
        true,
        `${family.name} background order`
      );
    }
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

test("preserves the configured shared legend edge and horizontal alignment", () => {
  const cases = [
    { position: "right", align: "center" },
    { position: "left", align: "center" },
    { position: "top", align: "left" },
    { position: "bottom", align: "right" }
  ];
  for (const { position, align } of cases) {
    const source = pointBase()
      .editCanvas({
        width: 700,
        height: 500,
        margin: { top: 140, right: 220, bottom: 140, left: 220 }
      })
      .encodeColor({ field: "category" })
      .createLegend({
        channels: ["color"],
        position,
        align,
        direction: ["right", "left"].includes(position)
          ? "vertical"
          : "horizontal"
      });
    const faceted = source.facet({
      field: "group",
      columns: 1,
      guides: { legend: "shared" }
    });
    const owner = resolveConcreteGraphicBounds(
      faceted.graphicSpec,
      "facet-shared-legend"
    );
    const plot = facetPlotUnion(faceted);

    assert.equal(faceted.guideConfigs.legend.color.position, position);
    assert.equal(faceted.guideConfigs.legend.color.align, align);
    if (position === "right") assert.ok(owner.left > plot.right);
    if (position === "left") assert.ok(owner.right < plot.left);
    if (position === "top") {
      assert.ok(owner.bottom < plot.top);
      assert.equal(owner.left, plot.left);
    }
    if (position === "bottom") {
      assert.ok(owner.top > plot.bottom);
      assert.equal(owner.right, plot.right);
    }
    assert.equal(
      faceted.graphicSpec.objects.canvas.properties.width,
      ["top", "bottom"].includes(position) ? 700 : 850
    );
  }
});

test("keeps a bottom shared legend below the plot after facet layout edits", () => {
  const source = pointBase()
    .editCanvas({
      height: 360,
      margin: { top: 60, right: 100, bottom: 110, left: 60 }
    })
    .encodeColor({ field: "category" })
    .createLegend({
      channels: ["color"],
      position: "bottom",
      direction: "horizontal"
    });
  const faceted = source.facet({
    field: "group",
    columns: 1,
    guides: { legend: "shared" }
  });
  const edited = faceted.editCompositionLayout({ gap: 24, padding: 8 });
  const owner = resolveConcreteGraphicBounds(
    edited.graphicSpec,
    "facet-shared-legend"
  );

  assert.equal(edited.guideConfigs.legend.color.position, "bottom");
  assert.ok(owner.top > facetPlotUnion(edited).bottom);
  assert.equal(faceted.graphicSpec.objects.canvas.properties.width, 500);
  assert.equal(edited.graphicSpec.objects.canvas.properties.width, 516);
});

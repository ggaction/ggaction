import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

function createPointProgram(
  id = "points",
  data = "cars",
  values = [
    { origin: "USA" },
    { origin: "Japan" },
    { origin: "USA" }
  ]
) {
  return chart()
    .createData({ id: data, values })
    .createPointMark({ id });
}

test("encodes nominal values with an automatic ordinal color scale", () => {
  const before = createPointProgram();
  const program = before.encodeColor({ field: "origin" });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.color, {
    field: "origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "color", type: "ordinal", domain: "auto", range: "auto" }
  ]);
  assert.deepEqual(program.resolvedScales.color.domain, ["USA", "Japan"]);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(child => child.properties.fill),
    ["#4c78a8", "#f58518", "#4c78a8"]
  );
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);
});

test("records color encoding through explicit nested actions", () => {
  const program = createPointProgram().encodeColor({ field: "origin" });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "encodeColor");
  assert.deepEqual(
    node.children.map(child => child.op),
    [
      "editSemantic",
      "editSemantic",
      "editSemantic",
      "createScale",
      "rematerializeScale",
      "rematerializePointMark"
    ]
  );
  assert.deepEqual(
    node.children.at(-1).children.map(child => child.op),
    ["editGraphics"]
  );
});

test("supports explicit color domains, ranges, and palette descriptors", () => {
  const explicit = createPointProgram().encodeColor({
    field: "origin",
    scale: {
      domain: ["USA", "Japan"],
      range: ["navy", "green"]
    }
  });
  const palette = createPointProgram().encodeColor({
    field: "origin",
    scale: { range: { palette: "tableau10" } }
  });
  const paletteAlias = createPointProgram().encodeColor({
    field: "origin",
    scale: { palette: "tableau10" }
  });
  const topLevelPalette = createPointProgram().encodeColor({
    field: "origin",
    palette: "tableau10"
  });

  assert.deepEqual(explicit.resolvedScales.color.range, ["navy", "green"]);
  assert.deepEqual(palette.semanticSpec.scales[0].range, {
    palette: "tableau10"
  });
  assert.deepEqual(paletteAlias.semanticSpec.scales[0].range, {
    palette: "tableau10"
  });
  assert.deepEqual(topLevelPalette.semanticSpec.scales[0].range, {
    palette: "tableau10"
  });
  assert.throws(
    () => createPointProgram().encodeColor({
      field: "origin",
      palette: "tableau10",
      scale: { range: ["red", "blue"] }
    }),
    /cannot be combined/
  );
});

test("resolves named palettes for marks and connected legends", () => {
  const program = chart()
    .createCanvas({
      width: 400,
      height: 220,
      margin: { top: 20, right: 120, bottom: 20, left: 20 }
    })
    .createData({
      id: "cars",
      values: [
        { origin: "USA" },
        { origin: "Japan" },
        { origin: "Europe" }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeColor({
      field: "origin",
      scale: { palette: { name: "set2", count: 3 } }
    })
    .createLegend({ channels: ["color"] });

  assert.deepEqual(program.semanticSpec.scales[0].range, {
    palette: { name: "set2", count: 3 }
  });
  assert.deepEqual(program.resolvedScales.color.range, [
    "#66c2a5", "#fc8d62", "#8da0cb"
  ]);
  assert.deepEqual(program.semanticSpec.guides.legend.color, {
    scale: "color",
    title: "origin"
  });
  assert.equal(program.semanticSpec.guides.legend.series, undefined);
  assert.deepEqual(
    program.graphicSpec.objects.points.items.map(child => child.properties.fill),
    ["#66c2a5", "#fc8d62", "#8da0cb"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendSymbols.items.map(
      child => child.properties.fill
    ),
    ["#66c2a5", "#fc8d62", "#8da0cb"]
  );

  const reversed = program.editScale({ id: "color", reverse: true });
  assert.deepEqual(reversed.resolvedScales.color.range, [
    "#8da0cb", "#fc8d62", "#66c2a5"
  ]);
  assert.deepEqual(
    reversed.graphicSpec.objects.points.items.map(child => child.properties.fill),
    ["#8da0cb", "#fc8d62", "#66c2a5"]
  );
  assert.deepEqual(
    reversed.graphicSpec.objects.colorLegendSymbols.items.map(
      child => child.properties.fill
    ),
    ["#8da0cb", "#fc8d62", "#66c2a5"]
  );
  assert.deepEqual(program.resolvedScales.color.range, [
    "#66c2a5", "#fc8d62", "#8da0cb"
  ]);
});

test("structurally owns palette sampling options", () => {
  const extent = [0.15, 0.85];
  const program = createPointProgram().encodeColor({
    field: "origin",
    scale: { palette: { name: "viridis", count: 2, extent } }
  });
  extent[0] = 0.75;

  assert.deepEqual(program.semanticSpec.scales[0].range, {
    palette: { name: "viridis", count: 2, extent: [0.15, 0.85] }
  });
  assert.equal(Object.isFrozen(
    program.semanticSpec.scales[0].range.palette.extent
  ), true);
});

test("combines every consumer of a shared color scale", () => {
  const first = createPointProgram("points", "cars", [{ origin: "USA" }])
    .encodeColor({ field: "origin" })
    .createData({ id: "other", values: [{ origin: "Europe" }] })
    .createPointMark({ id: "otherPoints" });
  const program = first.encodeColor({ field: "origin" });

  assert.deepEqual(program.resolvedScales.color.domain, ["USA", "Europe"]);
  assert.equal(
    program.graphicSpec.objects.points.items[0].properties.fill,
    "#4c78a8"
  );
  assert.equal(
    program.graphicSpec.objects.otherPoints.items[0].properties.fill,
    "#f58518"
  );
});

test("encodes quantitative and temporal point color through sequential scales", () => {
  const quantitative = createPointProgram(
    "points",
    "cars",
    [{ value: 8 }, { value: 24.8 }]
  ).encodeColor({ field: "value", fieldType: "quantitative" });
  const temporal = createPointProgram(
    "points",
    "events",
    [{ date: "2020-01-01" }, { date: "2021-01-01" }]
  ).encodeColor({
    field: "date",
    fieldType: "temporal",
    scale: { range: ["#000000", "#ffffff"], interpolate: "lab" }
  });

  assert.deepEqual(quantitative.semanticSpec.layers[0].encoding.color, {
    field: "value",
    fieldType: "quantitative",
    scale: "color"
  });
  assert.deepEqual(quantitative.semanticSpec.scales[0], {
    id: "color",
    type: "sequential",
    domain: "auto",
    range: { palette: { name: "viridis" } },
    interpolate: "rgb"
  });
  assert.deepEqual(quantitative.resolvedScales.color.domain, [8, 24.8]);
  assert.deepEqual(
    quantitative.graphicSpec.objects.points.items.map(child => child.properties.fill),
    ["#440154", "#fde725"]
  );
  assert.equal(temporal.resolvedScales.color.type, "sequential");
  assert.deepEqual(
    temporal.graphicSpec.objects.points.items.map(child => child.properties.fill),
    ["#000000", "#ffffff"]
  );
});

test("supports continuous palette extent, interpolation, and reversal", () => {
  const program = createPointProgram(
    "points",
    "cars",
    [{ value: 0 }, { value: 5 }, { value: 10 }]
  ).encodeColor({
    field: "value",
    fieldType: "quantitative",
    scale: {
      palette: { name: "viridis", extent: [0.2, 0.8] },
      interpolate: "hcl",
      reverse: true,
      clamp: true
    }
  });

  assert.equal(program.resolvedScales.color.interpolate, "hcl");
  assert.equal(program.resolvedScales.color.clamp, true);
  assert.equal(program.semanticSpec.scales[0].reverse, true);
  assert.equal(
    program.graphicSpec.objects.points.items[0].properties.fill,
    program.resolvedScales.color.range[0]
  );
  assert.equal(
    program.graphicSpec.objects.points.items[2].properties.fill,
    program.resolvedScales.color.range.at(-1)
  );
});

test("rematerializes every point consumer of one sequential color scale", () => {
  const values = [{ value: 0 }, { value: 5 }, { value: 10 }];
  const shared = chart()
    .createCanvas({ width: 200, height: 160, margin: 20 })
    .createData({ id: "cars", values })
    .createPointMark({ id: "first" })
    .encodeColor({
      target: "first",
      field: "value",
      fieldType: "quantitative",
      scale: { id: "sharedColor" }
    })
    .createPointMark({ id: "second" })
    .encodeColor({
      target: "second",
      field: "value",
      fieldType: "quantitative",
      scale: { id: "sharedColor" }
    });
  const before = shared.graphicSpec.objects.first.items[0].properties.fill;
  const reversed = shared.editScale({ id: "sharedColor", reverse: true });
  assert.notEqual(
    reversed.graphicSpec.objects.first.items[0].properties.fill,
    before
  );
  assert.deepEqual(
    reversed.graphicSpec.objects.first.items.map(child => child.properties.fill),
    reversed.graphicSpec.objects.second.items.map(child => child.properties.fill)
  );
});

test("validates color encoding inputs", () => {
  const program = createPointProgram();

  assert.throws(() => program.encodeColor(), /field must be a non-empty string/i);
  assert.throws(
    () => program.encodeColor({ field: "missing" }),
    /nominal value/
  );
  assert.throws(
    () => program.encodeColor({ field: "origin", fieldType: "quantitative" }),
    /finite number/
  );
  assert.throws(
    () => program.encodeColor({ field: "origin", fieldType: "ordinal" }),
    /Unsupported color field type/
  );
  assert.throws(
    () => program.encodeColor({ field: "origin", scale: { type: "linear" } }),
    /Unsupported color scale type/
  );
  assert.throws(
    () => program.encodeColor({
      field: "origin",
      scale: { palette: "tableau10", range: ["red"] }
    }),
    /both palette and range/
  );
  assert.throws(
    () => createPointProgram("points", "data", [{ value: 1 }]).encodeColor({
      field: "value",
      fieldType: "quantitative",
      layout: "stack"
    }),
    /does not support layout/
  );
  assert.throws(
    () => createPointProgram("points", "data", [{ value: 1 }]).encodeColor({
      field: "value",
      fieldType: "quantitative",
      scale: { interpolate: "RGB" }
    }),
    /Unsupported continuous color interpolation/
  );
});

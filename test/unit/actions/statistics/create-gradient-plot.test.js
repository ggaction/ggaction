import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { createGradientPlotPaint } from
  "../../../../src/actions/gradientPlots/paint.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", value: 1 }),
  Object.freeze({ group: "A", value: 2 }),
  Object.freeze({ group: "A", value: 3 }),
  Object.freeze({ group: "B", value: 2 }),
  Object.freeze({ group: "B", value: 4 }),
  Object.freeze({ group: "B", value: 6 })
]);

function base() {
  return chart()
    .createCanvas({
      width: 420,
      height: 320,
      margin: { top: 40, right: 90, bottom: 60, left: 60 }
    })
    .createData({ id: "rows", values: rows });
}

test("creates one gradient strip and center rule per category", () => {
  const program = base().createGradientPlot({
    x: { field: "group", fieldType: "nominal" },
    y: { field: "value" },
    density: { bandwidth: 0.5, steps: 8 },
    guides: false
  });

  assert.equal(program.graphicSpec.objects.gradientPlot.items.length, 2);
  assert.equal(program.graphicSpec.objects.gradientPlotCenter.items.length, 2);
  assert.equal(
    program.graphicSpec.objects.gradientPlot.items.every(item =>
      item.properties.fill.type === "linear-gradient" &&
      item.properties.strokeWidth === 0
    ),
    true
  );
  assert.deepEqual(program.semanticSpec.layers.map(layer => layer.id), [
    "gradientPlot",
    "gradientPlotCenter"
  ]);
});

test("infers compatible encoded positions from the current layer", () => {
  const encoded = base()
    .createPointMark()
    .encodeX({ field: "group", fieldType: "nominal" })
    .encodeY({ field: "value" });
  const program = encoded.createGradientPlot({
    density: { bandwidth: 0.5, steps: 8 },
    guides: false
  });

  assert.equal(program.graphicSpec.objects.gradientPlot.items.length, 2);
  assert.equal(program.semanticSpec.scales.find(scale => scale.id === "x").type, "band");
  assert.equal(program.markConfigs.gradientPlot.gradientPlot.source, "rows");
});

test("converges when compatible encodings arrive after the owner", () => {
  const pending = base().createGradientPlot({
    density: { bandwidth: 0.5, steps: 8 },
    guides: false
  });
  assert.equal(pending.graphicSpec.objects.gradientPlot.items.length, 0);
  assert.equal(pending.markConfigs.gradientPlot.gradientPlot.materialized, false);

  const program = pending
    .encodeX({
      target: "gradientPlot",
      field: "group",
      fieldType: "nominal"
    })
    .encodeY({ target: "gradientPlot", field: "value" });
  assert.equal(program.graphicSpec.objects.gradientPlot.items.length, 2);
  assert.equal(program.markConfigs.gradientPlot.gradientPlot.materialized, true);
});

test("applies categorical color after profile materialization", () => {
  const program = base()
    .createGradientPlot({
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: 0.5, steps: 8 },
      guides: false
    })
    .encodeColor({
      target: "gradientPlot",
      field: "group",
      palette: "tableau10"
    });
  const colors = program.graphicSpec.objects.gradientPlot.items.map(
    item => item.properties.fill.stops.at(-1).color
  );

  assert.equal(new Set(colors).size, 2);
  assert.notEqual(colors[0], colors[1]);
  assert.equal(program.semanticSpec.layers[0].encoding.color.scale, "color");
});

test("reverses the concrete gradient direction with the value scale", () => {
  const normal = base().createGradientPlot({
    x: { field: "group", fieldType: "nominal" },
    y: { field: "value" },
    density: { bandwidth: 0.5, steps: 8 },
    guides: false
  });
  const reversed = normal.editScale({ id: "y", reverse: true });
  const normalFill = normal.graphicSpec.objects.gradientPlot.items[0].properties.fill;
  const reversedFill = reversed.graphicSpec.objects.gradientPlot.items[0].properties.fill;

  assert.deepEqual(reversedFill.from, normalFill.to);
  assert.deepEqual(reversedFill.to, normalFill.from);
  assert.deepEqual(reversedFill.stops, normalFill.stops);
});

test("normalizes gradient stops across the full finite position range", () => {
  const maximum = Number.MAX_VALUE;
  const fill = createGradientPlotPaint({
    values: [-maximum, 0, maximum],
    intensities: [1, 2, 1]
  }, {
    orientation: "vertical",
    valueScale: {
      type: "linear",
      domain: [-maximum, maximum],
      range: [-maximum, maximum]
    },
    intensityDomain: [0, 2],
    palette: "viridis",
    opacity: [0.1, 1]
  });

  assert.deepEqual(fill.stops.map(stop => stop.offset), [0, 0.5, 1]);
});

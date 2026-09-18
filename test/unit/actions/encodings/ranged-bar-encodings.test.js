import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const rows = Object.freeze([
  Object.freeze({ group: "A", lower: 2, upper: 6, middle: 4 }),
  Object.freeze({ group: "B", lower: 4, upper: 8, middle: 5 })
]);

function rangedBar() {
  return chart()
    .createCanvas({ width: 150, height: 150 })
    .createData({ values: rows })
    .createBarMark({ id: "range" })
    .encodeX({ target: "range", field: "group", fieldType: "nominal" })
    .encodeY({ target: "range", field: "lower" })
    .encodeY2({ target: "range", field: "upper" })
    .encodeBarWidth({ target: "range", band: 0.5 });
}

test("materializes vertical ranged bars with the implicit default band", () => {
  const options = { lower: "lower", upper: "upper" };
  const snapshot = structuredClone(options);
  const base = chart()
    .createCanvas({ width: 150, height: 150 })
    .createData({ values: rows })
    .createBarMark({ id: "range" })
    .encodeX({ target: "range", field: "group", fieldType: "ordinal" });
  const ranged = base.encodeYRange({ target: "range", ...options });
  const resized = ranged.editCanvas({ width: 250 });

  assert.equal(base.graphicSpec.objects.range.items.length, 0);
  assert.equal(ranged.graphicSpec.objects.range.items.length, rows.length);
  assert.deepEqual(
    ranged.graphicSpec.objects.range.items.map(item => item.properties.width),
    ranged.graphicSpec.objects.range.items.map(
      () => ranged.resolvedScales.x.bandwidth * 0.72
    )
  );
  assert.notDeepEqual(
    resized.graphicSpec.objects.range.items.map(item => item.properties.width),
    ranged.graphicSpec.objects.range.items.map(item => item.properties.width)
  );
  assert.equal(ranged.markConfigs.range?.barWidth, undefined);
  assert.deepEqual(options, snapshot);
});

test("materializes horizontal ranged bars before an explicit width assignment", () => {
  const ranged = chart()
    .createCanvas({ width: 180, height: 160 })
    .createData({ values: rows })
    .createBarMark({ id: "range" })
    .encodeY({ target: "range", field: "group", fieldType: "nominal" })
    .encodeXRange({ target: "range", lower: "lower", upper: "upper" });
  const fixed = ranged.encodeBarWidth({ target: "range", pixels: 18 });
  const resized = fixed.editCanvas({ height: 260 });

  assert.equal(ranged.graphicSpec.objects.range.items.length, rows.length);
  assert.deepEqual(
    ranged.graphicSpec.objects.range.items.map(item => item.properties.height),
    ranged.graphicSpec.objects.range.items.map(
      () => ranged.resolvedScales.y.bandwidth * 0.72
    )
  );
  assert.deepEqual(
    fixed.graphicSpec.objects.range.items.map(item => item.properties.height),
    [18, 18]
  );
  assert.deepEqual(
    resized.graphicSpec.objects.range.items.map(item => item.properties.height),
    [18, 18]
  );
});

test("materializes a nominal-category ranged bar and removes stale aggregate state", () => {
  const program = rangedBar();
  const layer = program.semanticSpec.layers[0];
  const rectangles = program.graphicSpec.objects.range.items;

  assert.equal(layer.encoding.y.aggregate, undefined);
  assert.equal(layer.encoding.y.stack, undefined);
  assert.equal(layer.encoding.y2.field, "upper");
  assert.equal(rectangles.length, 2);
  assert.deepEqual(
    rectangles.map(rect => rect.properties.width),
    rectangles.map(() => program.resolvedScales.x.bandwidth * 0.5)
  );
  assert.ok(rectangles.every(rect => rect.properties.height > 0));
  assert.deepEqual(rectangles.map(rect => rect.properties.opacity), [1, 1]);
});

test("uses encoded ranged-bar fills as implicit strokes", () => {
  const colored = rangedBar().encodeColor({
    target: "range",
    field: "group",
    fieldType: "nominal",
    scale: { palette: "tableau10" }
  });
  const rectangles = colored.graphicSpec.objects.range.items;

  assert.deepEqual(
    rectangles.map(rect => rect.properties.stroke),
    rectangles.map(rect => rect.properties.fill)
  );
});

test("supports atomic range encoding, pixel width, and Canvas rematerialization", () => {
  const base = chart()
    .createCanvas({ width: 150, height: 150 })
    .createData({ values: rows })
    .createBarMark({ id: "range" })
    .encodeX({ target: "range", field: "group", fieldType: "ordinal" });
  const ranged = base
    .encodeYRange({ target: "range", lower: "lower", upper: "upper" })
    .encodeBarWidth({ target: "range", pixels: 18 });
  const resized = ranged.editCanvas({ width: 250 });

  assert.deepEqual(
    ranged.trace.children.at(-2).children.filter(node => node.op !== "editSemantic").map(node => node.op),
    ["encodeY", "encodeY2"]
  );
  assert.deepEqual(
    ranged.graphicSpec.objects.range.items.map(rect => rect.properties.width),
    [18, 18]
  );
  assert.deepEqual(
    resized.graphicSpec.objects.range.items.map(rect => rect.properties.width),
    [18, 18]
  );
  assert.notDeepEqual(
    resized.graphicSpec.objects.range.items.map(rect => rect.properties.x),
    ranged.graphicSpec.objects.range.items.map(rect => rect.properties.x)
  );
});

test("spans a median rule across the rematerialized box body", () => {
  const body = rangedBar();
  let program = body
    .createRuleMark({ id: "median", data: "data" })
    .encodeX({ target: "median", field: "group", fieldType: "nominal", scale: { id: "x" } })
    .encodeY({ target: "median", field: "middle", fieldType: "quantitative", scale: { id: "y" } });
  program = program
    ._withMarkConfig("median", {
      ...program.materializationConfigs.marks.median,
      boxSpanOwner: "range"
    })
    .rematerializeRuleMark({ id: "median" });

  const rectangles = program.graphicSpec.objects.range.items;
  const medians = program.graphicSpec.objects.median.items;
  assert.deepEqual(
    medians.map(line => [line.properties.x1, line.properties.x2]),
    rectangles.map(rect => [rect.properties.x, rect.properties.x + rect.properties.width])
  );

  const resized = program.editCanvas({ width: 250 });
  assert.deepEqual(
    resized.graphicSpec.objects.median.items.map(line => [line.properties.x1, line.properties.x2]),
    resized.graphicSpec.objects.range.items.map(rect => [
      rect.properties.x,
      rect.properties.x + rect.properties.width
    ])
  );
});

for (const vertical of [true, false]) {
  for (const widthFirst of [true, false]) {
    for (const timestamps of [true, false]) {
      test(`temporal ranged bars preserve uneven intervals (${vertical ? "vertical" : "horizontal"}, width ${widthFirst ? "first" : "last"}, ${timestamps ? "timestamps" : "ISO"})`, () => {
        const dates = ["2024-01-05", "2024-01-08", "2024-01-09"];
        const values = dates.map((date, index) => ({
          date: timestamps ? Date.parse(date) : date, lower: index + 1, upper: index + 3
        }));
        let p = chart().createCanvas({ width: 500, height: 500, margin: 50 })
          .createData({ values }).createBarMark({ id: "range" });
        if (widthFirst) p = p.encodeBarWidth({ pixels: 5 });
        const encoding = { field: "date", fieldType: "temporal",
          ...(timestamps ? { temporalUnit: "timestamp" } : {}),
          scale: { domain: dates.map(Date.parse).filter((_, index) => index !== 1), nice: false } };
        p = vertical ? p.encodeX(encoding) : p.encodeY(encoding);
        const interval = { lower: "lower", upper: "upper", scale: { domain: [0, 5], nice: false } };
        p = vertical ? p.encodeYRange(interval) : p.encodeXRange(interval);
        if (!widthFirst) p = p.encodeBarWidth({ pixels: 5 });
        const inspect = program => {
          const props = program.graphicSpec.objects.range.items.map(item => item.properties);
          assert.deepEqual(props.map(item => vertical ? item.width : item.height), [5, 5, 5]);
          const centers = props.map(item => vertical ? item.x + item.width / 2 : item.y + item.height / 2);
          assert.ok(Math.abs((centers[1] - centers[0]) / (centers[2] - centers[1]) - 3) < 1e-9);
          assert.ok(props.every(item => Number.isFinite(item.x) && Number.isFinite(item.y) && item.width > 0 && item.height > 0));
          return props;
        };
        const original = inspect(p);
        assert.deepEqual(original.map(item => vertical ? item.height : item.width), [160, 160, 160]);
        inspect(p.editCanvas({ width: 600, height: 600 }));
        inspect(vertical ? p.editXScale({ reverse: true }) : p.editYScale({ reverse: true }));
        const restored = deserializeProgram(serializeProgram(p));
        assert.deepEqual(inspect(restored), original);
        assert.match(renderToSVG(restored), /<rect/u);
        const revised = p.reviseData({ source: "data", id: "updated", values: values.map(row => ({ ...row, lower: row.lower + 0.5 })) });
        assert.deepEqual(inspect(revised).map(item => vertical ? item.height : item.width), [120, 120, 120]);
        assert.deepEqual(inspect(p), original);
      });
    }
  }
}

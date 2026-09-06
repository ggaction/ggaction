import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const longRows = [
  { dimension: "speed", value: 0.4, series: "A" },
  { dimension: "quality", value: 0.8, series: "A" },
  { dimension: "cost", value: 0.6, series: "A" },
  { dimension: "speed", value: 0.7, series: "B" },
  { dimension: "quality", value: 0.5, series: "B" },
  { dimension: "cost", value: 0.9, series: "B" }
];
const order = ["speed", "quality", "cost"];

function base(values = longRows) {
  return chart()
    .createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "source", values });
}

test("creates a long-form Radar plot through the Polar line owner", () => {
  const actual = base().createRadarPlot({
    id: "radar",
    category: "dimension",
    value: { field: "value", scale: { domain: [0, 1], zero: true } },
    groupBy: "series",
    order,
    color: "series",
    line: { strokeWidth: 2.5 },
    guides: false
  });
  const expected = base().createPolarLinePlot({
    id: "radar",
    theta: {
      field: "dimension",
      fieldType: "nominal",
      scale: { domain: order }
    },
    radius: {
      field: "value",
      fieldType: "quantitative",
      scale: { domain: [0, 1], zero: true }
    },
    groupBy: "series",
    color: "series",
    line: { strokeWidth: 2.5, closed: true },
    guides: false
  });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  const facade = actual.trace.children.at(-1);
  assert.equal(facade.op, "createRadarPlot");
  assert.equal(facade.children[0].op, "createPolarLinePlot");
  assert.equal(actual.graphicSpec.objects.radar.items.every(item =>
    item.properties.commands.at(-1).op === "Z"
  ), true);
});

test("folds explicit wide fields with deterministic owned aliases", () => {
  const wideRows = [
    { product: "A", speed: 0.4, quality: 0.8, cost: 0.6 },
    { product: "B", speed: 0.7, quality: 0.5, cost: 0.9 }
  ];
  const actual = base(wideRows).createRadarPlot({
    id: "wideRadar",
    wide: { fields: order },
    groupBy: "product",
    color: "product",
    guides: false
  });
  const expected = base(wideRows)
    .createFoldData({
      id: "wideRadarFoldData",
      source: "source",
      fields: order,
      as: { key: "wideRadarDimension", value: "wideRadarValue" }
    })
    .createPolarLinePlot({
      id: "wideRadar",
      data: "wideRadarFoldData",
      theta: {
        field: "wideRadarDimension",
        fieldType: "nominal",
        scale: { domain: order }
      },
      radius: { field: "wideRadarValue", fieldType: "quantitative" },
      groupBy: ["product"],
      color: "product",
      line: { closed: true },
      guides: false
    });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(actual.trace.children.at(-1).children.map(node => node.op), [
    "createFoldData", "createPolarLinePlot"
  ]);
});

test("supports one wide row without inventing a series identifier", () => {
  const program = base([{ speed: 1, quality: 2, cost: 3 }]).createRadarPlot({
    wide: {
      fields: order,
      as: { key: "metric", value: "score" }
    },
    order: ["quality", "cost", "speed"],
    guides: false
  });
  assert.equal(program.semanticSpec.layers[0].encoding.group, undefined);
  assert.deepEqual(program.resolvedScales.theta.domain, ["quality", "cost", "speed"]);
});

test("uses long-form appearance fields as series identity when groupBy is omitted", () => {
  const program = base().createRadarPlot({
    category: "dimension",
    value: "value",
    order,
    color: "series",
    strokeDash: { field: "series" },
    guides: false
  });
  assert.equal(program.graphicSpec.objects.radarPlot.items.length, 2);
  assert.equal(program.graphicSpec.objects.radarPlot.items.every(item =>
    item.properties.commands.at(-1).op === "Z"
  ), true);
});

test("rejects incomplete, duplicate, nonfinite, and ambiguous Radar rows atomically", () => {
  const invalidRows = [
    longRows.filter(row => !(row.series === "B" && row.dimension === "cost")),
    [...longRows, { dimension: "cost", value: 0.2, series: "B" }],
    longRows.map((row, index) => index === 0 ? { ...row, value: Number.NaN } : row)
  ];
  for (const rows of invalidRows) {
    const source = base(rows);
    const before = JSON.stringify(source);
    assert.throws(() => source.createRadarPlot({
      category: "dimension", value: "value", groupBy: "series", order
    }));
    assert.equal(JSON.stringify(source), before);
  }
  assert.throws(
    () => base().createRadarPlot({
      category: "dimension", value: "value", groupBy: "series",
      order: ["speed", "quality", "unknown"]
    }),
    /every category exactly once/
  );
  assert.throws(
    () => base().createRadarPlot({
      category: "dimension", value: "value", groupBy: "series",
      line: { closed: false }
    }),
    /requires a closed line/
  );
  assert.throws(
    () => base([{ product: "A", speed: 1, quality: 2, cost: 3 },
      { product: "B", speed: 2, quality: 3, cost: 4 }]).createRadarPlot({
      wide: { fields: order }
    }),
    /require groupBy/
  );
  for (const partial of [{ category: "dimension" }, { value: "value" }]) {
    assert.throws(
      () => base([{ speed: 1, quality: 2, cost: 3 }]).createRadarPlot({
        wide: { fields: order },
        ...partial
      }),
      /but not both/
    );
  }
  assert.throws(
    () => base().createRadarPlot({
      category: "dimension", value: "value", color: "series",
      strokeDash: { field: "dimension" }
    }),
    /must match unless groupBy/
  );
});

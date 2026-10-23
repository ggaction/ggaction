import assert from "node:assert/strict";
import test from "node:test";
import { chart, render } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveRegression } from "../../../../src/grammar/regression/index.js";
import { createCanvas } from "@napi-rs/canvas";
import { referenceExponentialFit } from "../../../oracles/exponential-regression.js";

const rows = Object.freeze([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 8 }].map(Object.freeze));
const fit = (values = rows, options = {}) => chart().createData({ id: "raw", values })
  .createRegressionData({ id: "fit", x: "x", y: "y", method: "exp", ...options });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 2e-13 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("exponential regression uses response-weighted log least squares and positive predictions", () => {
  const reference = referenceExponentialFit(rows);
  close(reference.rate, 1.0187593831383577);
  close(reference.amplitude, 1.0490780630894248);
  const result = deriveRegression(rows, { x: "x", y: "y", method: "exp" });
  assert.deepEqual(result.parameters, { method: "exp", interval: false });
  close(result.models[0].rate, reference.rate);
  close(result.models[0].amplitude, reference.amplitude);
  result.values.forEach(row => close(row.y, reference.predict(row.x)));
  assert.notEqual(result.models[0].rate, (Math.log(8) - Math.log(1)) / 2);
  assert.deepEqual(result.fields, { x: "x", y: "y" });
  assert.ok(result.values.every(row => row.y > 0 && Object.keys(row).length === 2));
  assert.deepEqual(fit().semanticSpec.datasets[0].values, rows);
});

test("exponential prediction grids, typed groups and missing policies preserve every eligible observation", () => {
  const values = [
    { x: null, y: 0, group: "discard" },
    { x: 0, y: 2, group: false }, { x: 1, y: 4, group: false },
    { x: 0, y: 3, group: "false" }, { x: 1, y: 9, group: "false" }
  ];
  const program = fit(values, { groupBy: "group", missing: "drop", predict: { domain: [0, 1], steps: 5 } });
  const output = program.semanticSpec.datasets.at(-1).values;
  assert.deepEqual(output.map(row => row.group), [...Array(5).fill(false), ...Array(5).fill("false")]);
  output.forEach(row => close(row.y, row.group === false ? 2 * 2 ** row.x : 3 * 3 ** row.x));
  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
  assert.throws(() => fit(values, { missing: "error" }), /missing/);
});

test("exponential fitting scales response weights and full-range predictors without changing the estimator", () => {
  for (const factor of [1e-300, 1, 1e300]) {
    const program = fit([{ x: -1, y: factor * .5 }, { x: 0, y: factor }, { x: 1, y: factor * 2 }]);
    program.semanticSpec.datasets.at(-1).values.forEach(row => {
      const ratio = row.y / factor;
      close(ratio, 2 ** row.x);
    });
  }
  const program = fit([{ x: -1e308, y: .5 }, { x: 0, y: 1 }, { x: 1e308, y: 2 }]);
  const output = program.semanticSpec.datasets.at(-1).values;
  output.forEach((row, i) => close(row.y, [.5, 1, 2][i]));
});

test("exponential failures reject invalid responses, incompatible options and unrepresentable values atomically", () => {
  const parent = chart().createData({ values: rows });
  const snapshot = serializeProgram(parent);
  for (const option of [{ interval: "mean" }, { interval: "prediction" }, { degree: 2 }, { span: .5 },
    { robustIterations: 0 }, { confidenceMethod: "normal" }, { level: .95 }, { confidence: .95 }]) {
    assert.throws(() => parent.createRegressionData({ id: "bad", x: "x", y: "y", method: "exp", ...option }));
    assert.equal(serializeProgram(parent), snapshot);
  }
  for (const values of [[{ x: 1, y: 1 }], [{ x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 0, y: -1 }, { x: 1, y: 1 }],
    [{ x: 0, y: Infinity }, { x: 1, y: 1 }],
    [{ x: 1000, y: 1 }, { x: 1001, y: Math.E }]]) assert.throws(() => fit(values));
  assert.throws(() => fit(rows, { predict: { values: [10000] } }), /finite/);
  assert.throws(() => fit(rows, { predict: { values: [-10000] } }), /positive/);
  assert.equal(typeof basicChart().createRegressionData, "undefined");
});

test("exponential facades suppress bands, support transitions and remain renderer-neutral", () => {
  const source = chart().createCanvas({ width: 500, height: 350, margin: 70 }).createData({ id: "raw", values: rows });
  const program = source.createRegressionPlot({ x: "x", y: "y", method: "exp", guides: false });
  assert.equal(program.semanticSpec.layers.length, 2);
  assert.equal(program.markConfigs.regressionPlot.regression.bandId, undefined);
  assert.throws(() => source.createRegressionPlot({ x: "x", y: "y", method: "exp", band: {} }), /band/);
  const linear = program.editRegression({ method: "linear" });
  assert.ok(linear.markConfigs.regressionPlot.regression.bandId);
  const again = linear.editRegression({ method: "exp" });
  assert.equal(again.markConfigs.regressionPlot.regression.bandId, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(again)).graphicSpec, again.graphicSpec);
  const context = createCanvas(500, 350).getContext("2d");
  render(again, context);
  assert.ok(context.getImageData(0, 0, 500, 350).data.some((byte, i, pixels) => i % 4 !== 3 && byte < 200 && pixels[i - i % 4 + 3] > 0));
  assert.match(renderToSVG(again), /<path/);
  const updated = again.reviseData({ source: "raw", id: "newRows", values: rows.map(row => ({ ...row, y: row.y * 2 })) });
  assert.deepEqual(updated.semanticSpec.datasets.find(dataset => dataset.id === "raw").values, rows);
});

test("exponential data edits clear inherited interval settings and replay downstream consumers", () => {
  const linear = chart().createData({ values: rows }).createRegressionData({ id: "fit", x: "x", y: "y" });
  const exponential = linear.editRegressionData({ target: "fit", method: "exp" });
  const current = exponential.materializationConfigs.data.regression.fit.current;
  assert.deepEqual(exponential.semanticSpec.datasets.find(dataset => dataset.id === current).transform[0],
    { type: "regression", method: "exp", x: "x", y: "y", interval: false });
  const explicit = exponential.editRegressionData({ target: "fit", predict: { values: [.25, .5, .75] } });
  const output = explicit.semanticSpec.datasets.at(-1).values;
  output.forEach(row => close(row.y, referenceExponentialFit(rows).predict(row.x)));
  assert.deepEqual(deserializeProgram(serializeProgram(explicit)).semanticSpec, explicit.semanticSpec);
});

test("exponential public curves match independently drawn primitive Canvas pixels and SVG coordinates", () => {
  const steps = 41;
  const program = chart().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: Math.E }] })
    .createScatterPlot({ x: { field: "x", scale: { domain: [0, 1] } }, y: { field: "y", scale: { domain: [0, 3] } }, point: { opacity: 0 }, guides: false })
    .createRegression({ method: "exp", predict: { domain: [0, 1], steps }, line: { strokeWidth: 1 } });
  const coordinates = Array.from({ length: steps }, (_, i) => {
    const x = i / (steps - 1);
    return { x: 50 + 300 * x, y: 250 - 200 * Math.exp(x) / 3 };
  });
  const commands = program.graphicSpec.objects.scatterPlotRegressionLines.items[0].properties.commands;
  commands.forEach((command, i) => { close(command.x, coordinates[i].x); close(command.y, coordinates[i].y); });
  const primitive = createCanvas(400, 300).getContext("2d");
  primitive.fillStyle = "#ffffff"; primitive.fillRect(0, 0, 400, 300);
  primitive.strokeStyle = "#4c78a8"; primitive.lineWidth = 1; primitive.beginPath();
  coordinates.forEach((point, i) => i === 0 ? primitive.moveTo(point.x, point.y) : primitive.lineTo(point.x, point.y));
  primitive.stroke();
  const actual = createCanvas(400, 300).getContext("2d"); render(program, actual);
  assert.deepEqual(actual.getImageData(0, 0, 400, 300).data, primitive.getImageData(0, 0, 400, 300).data);
  const svg = renderToSVG(program);
  assert.match(svg, /stroke="#4c78a8"/);
  assert.match(svg, /<path/);
});

test("exponential following bindings and facet replay refit the same positive-response model", () => {
  const values = rows.flatMap(row => [
    { ...row, z: row.y * 2, group: "A" }, { ...row, z: row.y * 3, group: "B" }
  ]);
  const program = chart().createCanvas({ width: 500, height: 400, margin: 80 })
    .createData({ values }).createScatterPlot({ x: "x", y: "y", color: "group", guides: false })
    .createRegression({ method: "exp", sourceBinding: "follow" });
  const before = serializeProgram(program);
  const followed = program.encodeY({ target: "scatterPlot", field: "z" });
  const owner = followed.markConfigs.scatterPlot.regression;
  const result = followed.semanticSpec.datasets.find(dataset => dataset.id === owner.dataId);
  assert.equal(result.transform[0].method, "exp"); assert.equal(result.transform[0].y, "z");
  const expected = referenceExponentialFit(rows);
  result.values.forEach(row => close(row.z, expected.predict(row.x) * (row.group === "A" ? 2 : 3)));
  const faceted = program.facet({ field: "group", guides: { legend: false } });
  for (const child of Object.values(faceted.children)) {
    const config = child.markConfigs.scatterPlot.regression;
    assert.equal(config.parameters.method, "exp"); assert.equal(config.bandId, undefined);
    assert.equal(child.graphicSpec.objects[config.lineId].items.length, 1);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
  assert.equal(serializeProgram(program), before);
});

import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, render } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../../src/scene.js";
import { createMockCanvasContext } from "../../../support/canvas.js";

const values = Array.from({ length: 9 }, (_, x) => ({ x, y: x * x, z: 2 * x * x + 1 }));
const options = { x: "x", y: "y", method: "loess", degree: 2, span: 1 };
const data = (p, id) => p.semanticSpec.datasets.find(d => d.id === id);
const current = p => data(p, p.materializationConfigs.data.regression.fit.current);
const fitData = p => p.semanticSpec.datasets.findLast(d => d.transform?.[0]?.type === "regression");
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-9 * (1 + Math.max(Math.abs(a), Math.abs(b))), `${a} != ${b}`);

test("quadratic LOESS public and generic data paths preserve source and canonical provenance", () => {
  const source = chart().createData({ id: "raw", values }), before = serializeProgram(source);
  const p = source.createRegressionData({ id: "fit", ...options });
  assert.deepEqual(data(p, "fit").transform, [{ type: "regression", ...options }]);
  assert.deepEqual(p.trace.children.at(-1).children.map(node => node.op), ["createDerivedData", "materializeRegressionData"]);
  assert.deepEqual(data(p, "fit").schema.fields.map(field => [field.name, field.storageType]), [["x", "number"], ["y", "number"]]);
  const generic = source.createDerivedData({ id: "fit", source: "raw", transform: data(p, "fit").transform }).materializeRegressionData({ id: "fit" });
  assert.deepEqual(data(generic, "fit"), data(p, "fit"));
  for (const degree of [0, 3, null]) {
    assert.throws(() => source.createRegressionData({ id: "invalid", ...options, degree }), /LOESS degree/);
    assert.equal(serializeProgram(source), before);
  }
  const basic = basicChart().createData({ id: "raw", values });
  assert.equal(basic.createRegressionData, undefined);
  assert.throws(() => basic.createDerivedData({ id: "fit", source: "raw", transform: data(p, "fit").transform }), /Unsupported dataset transform/);
});

test("quadratic degree edits, mode cleanup and source revision retain immutable logical datasets", () => {
  const p = chart().createData({ id: "raw", values }).createRegressionData({ id: "fit", ...options });
  const before = serializeProgram(p), reset = p.editRegressionData({ target: "fit", degree: 1 });
  assert.equal(current(reset).transform[0].degree, undefined);
  assert.notDeepEqual(current(reset).values, data(p, "fit").values);
  const restored = deserializeProgram(serializeProgram(reset)).editRegressionData({ target: "fit", degree: 2 });
  assert.deepEqual(current(restored).values, data(p, "fit").values);
  assert.deepEqual(current(restored).rowKeys, data(p, "fit").rowKeys);
  const revised = restored.reviseData({ source: "raw", id: "next", values: values.map(row => ({ ...row, y: row.y + 5 })) });
  assert.equal(current(revised).transform[0].degree, 2);
  current(revised).values.forEach(row => close(row.y, row.x * row.x + 5));
  const polynomial = p.editRegressionData({ target: "fit", method: "polynomial", degree: 3 });
  const loess = polynomial.editRegressionData({ target: "fit", method: "loess" });
  assert.equal(current(loess).transform[0].degree, undefined);
  assert.equal(current(loess).transform[0].interval, undefined);
  const linear = p.editRegressionData({ target: "fit", method: "linear" });
  assert.equal(current(linear).transform[0].degree, undefined);
  assert.equal(current(linear).transform[0].span, undefined);
  assert.equal(current(linear).transform[0].interval, "mean");
  assert.equal(serializeProgram(p), before);
});

test("regression facade edits and restored follow-source bindings retain quadratic geometry", () => {
  const p = chart().createCanvas().createData({ id: "raw", values })
    .createRegressionPlot({ id: "points", ...options, sourceBinding: "follow", robustIterations: 2, guides: false });
  const oldSvg = renderToSVG(p), before = serializeProgram(p);
  const next = deserializeProgram(before).encodeY({ target: "points", field: "z" });
  assert.equal(next.markConfigs.points.regression.parameters.degree, 2);
  assert.equal(next.markConfigs.points.regression.parameters.robustIterations, 2);
  fitData(next).values.forEach(row => close(row.z, 2 * row.x * row.x + 1));
  assert.notEqual(renderToSVG(next), oldSvg);
  const changed = next.editRegression({ degree: 1 });
  assert.equal(fitData(changed).transform[0].degree, undefined);
  assert.notEqual(renderToSVG(changed), renderToSVG(next));
  const linear = next.editRegression({ method: "linear" });
  assert.equal(linear.markConfigs.points.regression.parameters.degree, undefined);
  assert.ok(linear.graphicSpec.objects.pointsRegressionBands);
  const quadratic = linear.editRegression({ method: "loess", degree: 2 });
  assert.equal(quadratic.graphicSpec.objects.pointsRegressionBands, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(quadratic)).graphicSpec, quadratic.graphicSpec);
  render(quadratic, createMockCanvasContext());
  assert.ok(createTransitionScene(quadratic).nodes.some(node => node.type === "path"));
  assert.equal(serializeProgram(p), before);
});

test("quadratic regressions replay per facet source partition and compose concrete graphics", () => {
  const source = chart().createCanvas().createData({ values: [
    ...values.map(row => ({ ...row, panel: "A" })), ...values.map(row => ({ ...row, y: -row.y, panel: "B" }))
  ] }).createRegressionPlot({ ...options, groupBy: "panel", guides: false });
  const faceted = source.facet({ field: "panel", columns: 2, guides: { legend: false } });
  for (const id of faceted.compositionSpec.children) {
    const fit = fitData(faceted.children[id]);
    assert.equal(fit.transform[0].degree, 2);
    const panels = new Set(fit.values.map(row => row.panel));
    assert.equal(panels.size, 1);
    fit.values.forEach(row => close(row.y, (row.panel === "A" ? 1 : -1) * row.x * row.x));
  }
  assert.match(renderToSVG(hconcat({ programs: [source, faceted] })), /<svg/);
});

test("quadratic missing data diagnostics and invalid restored degrees remain explicit", () => {
  const source = chart().createData({ id: "raw", values: [...values, { x: 9, y: null }] });
  assert.throws(() => source.createRegressionData({ id: "fit", ...options, missing: "error" }), /missing/);
  const p = source.createRegressionData({ id: "fit", ...options, missing: "drop" });
  assert.equal(p.materializationConfigs.calculations.datasets.fit.units[0].excludedRows, 1);
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(data(restored, "fit"), data(p, "fit"));
  const snapshot = serializeProgram(p), invalid = snapshot.replaceAll('["degree",2]', '["degree",3]');
  assert.notEqual(invalid, snapshot);
  assert.throws(() => deserializeProgram(invalid), /LOESS degree/);
});

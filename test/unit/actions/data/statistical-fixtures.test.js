import assert from "node:assert/strict";
import test from "node:test";
import { render } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../../src/scene.js";
import { statisticalFixtures, statisticalRevisions } from "../../../oracles/statistical-fixtures.js";
import { runStatisticalFixture, reviseStatisticalFixture, statisticalDifference } from "../../../support/statistical-fixtures.js";
import { createMockCanvasContext } from "../../../support/canvas.js";

test("numeric fixture comparisons apply both absolute and relative tolerance without hiding shape or nonfinite errors", () => {
  assert.equal(statisticalDifference([1e12 + 10], [1e12])[0].pass, true);
  assert.equal(statisticalDifference([1e-12], [0])[0].pass, true);
  for (const actual of [[NaN], [Infinity], ["1"], [], [1, 2], [3]]) {
    assert.ok(statisticalDifference(actual, [1]).some(diff => !diff.pass));
  }
});

for (const fixture of statisticalFixtures) test(`independent ${fixture.id} values, provenance and immutable consumers`, () => {
  const input = JSON.stringify(fixture), result = runStatisticalFixture(fixture);
  const { source, program, dataset, differences } = result, before = serializeProgram(program);
  assert.ok(differences.every(diff => diff.pass), JSON.stringify(differences));
  assert.deepEqual(result.contributors, fixture.contributors);
  if (fixture.secondary) assert.deepEqual(result.secondaryContributors, fixture.secondaryContributors);
  assert.equal(new Set(dataset.rowKeys).size, dataset.values.length);
  assert.equal(dataset.schema.completeness, "known");
  assert.equal(source.semanticSpec.datasets.some(data => data.id === "result"), false);
  assert.deepEqual(deserializeProgram(before).semanticSpec, program.semanticSpec);

  let canvas = program.createCanvas({ width: 240, height: 180, margin: 30 });
  const regression = dataset.transform[0].type === "regression";
  if (regression) canvas = canvas.createPointMark({ id: "observed", data: "raw" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const plot = canvas
    .createPointMark({ id: "points", data: "result", missing: "skip" })
    .encodeX({ field: fixture.fields[0] }).encodeY({ field: regression ? "y" : fixture.fields[0] })
    .selectMarks({ id: "largest", target: "points", field: fixture.fields[0], op: "max" })
    .highlightMarks({ selection: "largest", target: "points", fill: "#ff0000" });
  const svg = renderToSVG(plot, { resourceNamespace: "fixture" });
  const plotBefore = serializeProgram(plot);
  render(plot, createMockCanvasContext());
  assert.ok(createTransitionScene(plot).nodes.some(node => node.type === "circle"));
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(plot)), { resourceNamespace: "fixture" }), svg);
  const revised = plot.reviseData({ source: "raw", id: "revised", values: fixture.values });
  assert.equal(renderToSVG(revised, { resourceNamespace: "fixture" }), svg);
  const current = revised.semanticSpec.datasets.find(data => data.id === revised.semanticSpec.layers.find(layer => layer.id === "points").data);
  assert.deepEqual(current.values, dataset.values);
  assert.notEqual(current.id, dataset.id);
  const revisionInput = JSON.stringify(statisticalRevisions[fixture.id]);
  const changed = reviseStatisticalFixture(fixture, { program: plot, dataset });
  assert.ok(changed.differences.every(diff => diff.pass), JSON.stringify(changed.differences));
  assert.deepEqual(changed.contributors, statisticalRevisions[fixture.id].contributors ?? fixture.contributors);
  if (fixture.secondary) assert.deepEqual(changed.secondaryContributors,
    statisticalRevisions[fixture.id].secondaryContributors ?? fixture.secondaryContributors);
  assert.notDeepEqual(changed.actual, result.actual);
  assert.deepEqual(deserializeProgram(serializeProgram(changed.program)).graphicSpec, changed.program.graphicSpec);
  assert.equal(changed.program.semanticSpec.layers.find(layer => layer.id === "points").data, changed.dataset.id);
  render(changed.program, createMockCanvasContext());
  assert.equal(JSON.stringify(statisticalRevisions[fixture.id]), revisionInput);
  assert.equal(serializeProgram(plot), plotBefore);
  assert.equal(serializeProgram(program), before);
  assert.equal(JSON.stringify(fixture), input);
});

test("empirical distribution evaluates inclusive probabilities and density preserves its literal Gaussian peak", () => {
  const cdf = runStatisticalFixture(statisticalFixtures.find(fixture => fixture.id === "ecdf-right-continuity")).actual;
  const at = x => cdf.filter(row => row[0] <= x).at(-1)?.[2] ?? 0;
  assert.ok(statisticalDifference([at(0), at(1), at(3)], [0, 2 / 3, 1]).every(diff => diff.pass));
  const density = runStatisticalFixture(statisticalFixtures.find(fixture => fixture.id === "gaussian-unit-density")).actual;
  assert.ok(Math.abs(density[1][1] - 1 / Math.sqrt(2 * Math.PI)) < 1e-9);
  assert.equal(density[0][1], density[2][1]);
  assert.ok(density.every(row => row[1] >= 0));
});

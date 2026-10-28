import { chart } from "../../src/index.js";
import { memberRowReferences } from "../../src/materialization/selection/rows.js";
import { statisticalRevisions, statisticalTolerance } from "../oracles/statistical-fixtures.js";

export function statisticalDifference(actual, expected, path = "$", differences = []) {
  if (typeof actual === "number" && typeof expected === "number") {
    const delta = actual - expected, allowed = statisticalTolerance.absolute + statisticalTolerance.relative * Math.max(Math.abs(actual), Math.abs(expected));
    if (delta !== 0) differences.push({ path, actual, expected, delta, allowed, pass: Number.isFinite(delta) && Math.abs(delta) <= allowed });
  } else if (Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length) {
    actual.forEach((value, index) => statisticalDifference(value, expected[index], `${path}[${index}]`, differences));
  } else if (actual !== expected) differences.push({ path, actual, expected, pass: false });
  return differences;
}

function contributingRows(program, dataset, dataId) {
  const input = program.semanticSpec.datasets.find(data => data.id === dataId);
  return dataset.rowKeys.map(key => memberRowReferences(program, [], dataset.id, [key])
    .filter(ref => ref.data === dataId).map(ref => input.rowKeys.indexOf(ref.rowKey)).sort((a, b) => a - b));
}

export function runStatisticalFixture(fixture) {
  let source = chart().createData({ id: "raw", values: fixture.values });
  if (fixture.secondary) source = source.createData(fixture.secondary);
  const program = fixture.calls.reduce((p, [method, options]) => p[method](options), source);
  const dataset = program.semanticSpec.datasets.find(data => data.id === "result");
  const actual = dataset.values.map(row => fixture.fields.map(field => row[field]));
  return { source, program, dataset, actual, differences: statisticalDifference(actual, fixture.expected),
    contributors: contributingRows(program, dataset, "raw"),
    ...(fixture.secondary ? { secondaryContributors: contributingRows(program, dataset, fixture.secondary.id) } : {}) };
}

export function reviseStatisticalFixture(fixture, result) {
  const revision = statisticalRevisions[fixture.id];
  const program = result.program.reviseData({ source: "raw", id: "next", values: revision.values });
  const dataset = program.semanticSpec.datasets.findLast(data => data.logicalId === result.dataset.logicalId);
  const actual = dataset.values.map(row => fixture.fields.map(field => row[field]));
  return { program, dataset, actual, expected: revision.expected,
    differences: statisticalDifference(actual, revision.expected),
    contributors: contributingRows(program, dataset, "next"),
    ...(fixture.secondary ? { secondaryContributors: contributingRows(program, dataset, fixture.secondary.id) } : {}) };
}

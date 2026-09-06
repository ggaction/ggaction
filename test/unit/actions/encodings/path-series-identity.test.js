import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { deriveLineSeries } from "../../../../src/grammar/lineSeries.js";
import { resolveLineItems } from "../../../../src/materialization/selection/items/path.js";

const countries = ["France", "Germany", "Japan", "Korea"];
const rows = countries.flatMap((country, index) => ["observed", "projected"].flatMap(
  scenario => [1, 2, 3].map(x => ({
    country, scenario, continent: index < 2 ? "Europe" : "Asia",
    x, y: x * (index + 1), upper: x * (index + 1) + 1,
    width: index + 1
  }))
));
const observed = rows.filter(row => row.scenario === "observed");

function base(values = observed, factory = chart) {
  return factory().createCanvas({ width: 300, height: 200, margin: 30 })
    .createData({ values });
}

function line(values = observed) {
  return base(values).createLineMark({ id: "paths" })
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } });
}

function paths(program) {
  return program.graphicSpec.objects.paths.items.map(item => item.properties);
}

function assertAtomic(program, operation, expected) {
  const before = JSON.stringify(program);
  assert.throws(() => operation(program), expected);
  assert.equal(JSON.stringify(program), before);
}

test("keeps four country paths when two continent colors supply appearance", () => {
  const grouped = line().encodeGroup({ field: "country" });
  const colored = grouped.encodeColor({ field: "continent" });
  assert.equal(paths(colored).length, 4);
  assert.deepEqual(paths(colored).map(item => item.stroke),
    ["#4c78a8", "#4c78a8", "#f58518", "#f58518"]);
  assert.deepEqual(paths(colored).map(item => item.commands),
    paths(grouped).map(item => item.commands));
  const derived = deriveLineSeries(observed, colored.semanticSpec.layers[0]);
  assert.deepEqual(derived.series.map(item => item.key),
    countries.map(country => ({ country })));
  assert.deepEqual(colored.resolvedScales.color.domain, ["Europe", "Asia"]);
  const reversed = line().encodeColor({ field: "continent" })
    .encodeGroup({ field: "country" });
  assert.deepEqual(reversed.semanticSpec, colored.semanticSpec);
  assert.deepEqual(reversed.graphicSpec, colored.graphicSpec);
  assert.deepEqual(reversed.resolvedScales, colored.resolvedScales);
});

test("keeps ordinal appearance domains independent of temporal aggregate measures", () => {
  const values = observed.map(row => ({ ...row, year: 2000 + row.x, rank: row.width < 3 ? 1 : 2 }));
  const program = base(values).createLineMark({ id: "paths" })
    .encodeGroup({ field: "country" })
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "y", aggregate: "mean" })
    .encodeColor({ field: "rank", fieldType: "ordinal" });
  assert.deepEqual(program.resolvedScales.color.domain, [1, 2]);
  assert.equal(paths(program).length, 4);
});

test("uses tuple identity for independent color, dash, and field width", () => {
  const fields = Object.freeze(["country", "scenario"]);
  const program = line(rows).encodeGroup({ fields })
    .encodeColor({ field: "continent" })
    .encodeStrokeDash({ field: "scenario", scale: { range: ["solid", "dashed"] } })
    .encodeStrokeWidth({ field: "width", scale: { domain: [1, 4], range: [1, 4] } });
  assert.equal(paths(program).length, 8);
  assert.deepEqual(paths(program).map(item => item.strokeWidth), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.deepEqual(paths(program).map(item => item.strokeDash),
    [[], [6, 4], [], [6, 4], [], [6, 4], [], [6, 4]]);
  assert.deepEqual(program.semanticSpec.layers[0].encoding.group,
    { fields: ["country", "scenario"], fieldType: "nominal" });
  assert.notEqual(program.semanticSpec.layers[0].encoding.group.fields, fields);
  const members = resolveLineItems(program, program.semanticSpec.layers[0],
    program.semanticSpec.datasets[0]);
  assert.equal(members.length, 8);
  const selected = program.filterMarks({ field: "country", op: "eq", value: "Japan" });
  assert.equal(paths(selected).length, 2);
  assert.deepEqual(selected.resolvedScales.color.domain, ["Asia"]);
  const resized = program.editCanvas({ width: 500 });
  assert.deepEqual(paths(resized).map(item => item.stroke), paths(program).map(item => item.stroke));
  assert.deepEqual(paths(resized).map(item => item.strokeDash), paths(program).map(item => item.strokeDash));
});

test("keeps typed tuples collision-free and retains nominal zero equality", () => {
  const tuples = [["a|b", "c"], ["a", "b|c"], [1, true], ["1", true], [1, "true"], [0, false], [-0, false]];
  const values = tuples.flatMap(([first, second]) => [1, 2].map(x => ({ first, second, x, y: x })));
  const program = line(values).encodeGroup({ fields: ["first", "second"] });
  const derived = deriveLineSeries(values, program.semanticSpec.layers[0]);
  assert.equal(paths(program).length, 6);
  assert.deepEqual(derived.series.map(item => item.values.length), [2, 2, 2, 2, 2, 4]);
  assert.equal(new Set(derived.series.map(item => JSON.stringify(item.key))).size, 6);
});

test("normalizes single-element groups and removes alternate fields on reassignment", () => {
  const single = line().encodeGroup({ field: "country" });
  const array = line().encodeGroup({ fields: ["country"] });
  assert.deepEqual(single.semanticSpec, array.semanticSpec);
  assert.deepEqual(single.graphicSpec, array.graphicSpec);
  const tuple = single.encodeGroup({ fields: ["country", "scenario"] });
  const restored = tuple.encodeGroup({ field: "country" });
  assert.deepEqual(restored.semanticSpec, single.semanticSpec);
  assert.deepEqual(restored.graphicSpec, single.graphicSpec);
  const regrouped = restored.encodeGroup({ fields: ["country", "scenario"] });
  assert.deepEqual(regrouped.semanticSpec, tuple.semanticSpec);
  const ungrouped = restored.removeEncoding({ channel: "group" });
  assert.equal(paths(ungrouped).length, 1);
});

test("rejects ambiguous raw appearance even when its scale maps values to the same color", () => {
  const mixed = observed.map((row, index) => ({ ...row, continent: index === 1 ? "Other" : row.continent }));
  const program = line(mixed).encodeGroup({ field: "country" });
  assertAtomic(program, p => p.encodeColor({ field: "continent", scale: { range: ["red"] } }),
    /one value within each series/);
  const grouped = line(rows).encodeGroup({ fields: ["country", "scenario"] })
    .encodeColor({ field: "continent" }).encodeStrokeDash({ field: "scenario" });
  assertAtomic(grouped, p => p.encodeGroup({ field: "country" }), /one value within each series/);
  assertAtomic(grouped, p => p.removeEncoding({ channel: "group" }), /unless encodeGroup/);
  const widths = line().encodeGroup({ field: "country" }).encodeStrokeWidth({ field: "width" });
  assertAtomic(widths, p => p.encodeGroup({ field: "continent" }), /one value within each series/);
});

test("validates group input before incomplete path geometry", () => {
  const program = base().createLineMark({ id: "paths" });
  for (const args of [
    {}, { fields: [] }, { fields: ["country", "country"] }, { fields: [""] },
    { field: "country", fields: ["scenario"] }, { fields: "country" },
    { field: ["country"] }, { fields: ["missing"] }, { fields: ["country"], fieldType: "ordinal" }
  ]) assertAtomic(program, p => p.encodeGroup(args), /group|field|nominal/i);
  for (const value of [null, undefined, {}, [], NaN, Infinity]) {
    const invalid = base([{ x: 1, y: 2, country: value }]).createLineMark();
    assertAtomic(invalid, p => p.encodeGroup({ field: "country" }), /nominal value/);
  }
  const pending = program.encodeGroup({ fields: ["country", "scenario"] })
    .encodeColor({ field: "continent" });
  assert.equal(paths(pending).length, 0);
  assert.equal(paths(pending.encodeX({ field: "x" }).encodeY({ field: "y" })).length, 4);
});

test("supports the same tuple facade and child flow in root and basic entries", () => {
  const options = { id: "paths", x: "x", y: "y", groupBy: ["country", "scenario"],
    color: "continent", strokeDash: { field: "scenario" }, guides: false };
  const program = base(rows).createLinePlot(options);
  const basic = base(rows, basicChart).createLinePlot(options);
  const lower = base(rows).createLineMark({ id: "paths" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeGroup({ fields: ["country", "scenario"] })
    .encodeColor({ field: "continent" }).encodeStrokeDash({ field: "scenario" });
  assert.deepEqual(program.graphicSpec, lower.graphicSpec);
  assert.deepEqual(program.semanticSpec, lower.semanticSpec);
  assert.deepEqual(basic.graphicSpec, program.graphicSpec);
  assert.deepEqual(basic.semanticSpec, program.semanticSpec);
  const children = program.trace.children.at(-1).children.map(node => node.op);
  assert.ok(children.indexOf("encodeGroup") < children.indexOf("encodeColor"));
  assert.ok(children.includes("encodeStrokeDash"));
});

test("uses identity grain for temporal aggregates and quantitative bins", () => {
  for (const binned of [false, true]) {
    const values = observed.map(row => ({ ...row, x: binned ? row.x : 2000 + row.x }));
    const program = base(values).createLineMark({ id: "paths" })
      .encodeX({ field: "x", fieldType: binned ? "quantitative" : "temporal",
        ...(binned ? { bin: { boundaries: [0, 1.5, 2.5, 4] } } : {}) })
      .encodeY({ field: "y", aggregate: "mean", scale: { nice: false, zero: false } })
      .encodeGroup({ fields: ["country", "scenario"] }).encodeColor({ field: "continent" });
    assert.equal(paths(program).length, 4);
    assert.deepEqual(program.resolvedScales.y.domain, [1, 12]);
    const before = paths(program).map(item => item.commands);
    const changed = program.encodeColor({ field: "country" });
    assert.deepEqual(paths(changed).map(item => item.commands), before);
    assert.deepEqual(changed.resolvedScales.y.domain, [1, 12]);
  }
});

test("supports tuple identity in Polar lines and ordinary ranged areas", () => {
  const polar = base(rows).createLineMark({ id: "paths" })
    .encodeTheta({ field: "x", fieldType: "quantitative" })
    .encodeR({ field: "y" }).encodeGroup({ fields: ["country", "scenario"] })
    .encodeColor({ field: "continent" }).encodeStrokeDash({ field: "scenario" });
  assert.equal(paths(polar).length, 8);
  const area = base(rows).createAreaMark({ id: "paths" })
    .encodeGroup({ fields: ["country", "scenario"] })
    .encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: "upper" })
    .encodeColor({ field: "continent" });
  assert.equal(paths(area).length, 8);
  assert.deepEqual(paths(area).map(item => item.fill),
    ["#4c78a8", "#4c78a8", "#4c78a8", "#4c78a8", "#f58518", "#f58518", "#f58518", "#f58518"]);
  const highlighted = area.highlightMarks({ select: { field: "country", op: "eq", value: "Japan" }, fill: "black" });
  assert.equal(paths(highlighted).filter(item => item.fill === "black").length, 2);
});

test("supports centered tuples while preserving statistical grouping owners", () => {
  const centered = base(observed).createAreaMark({ id: "paths" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "country", layout: "center" });
  assert.deepEqual(centered.encodeGroup({ fields: ["country", "scenario"] }).semanticSpec.layers[0].encoding.group.fields, ["country", "scenario"]);
  const density = base().createAreaMark({ id: "paths" })
    .encodeDensity({ field: "y", groupBy: "country", bandwidth: 1 });
  assertAtomic(density, p => p.encodeGroup({ fields: ["country", "scenario"] }), /editDensity/);
  assertAtomic(density, p => p.removeEncoding({ channel: "group" }), /editDensity/);
});

test("keeps Horizon and Regression grouping under their statistical owners", () => {
  const horizon = base().createAreaMark({ id: "folded" })
    .encodeHorizon({ x: "x", y: "y", groupBy: "country" });
  const regression = base().createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .createRegression({ groupBy: "country" });
  for (const [program, layer, editor] of [
    [horizon, horizon.semanticSpec.layers[0], /editHorizon/],
    [regression, regression.semanticSpec.layers.find(layer => layer.mark.type === "line"), /editRegression/]
  ]) {
    assertAtomic(program, p => p.encodeGroup({ target: layer.id, fields: ["country", "scenario"] }), editor);
    assertAtomic(program, p => p.removeEncoding({ target: layer.id, channel: "group" }), editor);
    assert.deepEqual(program.encodeGroup({ target: layer.id, field: layer.encoding.group.field }).graphicSpec,
      program.graphicSpec);
  }
});

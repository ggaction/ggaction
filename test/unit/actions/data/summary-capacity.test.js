import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const aggregates = [{ op: "mean", field: "value", as: "average" }];
const rows = count => Array.from({ length: count }, (_, group) => ({ group, value: group % 17 }));
const summary = (program, options = {}) => program.createSummaryData({
  id: "summary", groupBy: "group", aggregates, ...options
});

test("summary capacity counts observed groups through the inclusive 30000 boundary", () => {
  for (const count of [9999, 10000, 10001, 29999, 30000, 30001]) {
    const values = rows(count);
    const before = JSON.stringify(values);
    const source = chart().createData({ id: "raw", values });
    const original = serializeProgram(source);
    if (count > 30000) {
      assert.throws(() => summary(source), {
        name: "RangeError", message: "Summary output cannot exceed 30000 groups."
      });
    } else {
      const program = summary(source);
      assert.deepEqual(program.semanticSpec.datasets.at(-1).values,
        values.map(({ group, value }) => ({ group, average: value })));
      assert.deepEqual(program.trace.children.at(-1).children.map(node => node.op),
        ["createDerivedData", "materializeSummaryData"]);
      if (count === 30000) {
        assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec);
      }
    }
    assert.equal(serializeProgram(source), original);
    assert.equal(JSON.stringify(values), before);
  }
  assert.equal(typeof basicChart().createSummaryData, "undefined");
});

test("summary capacity admits multiple observations for each of 30000 groups", () => {
  const values = rows(30000).flatMap(row => [row, { ...row, value: row.value + 2 }]);
  const program = summary(chart().createData({ values }), { members: "members" });
  assert.equal(program.semanticSpec.datasets.at(-1).values.length, 30000);
  program.semanticSpec.datasets.at(-1).values.forEach((row, index) => {
    assert.equal(row.average, index % 17 + 1);
    assert.deepEqual(row.members, values.slice(index * 2, index * 2 + 2));
  });
});

test("summary grouping retains typed keys, members and weighted values above 10000 input rows", () => {
  const keys = [1, "1", false, "false", null];
  const values = Array.from({ length: 30005 }, (_, i) => ({
    group: keys[i % keys.length], other: i % 2, value: i % 7, weight: 1
  }));
  const program = summary(chart().createData({ values }), {
    groupBy: ["group", "other"], members: "members",
    weight: { field: "weight", kind: "frequency" },
    aggregates: [{ op: "sum", field: "value", as: "total" }, { op: "count", as: "count" }]
  });
  const expected = new Map();
  for (const row of values) {
    const key = JSON.stringify([typeof row.group, row.group, row.other]);
    const group = expected.get(key) ?? { group: row.group, other: row.other, total: 0, count: 0, members: [] };
    group.total += row.value; group.count += 1; group.members.push(row); expected.set(key, group);
  }
  assert.deepEqual(program.semanticSpec.datasets.at(-1).values, [...expected.values()]);
});

test("large summaries replay revisions, logical editors and snapshots without changing capacity ownership", () => {
  const program = summary(chart().createData({ id: "raw", values: rows(10001) }));
  const before = serializeProgram(program);
  const revised = program.reviseData({ source: "raw", id: "newRows", values: rows(10002) });
  const id = revised.materializationConfigs.data.summary.summary.current;
  assert.equal(revised.semanticSpec.datasets.find(dataset => dataset.id === id).values.length, 10002);
  const edited = revised.editSummaryData({ target: "summary", aggregates: [{ op: "count", as: "count" }] });
  assert.equal(edited.semanticSpec.datasets.at(-1).values.length, 10002);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).semanticSpec, edited.semanticSpec);
  assert.throws(() => program.reviseData({ source: "raw", id: "overflow", values: rows(30001) }), /30000 groups/);
  assert.equal(serializeProgram(program), before);
  assert.throws(() => program.createGraphics({ id: "ordinary", type: "circle", length: 10001 }), /10000/);
});

test("facet replay uses the same summary group capacity before downstream reduction", () => {
  const values = rows(20002).map(row => ({ ...row, panel: row.group % 2 }));
  const program = chart().createCanvas({ width: 500, height: 400, margin: 70 })
    .createData({ id: "raw", values })
    .createSummaryData({ id: "groupMeans", groupBy: ["panel", "group"], aggregates })
    .createSummaryData({ id: "panelMeans", groupBy: "panel", aggregates: [{ op: "mean", field: "average", as: "mean" }] })
    .createScatterPlot({ x: "panel", y: "mean", guides: false });
  const snapshot = serializeProgram(program);
  const faceted = program.facet({ field: "panel", guides: { legend: false } });
  assert.equal(faceted.compositionSpec.children.length, 2);
  for (const child of Object.values(faceted.children)) {
    const reduced = child.semanticSpec.datasets.find(dataset => dataset.id === child.semanticSpec.layers[0].data);
    const grouped = child.semanticSpec.datasets.find(dataset => dataset.id === reduced.source);
    assert.deepEqual(grouped.transform[0].groupBy, ["panel", "group"]);
    assert.equal(grouped.values.length, 10001);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec, faceted.graphicSpec);
  assert.equal(serializeProgram(program), snapshot);
});

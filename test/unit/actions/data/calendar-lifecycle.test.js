import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { chart, hconcat, render } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../../src/scene.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";
import { createMockCanvasContext } from "../../../support/canvas.js";

const calendar = { unit: "day", start: "2024-11-02", end: "2024-11-04", timeZone: "America/New_York" };
const values = [{ date: "2024-11-03T05:30:00Z", value: 2, panel: "A" },
  { date: "2024-11-03T06:30:00Z", value: 3, panel: "A" }, { date: "2024-11-04T12:00:00Z", value: 0, panel: "A" }];
const data = (p, id) => p.semanticSpec.datasets.find(d => d.id === id);
const latest = (p, type) => p.semanticSpec.datasets.findLast(d => d.transform?.[0]?.type === type);
const refs = (d, index) => d.lineage.entries[d.lineage.rowRefs[index]];
const make = (rows = values, groupBy = ["day"]) => chart().createData({ id: "raw", values: rows, schema: { fields: [
  { name: "date", storageType: "string" }, { name: "value", storageType: "number" }, { name: "panel", storageType: "string" }
] } })
  .createTimeUnitData({ id: "buckets", field: "date", unit: "day", as: "day", timeZone: calendar.timeZone })
  .createSummaryData({ id: "totals", groupBy, aggregates: [{ op: "sum", field: "value", as: "total" }] })
  .createCompleteData({ id: "days", key: "day", groupBy: groupBy.filter(field => field !== "day"), calendar, fill: { total: null }, members: "members" });

test("time bucketing, explicit sum and calendar completion retain exact contributing row references", () => {
  const p = make(), source = data(p, "raw"), buckets = data(p, "buckets"), totals = data(p, "totals"), days = data(p, "days");
  assert.deepEqual(days.values, [
    { day: 1730520000000, total: null, members: [] },
    { day: 1730606400000, total: 5, members: [0] },
    { day: 1730696400000, total: 0, members: [1] }
  ]);
  assert.deepEqual(refs(days, 0), []);
  assert.deepEqual(refs(days, 1).map(ref => [ref.data, ref.rowKey]), [["totals", totals.rowKeys[0]]]);
  assert.deepEqual(refs(totals, 0).map(ref => ref.rowKey), buckets.rowKeys.slice(0, 2));
  assert.deepEqual(buckets.values.map((_, index) => refs(buckets, index)[0].rowKey), source.rowKeys);
  const generic = p.createDerivedData({ id: "generic", source: "totals", transform: days.transform }).materializeCompleteData({ id: "generic" });
  assert.deepEqual(data(generic, "generic").values, days.values);
  assert.deepEqual(data(deserializeProgram(serializeProgram(p)), "days"), days);
  const basic = basicChart().createData({ id: "raw", values: [{ day: 1730606400000 }] });
  assert.equal(basic.createCompleteData, undefined);
  assert.throws(() => basic.createDerivedData({ id: "days", source: "raw", transform: days.transform }), /Unsupported dataset transform/);
});

test("calendar edits replace whole domains and clean up the prior mode while preserving snapshots", () => {
  const p = make(), before = serializeProgram(p);
  const expanded = p.editCompleteData({ target: "days", calendar: { ...calendar, end: "2024-11-05" } });
  assert.equal(latest(expanded, "complete").values.length, 4);
  assert.deepEqual(latest(expanded, "complete").rowKeys.slice(0, 3), data(p, "days").rowKeys);
  const filled = expanded.editCompleteData({ target: "days", fill: { total: 0 } });
  assert.equal(latest(filled, "complete").transform[0].calendar.end, "2024-11-05");
  assert.equal(latest(filled, "complete").values.at(-1).total, 0);
  const explicit = filled.editCompleteData({ target: "days", values: [1730606400000, 1730696400000] });
  assert.equal(latest(explicit, "complete").transform[0].calendar, undefined);
  const sequence = explicit.editCompleteData({ target: "days", sequence: { start: 1730606400000, end: 1730696400000, step: 90000000 } });
  assert.equal(latest(sequence, "complete").transform[0].values, undefined);
  const restored = deserializeProgram(serializeProgram(sequence)).editCompleteData({ target: "days", calendar });
  assert.equal(latest(restored, "complete").transform[0].sequence, undefined);
  assert.deepEqual(latest(restored, "complete").values.map(row => row.day), data(p, "days").values.map(row => row.day));
  assert.throws(() => p.editCompleteData({ target: "days", calendar: { end: "2024-11-05" } }), /unit/);
  assert.throws(() => p.editCompleteData({ target: "days", calendar: { ...calendar, timeZone: "UTC" } }), /outside the requested domain/);
  assert.equal(serializeProgram(p), before);
});

test("source revisions rederive daily sums and empty schemas, while out-of-range revisions fail atomically", () => {
  const p = make(), before = serializeProgram(p);
  const revised = p.reviseData({ source: "raw", id: "next", values: values.map(row => ({ ...row, value: row.value * 2 })) });
  assert.deepEqual(latest(revised, "complete").values.map(row => row.total), [null, 10, 0]);
  const cleared = p.reviseData({ source: "raw", id: "empty", values: [] });
  assert.deepEqual(latest(cleared, "complete").values.map(row => row.total), [null, null, null]);
  assert.ok(latest(cleared, "complete").lineage.entries.every(entry => entry.length === 0));
  const grouped = make(values, ["panel", "day"]).reviseData({ source: "raw", id: "empty", values: [] });
  assert.deepEqual(latest(grouped, "complete").values, []);
  assert.equal(latest(grouped, "complete").schema.fields.find(field => field.name === "day").storageType, "number");
  assert.throws(() => p.reviseData({ source: "raw", id: "outside", values: [{ ...values[0], date: "2024-11-05T12:00:00Z" }] }), /outside the requested domain/);
  assert.throws(() => p.removeData({ id: "raw" }), /depend|referenc|consumer/i);
  const invalid = before.replaceAll('["end","2024-11-04"]', '["end","2024-02-30"]');
  assert.notEqual(invalid, before);
  assert.throws(() => deserializeProgram(invalid), /Gregorian/);
  assert.equal(serializeProgram(p), before);
});

test("calendar completion feeds existing temporal marks, selections, facets, composition and scenes", () => {
  const p = make([...values, ...values.map(row => ({ ...row, panel: "B", value: row.value + 10 }))], ["panel", "day"])
    .createCanvas({ width: 360, height: 240, margin: 40 })
    .createPointMark({ id: "points", data: "days", missing: "skip" })
    .encodeX({ target: "points", field: "day", fieldType: "temporal" })
    .encodeY({ target: "points", field: "total" })
    .selectMarks({ id: "largest", target: "points", field: "total", op: "max" })
    .highlightMarks({ selection: "largest", target: "points", fill: "#ff0000" });
  for (const item of resolveMarkItems(p, "points")) {
    assert.equal(item.rows.filter(ref => ref.data === "raw").length, item.fields.day === 1730606400000 ? 2 : 1);
  }
  const zero = p.editCompleteData({ target: "days", fill: { total: 0 } });
  const synthetic = resolveMarkItems(zero, "points").filter(item => item.fields.day === 1730520000000);
  assert.equal(synthetic.length, 2);
  assert.ok(synthetic.every(item => item.rows.every(ref => !["raw", "buckets", "totals"].includes(ref.data))));
  const facets = p.facet({ field: "panel", data: "raw", columns: 2, guides: { legend: false } });
  for (const id of facets.compositionSpec.children) {
    const d = latest(facets.children[id], "complete");
    assert.equal(d.values.length, 3);
    assert.equal(new Set(d.values.map(row => row.panel)).size, 1);
    assert.deepEqual(d.transform[0].calendar, calendar);
  }
  assert.throws(() => p.repeatCharts({ channel: "y", fields: ["total"] }), /source dataset|derived|transform|repeat/i);
  assert.match(renderToSVG(hconcat({ programs: [p, facets] })), /<svg/);
  render(p, createMockCanvasContext());
  assert.equal(createTransitionScene(p).nodes.filter(node => node.type === "circle").length, 4);
});

test("public calendar completion is independent of the process timezone", () => {
  const url = new URL("../../../../src/index.js", import.meta.url).href;
  const code = `import { chart } from ${JSON.stringify(url)}; const p = chart().createData({values:[],schema:{fields:[{name:"day",storageType:"number"}]}}).createCompleteData({id:"days",key:"day",calendar:${JSON.stringify(calendar)}}); console.log(JSON.stringify(p.semanticSpec.datasets.at(-1).values));`;
  const outputs = ["UTC", "America/Los_Angeles", "Asia/Seoul"].map(TZ => execFileSync(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, TZ }, encoding: "utf8" }));
  assert.equal(new Set(outputs).size, 1);
  assert.deepEqual(JSON.parse(outputs[0]).map(row => row.day), [1730520000000, 1730606400000, 1730696400000]);
});

test("explicit week starts retain their year-boundary behavior beside day completion", () => {
  const source = chart().createData({ values: [{ date: "2023-12-31T12:00:00Z" }, { date: "2024-01-01T12:00:00Z" }] });
  const weeks = weekStartsOn => source.createTimeUnitData({ id: "weeks", field: "date", unit: "week", as: "week", timeZone: "UTC", weekStartsOn, weekRule: "calendar" }).semanticSpec.datasets.at(-1).values.map(row => row.week);
  assert.deepEqual(weeks(0), [1703980800000, 1703980800000]);
  assert.deepEqual(weeks(1), [1703462400000, 1704067200000]);
});

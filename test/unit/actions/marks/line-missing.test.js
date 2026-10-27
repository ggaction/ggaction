import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { deriveLineSeries } from "../../../../src/grammar/lineSeries.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";
import { exportAccessibleData } from "../../../../src/accessibility.js";

const rows = [{ x: 0, y: 1 }, { x: 2, y: 3 }, { x: 3, y: null },
  { x: 5, y: 6 }, { x: 7, y: 8 }];
const x = { field: "x", scale: { domain: [0, 10] } };
const y = { field: "y", scale: { domain: [0, 10] } };
function base(values = rows) {
  return chart().createCanvas({ width: 100, height: 100, margin: 0 }).createData({ values });
}
function build(values = rows, line = { missing: "break" }) {
  return base(values).createLinePlot({ id: "line", x, y, line, guides: false });
}
function commands(p) { return p.graphicSpec.objects.line.items.map(item => item.properties.commands); }
function derived(p) { return deriveLineSeries(p.semanticSpec.datasets[0].values,
  p.semanticSpec.layers.find(layer => layer.id === "line")); }

test("explicit break preserves raw rows and draws two paths without a bridge", () => {
  const p = build();
  assert.deepEqual(commands(p), [
    [{ op: "M", x: 0, y: 90 }, { op: "L", x: 20, y: 70 }],
    [{ op: "M", x: 50, y: 40 }, { op: "L", x: 70, y: 20 }]
  ]);
  assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
  assert.equal(p.semanticSpec.layers[0].mark.missing, "break");
  assert.deepEqual(derived(p).series.map(s => s.sourceIndices), [[0, 1], [3, 4]]);
  assert.deepEqual(resolveMarkItems(p, "line").map(item => item.members), [[...rows.slice(0, 2), ...rows.slice(3)]]);
  assert.equal(exportAccessibleData(p).views[0].rows.length, 4);
});

test("strict default and explicit error reject nulls; no-gap output is unchanged", () => {
  assert.throws(() => build(rows, {}), /finite number at row 2/);
  assert.throws(() => build(rows, { missing: "error" }), /finite number at row 2/);
  const complete = rows.filter(row => row.y !== null);
  assertEquivalentMeaning(build(complete).graphicSpec, build(complete, {}).graphicSpec);
  assert.equal(renderToSVG(build(complete)), renderToSVG(build(complete, {})));
  assert.deepEqual(build(complete, {}).semanticSpec.layers[0].mark, { type: "line" });
  assert.throws(() => base().createLineMark({ missing: "drop" }), /Line missing/);
});

test("null and absent positions are boundaries; invalid nonmissing inputs remain errors", () => {
  for (const missing of [{ x: 3, y: null }, { x: 3 }]) {
    assert.equal(commands(build([rows[0], missing, rows[4]])).length, 2);
  }
  for (const value of [NaN, Infinity, -Infinity, "3", "", false]) {
    assert.throws(() => build([{ x: 0, y: 1 }, { x: 1, y: value }]), /finite number/);
  }
  for (const values of [[{ x: 0, y: null }], [{ x: null, y: 0 }], [{ x: 0 }]]) {
    assert.throws(() => build(values), /nonmissing value|does not exist/);
  }
});

test("leading, consecutive and trailing gaps emit no invented vertices; singleton is M", () => {
  const p = build([{ x: 0, y: null }, { x: 1, y: 2 }, { x: 2, y: null },
    { x: 3 }, { x: 4, y: 5 }, { x: 5, y: null }]);
  assert.deepEqual(commands(p), [[{ op: "M", x: 10, y: 80 }], [{ op: "M", x: 40, y: 50 }]]);
  const noJoint = build([{ x: 1, y: null }, { x: null, y: 3 }]);
  assert.deepEqual(commands(noJoint), []);
});

test("each dimension retains independently valid domain observations", () => {
  const p = base([{ x: 0, y: 1 }, { x: 10, y: null }, { x: 5, y: 3 }])
    .createLineMark({ id: "line", missing: "break" })
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeX({ field: "x", scale: { nice: false, zero: false } });
  assert.deepEqual(p.resolvedScales.x.domain, [0, 10]);
  assert.deepEqual(p.resolvedScales.y.domain, [1, 3]);
  assert.deepEqual(derived(p).xValues, [0, 10, 5]);
});

test("continuous position order is independent and temporal gaps preserve exact dates", () => {
  const values = rows.map(row => ({ x: `2025-0${row.x + 1}-01`, y: row.y }));
  const b = base(values).createLineMark({ id: "line", missing: "break" });
  const tx = { field: "x", fieldType: "temporal", scale: { nice: false } };
  const a = b.encodeX(tx).encodeY(y), reverse = b.encodeY(y).encodeX(tx);
  assert.deepEqual(a.graphicSpec, reverse.graphicSpec);
  assert.equal(commands(a).length, 2);
  assert.equal(derived(a).xValues[2], Date.UTC(2025, 3, 1));
  assert.throws(() => base([{ x: "bad-date", y: 1 }]).createLineMark({ missing: "break" })
    .encodeX(tx), /temporal/);
});

test("sorting retains known gap positions; missing order coordinates divide sortable runs", () => {
  const sorted = build([rows[4], rows[2], rows[0], rows[3], rows[1]]);
  assert.deepEqual(commands(sorted), commands(build()));
  const missingX = build([{ x: 2, y: 3 }, { x: 0, y: 1 }, { x: null, y: 4 },
    { x: 7, y: 8 }, { x: 5, y: 6 }]);
  assert.deepEqual(commands(missingX), commands(build()));
  const ordered = build(rows.map((row, i) => ({ ...row, order: i })))
    .encodePathOrder({ field: "order", order: "descending" });
  assert.deepEqual(commands(ordered).map(cs => cs.map(c => [c.x, c.y])),
    [[[70, 20], [50, 40]], [[20, 70], [0, 90]]]);
});

test("all curves restart on every valid segment and singleton runs remain M", () => {
  const values = Array.from({ length: 9 }, (_, x) => ({ x, y: x === 4 ? null : 2 + x / 2 }));
  for (const curve of ["linear", "step", "step-before", "step-after", "basis", "cardinal", "monotone", "natural"]) {
    const p = build(values, { missing: "break", curve });
    const segments = [values.slice(0, 4), values.slice(5)];
    assert.deepEqual(commands(p), segments.flatMap(segment => commands(build(segment, { curve }))));
    assert.deepEqual(commands(build([rows[0], rows[2], rows[4]], { missing: "break", curve }))
      .map(cs => cs.map(c => c.op)), [["M"], ["M"]]);
  }
});

test("group paint, selection and rematerialization retain each segment's source ownership", () => {
  const values = [...rows.map(row => ({ ...row, g: "A" })),
    ...rows.map(row => ({ ...row, y: row.y === null ? null : row.y / 2, g: "B" }))];
  const p = build(values).encodeColor({ field: "g" });
  const colors = p.graphicSpec.objects.line.items.map(item => item.properties.stroke);
  assert.equal(colors.length, 4); assert.equal(colors[0], colors[1]);
  assert.equal(colors[2], colors[3]); assert.notEqual(colors[0], colors[2]);
  const options = { target: "line", select: { field: "g", op: "eq", value: "A" }, color: "red", dimOthers: false };
  const highlight = p.highlightMarks(options);
  assert.equal(highlight.graphicSpec.objects.line.items.filter(i => i.properties.stroke === "red").length, 2);
  assert.deepEqual(highlight.editCanvas({ width: 200 }).graphicSpec,
    p.editCanvas({ width: 200 }).highlightMarks(options).graphicSpec);
  assert.equal(commands(p.editScale({ id: "x", reverse: true })).length, 4);
  const filtered = p.filterMarks({ target: "line", field: "g", op: "eq", value: "A" });
  assert.equal(commands(filtered).length, 2);
  assert.equal(filtered.semanticSpec.datasets.find(d => d.id === filtered.semanticSpec.layers[0].data)
    .values.filter(row => row.y === null).length, 1);
  assert.equal(commands(filtered.filterMarks({ target: "line", field: "g", op: "eq", value: "A" })).length, 2);
});

test("a fully missing group has no path; valid groups keep their paint and lineage", () => {
  const p = build([{ x: 0, y: null, g: "none" }, { x: 1, y: 2, g: "kept" },
    { x: 2, y: 3, g: "kept" }]).encodeColor({ field: "g" });
  assert.equal(commands(p).length, 1);
  assert.deepEqual(resolveMarkItems(p, "line")[0].members.map(row => row.g), ["kept", "kept"]);
});

test("temporal y ordering and missing x retain separate runs", () => {
  const values = [{ x: 1, y: "2025-01-01" }, { x: null, y: "2025-02-01" },
    { x: 3, y: "2025-03-01" }];
  const p = base(values).createLineMark({ id: "line", missing: "break" })
    .encodeY({ field: "y", fieldType: "temporal" }).encodeX(x);
  assert.deepEqual(commands(p).map(cs => cs.map(c => c.op)), [["M"], ["M"]]);
  assert.deepEqual(derived(p).series.map(s => s.sourceIndices), [[0], [2]]);
});

test("editing missing is atomic, converges with birth and retains gaps through persistence", () => {
  const incomplete = base().createLineMark({ id: "line" }).encodeX(x);
  const edited = incomplete.editLineMark({ missing: "break" }).encodeY(y);
  assertEquivalentMeaning(edited.graphicSpec, build().graphicSpec);
  const before = serializeProgram(edited);
  assert.throws(() => edited.editLineMark({ missing: "error" }), /finite number/);
  assert.equal(serializeProgram(edited), before);
  const restored = deserializeProgram(before);
  assert.deepEqual(restored.graphicSpec, edited.graphicSpec);
  assert.deepEqual(restored.editCanvas({ width: 200 }).graphicSpec,
    edited.editCanvas({ width: 200 }).graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(edited)).graphicSpec, edited.graphicSpec);
  assert.equal(incomplete.semanticSpec.layers[0].mark.missing, undefined);
});

test("data revisions add and remove gaps without changing the original rows", () => {
  const p = build();
  const connected = p.reviseData({ source: "data", id: "connected",
    values: rows.map(row => ({ ...row, y: row.y ?? 4 })) });
  assert.equal(commands(connected).length, 1);
  const broken = connected.reviseData({ source: "connected", id: "broken", values: rows });
  assert.deepEqual(commands(broken), commands(p));
  assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
});

test("break explicitly rejects categorical, aggregate, bin, Polar and Parallel positions", () => {
  const b = base().createLineMark({ missing: "break" });
  assert.throws(() => b.encodeX({ field: "x", fieldType: "ordinal" }), /direct Cartesian/);
  assert.throws(() => b.encodeY({ field: "y", aggregate: "mean" }), /direct Cartesian/);
  assert.throws(() => b.encodeX({ field: "x", bin: true }), /direct Cartesian/);
  assert.throws(() => b.encodeTheta({ field: "x" }), /direct Cartesian/);
  assert.throws(() => b.encodeParallelCoordinates({ dimensions: [{ field: "x" }, { field: "y" }] }), /direct Cartesian/);
  const aggregate = base(rows.filter(r => r.y !== null)).createLinePlot({ id: "line",
    x: { field: "x", fieldType: "ordinal" }, y: { field: "y", aggregate: "mean" }, guides: false });
  assert.throws(() => aggregate.editLineMark({ missing: "break" }), /direct Cartesian/);
});

test("SVG, PNG and PDF agree with independently authored separated line paths", async () => {
  const actual = build();
  const primitive = chart().createCanvas({ width: 100, height: 100, margin: 0 })
    .createData({ id: "first", values: rows.slice(0, 2) })
    .createLinePlot({ id: "left", x, y, guides: false })
    .createData({ id: "second", values: rows.slice(3) })
    .createLinePlot({ id: "right", x, y, guides: false });
  assert.deepEqual(commands(actual), [primitive.graphicSpec.objects.left.items[0].properties.commands,
    primitive.graphicSpec.objects.right.items[0].properties.commands]);
  const a = await renderToPNGBuffer(actual), b = await renderToPNGBuffer(primitive);
  assert.deepEqual(a.buffer, b.buffer);
  const svg = renderToSVG(actual);
  assert.equal((svg.match(/ d="M/g) ?? []).length, 2);
  const pdf = await renderToPDFBuffer(actual);
  assert.equal(pdf.pages, 1); assert.ok(pdf.bytes > 100);
});

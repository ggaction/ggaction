import assert from "node:assert/strict";
import test from "node:test";
import { chart, render } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { createCanvas } from "@napi-rs/canvas";

const rows = ["known", "other-a", "other-b"].flatMap((kind, i) =>
  [1, 0].map(x => ({ kind, x, y: i + 1 })));
const scale = { domain: ["absent", "known"], range: [[1, 3], [4, 2]], unknown: [] };
const options = { field: "kind", scale };
const base = (values = rows, factory = chart) => factory()
  .createCanvas({ width: 420, height: 240, margin: { left: 30, right: 130, top: 20, bottom: 30 } })
  .createData({ id: "raw", values });
const line = (values = rows, factory = chart) => base(values, factory)
  .createLinePlot({ id: "paths", x: "x", y: "y", guides: false });
const properties = p => p.graphicSpec.objects.paths.items.map(item => item.properties);
const patterns = p => properties(p).map(item => item.strokeDash);
function atomic(p, apply, match) {
  const before = serializeProgram(p);
  assert.throws(() => apply(p), match);
  assert.equal(serializeProgram(p), before);
}

for (const fieldType of ["nominal", "ordinal"]) {
  test(`${fieldType} fallback preserves raw identities, vertices, unseen domain entries and legend samples`, () => {
    const p = line().encodeStrokeDash({ ...options, fieldType }).createLegend();
    assert.deepEqual(patterns(p), [[4, 2], [], []]);
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.deepEqual(p.resolvedScales.strokeDash.domain, scale.domain);
    assert.deepEqual(p.guideConfigs.legend.series.domain, scale.domain);
    assert.deepEqual(properties(p).map(item => item.commands.map(c => c.op)), [["M", "L"], ["M", "L"], ["M", "L"]]);
    assert.ok(properties(p).every(item => item.commands[0].x < item.commands[1].x));
    const svg = renderToSVG(p);
    assert.match(svg, /absent/);
    assert.doesNotMatch(svg, /other-a|other-b/);
  });
}

test("facade, bulk, reused scale, Basic and early assignment converge", () => {
  const expected = properties(line().encodeStrokeDash(options));
  const programs = [
    base().createLinePlot({ id: "paths", x: "x", y: "y", strokeDash: options, guides: false }),
    line().encodeChannels({ target: "paths", channels: { strokeDash: options } }),
    line().createScale({ id: "dash", type: "ordinal", ...scale })
      .encodeStrokeDash({ field: "kind", scale: { id: "dash" } }),
    line(rows, basicChart).encodeStrokeDash(options),
    base().createLineMark({ id: "paths" }).encodeStrokeDash(options).encodeY({ field: "y" }).encodeX({ field: "x" })
  ];
  for (const p of programs) assert.deepEqual(properties(p), expected);
});

test("automatic domains remain inferred and named fallbacks normalize without mutating caller arrays", () => {
  const input = structuredClone(scale);
  const p = line().encodeStrokeDash({ field: "kind", scale: input });
  input.unknown.push(9, 2);
  input.range[1][0] = 99;
  assert.deepEqual(patterns(p), [[4, 2], [], []]);
  const auto = line().encodeStrokeDash({ field: "kind", scale: { unknown: "dotted" } });
  assert.deepEqual(auto.resolvedScales.strokeDash.domain, ["known", "other-a", "other-b"]);
  const named = line().encodeStrokeDash({ ...options, scale: { ...scale, unknown: "dashdot" } });
  assert.deepEqual(patterns(named), [[4, 2], [6, 3, 1, 3], [6, 3, 1, 3]]);
  assert.deepEqual(named.semanticSpec.scales.find(s => s.id === "strokeDash").unknown, [6, 3, 1, 3]);
});

test("rule fallback maps each row without permitting malformed categories", () => {
  const p = base(rows.map(row => ({ ...row, lo: 0, hi: 1 }))).createRuleMark({ id: "rules" })
    .encodeX({ field: "lo", fieldType: "quantitative" }).encodeX2({ field: "hi", fieldType: "quantitative" })
    .encodeY({ field: "y", fieldType: "quantitative" }).encodeStrokeDash(options);
  assert.deepEqual(p.graphicSpec.objects.rules.items.map(i => i.properties.strokeDash), [[4, 2], [4, 2], [], [], [], []]);
  for (const kind of [null, undefined, {}, [], NaN, Infinity]) {
    const invalid = base([{ x: 0, y: 1, kind }]).createRuleMark({ id: "rules" }).encodeX({ field: "x", fieldType: "quantitative" });
    atomic(invalid, q => q.encodeStrokeDash(options), /nominal/);
  }
});

test("strict defaults, invalid fallback, nulls and raw appearance conflicts reject atomically", () => {
  atomic(line(), p => p.encodeStrokeDash({ field: "kind", scale: { domain: scale.domain, range: scale.range } }), /outside/);
  for (const unknown of [undefined, null, "invalid", [0, 0], [1], [-1, 2], [NaN, 2]]) {
    atomic(line(), p => p.encodeStrokeDash({ field: "kind", scale: { ...scale, unknown } }), /dash|pattern/i);
  }
  for (const kind of [null, undefined, {}, [], NaN, Infinity]) {
    atomic(line([{ x: 0, y: 1, kind }]), p => p.encodeStrokeDash(options), /nominal/);
  }
  const mixed = line().encodeGroup({ field: "y" });
  const changed = base([{ x: 0, y: 1, kind: "other-a", group: "same" }, { x: 1, y: 2, kind: "other-b", group: "same" }])
    .createLinePlot({ id: "paths", x: "x", y: "y", guides: false }).encodeGroup({ field: "group" });
  atomic(changed, p => p.encodeStrokeDash(options), /one value within each series/);
  assert.deepEqual(patterns(mixed.encodeStrokeDash(options)), [[4, 2], [], []]);
});

test("unsupported topology rejects both early and late assignment", () => {
  const incomplete = base().createLineMark({ id: "paths" }).encodeStrokeDash(options);
  for (const apply of [
    p => p.encodeTheta({ field: "x" }), p => p.encodeR({ field: "y" }),
    p => p.encodeX({ field: "x", bin: { maxBins: 4 } }),
    p => p.encodeY({ field: "y", aggregate: "mean" }),
    p => p.encodeParallelCoordinates({ dimensions: [{ field: "x" }, { field: "y" }] })
  ]) atomic(incomplete, apply, /Cartesian line or rule/);
  const polar = base().createPolarLinePlot({ id: "paths", theta: "x", radius: "y", guides: false });
  atomic(polar, p => p.encodeStrokeDash(options), /Cartesian line or rule/);
  const parallel = base().createParallelCoordinates({ id: "paths", dimensions: [{ field: "x" }, { field: "y" }] });
  atomic(parallel, p => p.encodeStrokeDash(options), /Cartesian line or rule/);
});

test("general and focused editors retain, replace and remove fallback atomically", () => {
  const p = line().encodeStrokeDash(options).createLegend();
  const edited = p.editStrokeDashScale({ unknown: "dotted" });
  assert.deepEqual(patterns(edited), [[4, 2], [1, 3], [1, 3]]);
  assert.deepEqual(patterns(edited.editStrokeDashScale({ range: [[2, 2], [8, 2]] })), [[8, 2], [1, 3], [1, 3]]);
  assert.deepEqual(patterns(line().encodeStrokeDash({ field: "kind" }).editScale({ id: "strokeDash", ...scale })), patterns(p));
  atomic(p, q => q.editStrokeDashScale({ unknown: undefined }), /outside/);
  atomic(p, q => q.editScale({ id: "strokeDash", unknown: undefined }), /outside/);
  for (const focused of [true, false]) {
    const known = line(rows.slice(0, 2)).encodeStrokeDash(options);
    const removed = focused ? known.editStrokeDashScale({ unknown: undefined }) : known.editScale({ id: "strokeDash", unknown: undefined });
    assert.equal(Object.hasOwn(removed.semanticSpec.scales.find(s => s.id === "strokeDash"), "unknown"), false);
    assert.deepEqual(patterns(removed), [[4, 2]]);
  }
});

test("data revisions, shared consumers, highlights and persistence retain one scale policy", () => {
  const p = line().encodeStrokeDash(options).createLegend();
  const revised = p.reviseData({ source: "raw", id: "revised", values: rows.map(r => ({ ...r, kind: r.kind === "other-a" ? "new" : r.kind })) });
  assert.deepEqual(patterns(revised), [[4, 2], [], []]);
  atomic(p, q => q.reviseData({ source: "raw", id: "revised", values: rows.map(r => ({ ...r, kind: null })) }), /nominal/);
  const shared = p.createLineMark({ id: "second" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeStrokeDash({ field: "kind", scale: { id: "strokeDash" } });
  const edit = shared.editStrokeDashScale({ id: "strokeDash", unknown: [2, 2] });
  for (const id of ["paths", "second"]) assert.deepEqual(edit.graphicSpec.objects[id].items.map(i => i.properties.strokeDash), [[4, 2], [2, 2], [2, 2]]);
  atomic(shared, q => q.editScale({ id: "strokeDash", domain: ["absent"], unknown: undefined }), /outside/);
  const highlight = p.highlightMarks({ select: { field: "kind", op: "eq", value: "other-b" }, opacity: .4 }).editCanvas({ width: 440 });
  assert.deepEqual(patterns(highlight), [[4, 2], [], []]);
  const restored = deserializeProgram(serializeProgram(highlight));
  assert.deepEqual(restored.graphicSpec, highlight.graphicSpec);
  assert.equal(renderToSVG(restored), renderToSVG(highlight));
});

test("fallback paths export identically to existing constant patterns in SVG and decoded Canvas", async () => {
  const p = line().encodeStrokeDash(options);
  let constant = base().createLinePlot({ id: "paths", x: "x", y: "y", guides: false }).encodeGroup({ field: "kind" })
    .encodeStrokeDash({ value: [] });
  // Use existing semantic category mapping as an independent all-explicit control.
  constant = constant.encodeStrokeDash({ field: "kind", scale: { domain: ["known", "other-a", "other-b"], range: [[4, 2], [], []] } });
  assert.deepEqual(properties(p), properties(constant));
  assert.equal(renderToSVG(p), renderToSVG(constant));
  const pixels = program => { const c = createCanvas(420, 240); render(program, c.getContext("2d")); return c.getContext("2d").getImageData(0, 0, 420, 240).data; };
  assert.deepEqual(pixels(p), pixels(constant));
  const pdf = await renderToPDFBuffer(p);
  assert.ok(Buffer.from(pdf.buffer).subarray(0, 5).equals(Buffer.from("%PDF-")));
});

test("unknown typed categories remain separate and derived replay retains raw keys", () => {
  const raw = [0, "0", false, "known"].flatMap((kind, i) =>
    [0, 1].map(x => ({ kind, x, y: i + 1 })));
  const p = base(raw).createComputedData({ id: "derived", as: "height", expression: {
    op: "multiply", left: { field: "y" }, right: { constant: 2 }
  } }).createLinePlot({ id: "paths", x: "x", y: "height", guides: false }).encodeStrokeDash(options);
  assert.deepEqual(patterns(p), [[], [], [], [4, 2]]);
  assert.deepEqual(p.semanticSpec.datasets[0].values, raw);
  assert.deepEqual(p.semanticSpec.datasets[1].values.map(row => row.kind), raw.map(row => row.kind));
  const revised = p.reviseData({ source: "raw", id: "updated", values: raw.map(row => ({ ...row, y: row.y + 1 })) });
  assert.deepEqual(patterns(revised), patterns(p));
  assert.deepEqual(revised.resolvedScales.strokeDash.domain, scale.domain);
  assert.deepEqual(revised.semanticSpec.datasets.find(d => d.id === "updated").values.map(r => r.kind), raw.map(r => r.kind));
});

test("rule fallback is order independent and rejects malformed revised categories", () => {
  const values = rows.map(row => ({ ...row, lo: 0, hi: 1 }));
  const start = base(values).createRuleMark({ id: "rules" });
  const positions = p => p.encodeX({ field: "lo", fieldType: "quantitative" })
    .encodeX2({ field: "hi", fieldType: "quantitative" }).encodeY({ field: "y", fieldType: "quantitative" });
  const early = positions(start.encodeStrokeDash(options));
  const late = positions(start).encodeStrokeDash(options);
  assert.deepEqual(early.graphicSpec, late.graphicSpec);
  atomic(early, p => p.reviseData({ source: "raw", id: "bad", values: values.map(r => ({ ...r, kind: null })) }), /nominal/);
});

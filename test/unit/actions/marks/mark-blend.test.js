import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
const rows = [{ x: 0, y: 2, c: "A", r: "north", text: "First" }, { x: 1, y: 4, c: "B", r: "south", text: "Second" }];
const base = (factory = chart) => factory().createCanvas({ width: 340, height: 260, margin: 30 }).createData({ id: "rows", values: rows });
const recipes = [
  ["bar", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "y" })],
  ["point", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })],
  ["rect", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "r", fieldType: "nominal" })],
  ["arc", p => p.encodeTheta({ field: "c", aggregate: "count" })],
  ["area", p => p.encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: { datum: 0 } }).layoutSeries({ mode: "overlay" })],
  ["text", p => p.encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "text" })],
  ["line", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })],
  ["rule", p => p.encodeX({ field: "x", fieldType: "quantitative" }).encodeYRange({ lower: { datum: 0 }, upper: "y", fieldType: "quantitative" })],
  ["tick", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })]
];
for (const [id, encode] of recipes) {
  const suffix = id[0].toUpperCase() + id.slice(1), create = `create${suffix}Mark`, edit = `edit${suffix}Mark`;
  test(`${id} blend has one semantic owner and survives create, edit, revision and fresh restore`, () => {
    for (const blend of ["multiply", "screen", "difference"]) {
      const p = encode(base()[create]()), snapshot = serializeProgram(p);
      const q = p[edit]({ blend }), fromCreate = encode(base()[create]({ blend }));
      assertEquivalentMeaning(q.graphicSpec, fromCreate.graphicSpec);
      assert.equal(q.semanticSpec.layers[0].mark.blend, blend);
      assert.equal(q.markConfigs[id]?.blend, undefined);
      assert.equal(q.markConfigs[id]?.barAppearance?.blend, undefined);
      assert.ok(q.graphicSpec.objects[id].items.length > 0);
      assert.ok(q.graphicSpec.objects[id].items.every(item => item.properties.blend === blend));
      assert.deepEqual(q.graphicSpec.objects[id].items.map(item => item.identity), p.graphicSpec.objects[id].items.map(item => item.identity));
      assert.match(renderToSVG(q), new RegExp(`mix-blend-mode:${blend}`));
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
      assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(q))), renderToSVG(q));
      for (const replay of [q.editCanvas({ width: 360 }), q[edit]({ opacity: .5 }), q.reviseData({ source: "rows", id: "revised", values: rows.map(row => ({ ...row, y: row.y + 1 })) })]) {
        assert.ok(replay.graphicSpec.objects[id].items.every(item => item.properties.blend === blend));
      }
      const normal = q[edit]({ blend: "normal" });
      assert.deepEqual(normal.graphicSpec, p.graphicSpec);
      assert.deepEqual(normal.semanticSpec, p.semanticSpec);
      assert.equal(serializeProgram(p), snapshot);
    }
  });
  test(`${id} rejects invalid blend atomically before mutation and retains pending intent`, () => {
    const pending = base()[create]({ blend: "screen" });
    assert.equal(pending.semanticSpec.layers[0].mark.blend, "screen");
    const p = encode(pending), snapshot = serializeProgram(p);
    for (const blend of [null, undefined, "source-over", "overlay", 1, false, ""]) {
      assert.throws(() => p[edit]({ blend }), /blend/);
      assert.throws(() => base()[create]({ blend }), /blend/);
    }
    let reads = 0;
    assert.throws(() => p[edit]({ get blend() { reads++; return "screen"; } }), /accessors/);
    assert.equal(reads, 0);
    assert.equal(serializeProgram(p), snapshot);
    assert.deepEqual(p[edit]({ blend: "normal" })[edit]({ blend: "normal" }).semanticSpec.layers[0].mark.blend, undefined);
  });
}

test("Basic marks, labels, bands and annotation facades keep their inherited blend options", () => {
  for (const [id, encode] of recipes.filter(([id]) => ["point", "bar", "rect", "line"].includes(id))) {
    const suffix = id[0].toUpperCase() + id.slice(1);
    const p = encode(base(basicChart)[`create${suffix}Mark`]({ blend: "screen" }));
    assert.ok(p.graphicSpec.objects[id].items.every(item => item.properties.blend === "screen"));
  }
  const p = base().createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  for (const q of [p.createMarkLabels({ field: "text", blend: "multiply" }),
    p.createAnnotation({ text: "Note", anchor: "plot-center", blend: "multiply" }),
    p.createReferenceBand({ y: [2, 3], blend: "multiply" }),
    p.createStatisticalReference({ source: "point", axis: "y", statistics: [{ op: "min" }, { op: "max" }], blend: "multiply" })]) {
    assert.ok(q.graphicSpec.objects[q.context.currentMark].items.every(item => item.properties.blend === "multiply"));
  }
});

test("blend survives conditional opacity, selection restoration and composition without changing item grain", () => {
  const when = { version: 2, registry: "standard@1", root: { type: "parameter", id: "enabled" } };
  for (const [id, encode] of recipes.filter(([id]) => !["arc", "text", "tick"].includes(id))) {
    const suffix = id[0].toUpperCase() + id.slice(1);
    const p = encode(base().createParameter({ id: "enabled", value: true })[`create${suffix}Mark`]({ blend: "multiply" }))
      .encodeOpacity({ conditions: [{ when, value: { value: .25 } }], otherwise: { value: .75 } });
    const q = p.editParameter({ target: "enabled", value: false });
    assert.ok(q.graphicSpec.objects[id].items.every(item => item.properties.blend === "multiply" && item.properties.opacity === .75));
    assert.deepEqual(q.graphicSpec.objects[id].items.map(item => item.identity), p.graphicSpec.objects[id].items.map(item => item.identity));
    const selected = q.selectMarks({ id: "chosen", target: id, rows: { data: "rows", indices: [0] } });
    const highlighted = selected.highlightMarks({ selection: "chosen", opacity: .6, dimOthers: false });
    assert.ok(highlighted.graphicSpec.objects[id].items.every(item => item.properties.blend === "multiply"));
    assert.deepEqual(highlighted.removeMarkHighlight({ selection: "chosen" }).graphicSpec, q.graphicSpec);
  }
  const p = base().createPointMark({ blend: "difference", outline: { color: "white", width: 6 } }).encodeX({ field: "x" }).encodeY({ field: "y" });
  for (const q of [p.facet({ field: "c" }), p.repeatCharts({ target: "point", channel: "y", fields: ["x", "y"] }), hconcat({ programs: [p, p] })]) {
    const next = q.editCompositionLayout({ gap: 30 });
    assert.match(renderToSVG(next), /mix-blend-mode:difference/);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
    for (const child of Object.values(next.children)) assert.ok(child.graphicSpec.objects.point.items.every(item => item.properties.blend === "difference"));
  }
});

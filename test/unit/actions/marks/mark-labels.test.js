import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [{ category: "A", value: 2 }, { category: "B", value: 6 }];
function base() { return chart().createCanvas({ width: 480, height: 360, margin: 50 }).createData({ values: rows }); }
function bars() { return base().createBarPlot({ x: "category", y: { field: "value", aggregate: "sum" }, guides: false }); }
function texts(p, id = "barPlot-labels") { return p.graphicSpec.objects[id].items.map(item => item.properties.text); }

test("mark labels infer source, final values and source-owned identity through visible child actions", () => {
  const source = bars();
  const p = source.createMarkLabels();
  assert.deepEqual(texts(p), ["2", "6"]);
  assert.equal(p.semanticSpec.layers.at(-1).source, "barPlot");
  assert.deepEqual(p.semanticSpec.layers.at(-1).encoding.text, { content: "value", format: "auto" });
  assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op), ["createTextMark", "encodeText"]);
  assert.equal(p.markConfigs["barPlot-labels"].align, "center");
  assert.equal(p.markConfigs["barPlot-labels"].baseline, "middle");
  assert.equal(p.materializationConfigs.labelLayouts?.["barPlot-labels"], undefined);
  assert.equal(source.graphicSpec.objects["barPlot-labels"], undefined);
  assert.throws(() => p.createMarkLabels(), /already exists/);
  assert.deepEqual(texts(p.createMarkLabels({ id: "categories", content: "category" }), "categories"), ["A", "B"]);
});

test("explicit source wins over current data and separate sources own separate default label IDs", () => {
  const p = bars().createData({ id: "other", values: [{ category: "C", value: 9 }] })
    .createBarPlot({ id: "otherBar", x: "category", y: "value", guides: false })
    .createMarkLabels({ source: "barPlot" }).createMarkLabels({ source: "otherBar" });
  assert.deepEqual(texts(p), ["2", "6"]);
  assert.deepEqual(texts(p, "otherBar-labels"), ["9"]);
  assert.equal(p.semanticSpec.layers.find(layer => layer.id === "barPlot-labels").data, "data");
});

test("semantic, raw and constant content use the existing text encoding owner", () => {
  for (const [options, expected] of [
    [{ content: "share", format: ".0%" }, ["25%", "75%"]],
    [{ content: "category" }, ["A", "B"]],
    [{ field: "value", format: ".1f" }, ["2.0", "6.0"]],
    [{ value: "label" }, ["label", "label"]]
  ]) assert.deepEqual(texts(bars().createMarkLabels(options)), expected);
  const point = base().createPointMark().encodeX({ field: "value" }).encodeY({ field: "value" });
  assert.throws(() => point.createMarkLabels(), /Bar or Arc/);
  assert.deepEqual(texts(point.createMarkLabels({ field: "category" }), "point-labels"), ["A", "B"]);
});

test("labels the final coordinate and final row of every line series", () => {
  const p = base()
    .createLineMark({ id: "line" })
    .encodeX({ target: "line", field: "value" })
    .encodeY({ target: "line", field: "value" })
    .createMarkLabels({ source: "line", field: "category", dx: 5 });
  assert.deepEqual(texts(p, "line-labels"), ["B"]);
  const commands = p.graphicSpec.objects.line.items[0].properties.commands;
  const endpoint = commands.at(-1);
  const label = p.graphicSpec.objects["line-labels"].items[0].properties;
  assert.equal(label.x, endpoint.x + 5);
  assert.equal(label.y, endpoint.y);
});

test("incomplete explicit sources retain content and styles until completion", () => {
  const source = base().createBarMark({ id: "bars" });
  const pending = source.createMarkLabels({ source: "bars", fontSize: 18 });
  assert.deepEqual(texts(pending, "bars-labels"), []);
  assert.throws(() => source.createMarkLabels({ source: "bars", layout: {} }), /complete text/);
  const ready = pending.encodeX({ target: "bars", field: "category", fieldType: "nominal" })
    .encodeY({ target: "bars", field: "value", aggregate: "sum" });
  assert.deepEqual(texts(ready, "bars-labels"), ["2", "6"]);
  assert.equal(ready.markConfigs["bars-labels"].fontSize, 18);
  assert.ok(ready.layoutLabels({ target: "bars-labels" }).materializationConfigs.labelLayouts["bars-labels"]);
});

test("label layout is opt-in, lower edits replay it and removal releases its owned resource", () => {
  const source = bars();
  assert.deepEqual(source.createMarkLabels({ layout: false }).graphicSpec, source.createMarkLabels().graphicSpec);
  const args = { content: "share", format: ".0%", layout: { axis: "y", leader: { strokeWidth: 2 } }, fontSize: 16 };
  const original = JSON.stringify(args);
  const p = source.createMarkLabels(args);
  assert.equal(JSON.stringify(args), original);
  assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op), ["createTextMark", "encodeText", "layoutLabels"]);
  const resized = p.editCanvas({ width: 600 }).editTextMark({ target: "barPlot-labels", rotation: 10 })
    .encodeText({ target: "barPlot-labels", content: "value", format: ".0f" });
  assert.deepEqual(texts(resized), ["2", "6"]);
  assert.equal(resized.materializationConfigs.labelLayouts["barPlot-labels"].axis, "y");
  const removed = resized.removeLabelLayout({ target: "barPlot-labels" });
  assert.equal(removed.materializationConfigs.labelLayouts?.["barPlot-labels"], undefined);
  assert.throws(() => removed.removeMark({ target: "barPlot-labels" }), /owned by/);
  const noLabels = removed.removeMark({ target: "barPlot" });
  assert.equal(noLabels.graphicSpec.objects["barPlot-labels"], undefined);
  assert.equal(noLabels.graphicSpec.objects.barPlot, undefined);
});

test("invalid facade options, content, styles and nested layout fail without state or trace changes", () => {
  const source = bars();
  const snapshot = JSON.stringify(source);
  for (const options of [
    { data: "data" }, { text: "alias" }, { target: "barPlot" }, { source: "missing" }, { id: null },
    { field: "value", content: "value" }, { value: "", layout: {} }, { content: "unknown" },
    { normalizeBy: "category" }, { content: "share", normalizeBy: "rows" }, { format: ".13f" },
    { field: "missing" }, { fontSize: -1 }, { opacity: 2 }, { layout: true }, { layout: null },
    { layout: { target: "elsewhere" } }, { layout: { axis: "diagonal" } }, { layout: { padding: -1 } },
    { layout: { leader: { strokeWidth: -1 } } }, { layout: { unknown: 1 } }
  ]) {
    assert.throws(() => source.createMarkLabels(options), undefined, JSON.stringify(options));
    assert.equal(JSON.stringify(source), snapshot);
  }
  assert.throws(() => base().createMarkLabels(), /eligible source/);
  const two = source.createBarPlot({ id: "other", x: "category", y: "value", guides: false })
    .createTextMark({ data: "data", id: "independent" });
  assert.throws(() => two.createMarkLabels(), /ambiguous/);
});

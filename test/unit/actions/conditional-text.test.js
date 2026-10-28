import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { getMarkItems } from "../../../src/inspection.js";
const expression = root => ({ version: 2, registry: "standard@1", root });
const literal = value => ({ type: "literal", value });
const positive = expression({ type: "binary", op: "gt", left: { type: "field", name: "x" }, right: literal(1) });
const condition = (value, otherwise, when = positive) => ({ conditions: [{ when, value }], otherwise });
const rows = [{ x: 1, y: 2, label: "Alpha", shift: -4 }, { x: 3, y: 4, label: "Beta", shift: 8 }];
const base = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "data", values: rows }).createTextMark({ id: "text", data: "data" })
  .encodeX({ field: "x", scale: { domain: [0, 10] } }).encodeY({ field: "y", scale: { domain: [0, 10] } });
const glyphs = program => program.graphicSpec.objects.text.items.map(item => item.properties);

test("conditional text selects native content and format at each row without duplicate intent", () => {
  const original = base(), saved = serializeProgram(original);
  const result = original.encodeText(condition({ field: "x", format: ".1f" }, { field: "label" }));
  assert.deepEqual(glyphs(result).map(item => item.text), ["Alpha", "3.0"]);
  assert.equal(result.semanticSpec.layers[0].encoding.text, undefined);
  assert.deepEqual(getMarkItems(result, { target: "text" }).map(item => item.channels.text), ["Alpha", 3]);
  assert.equal(serializeProgram(original), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(result))), serializeProgram(result));
});

test("conditional text and offsets preserve dormant pixel styles and removal restores them", () => {
  const original = base().encodeText({ field: "label" }).editTextMark({ dx: 2, dy: 3 });
  const result = original.encodeDx(condition({ field: "shift" }, { value: 0 })).encodeDy(condition({ value: -5 }, { value: 7 }));
  assert.deepEqual(glyphs(result).map(item => [item.x, item.y]), [[46, 155], [106, 111]]);
  assert.deepEqual(getMarkItems(result, { target: "text" }).map(item => [item.channels.dx, item.channels.dy]), [[0, 7], [8, -5]]);
  assert.deepEqual(result.removeEncoding({ channel: "dx" }).removeEncoding({ channel: "dy" }).graphicSpec, original.graphicSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
});

test("conditional text parameters, source revisions and ordinary replacements rematerialize", () => {
  const original = base().createParameter({ id: "enabled", value: true }).encodeText(condition({ field: "label" }, { value: "Off" }, expression({ type: "parameter", id: "enabled" })));
  assert.deepEqual(glyphs(original.editParameter({ target: "enabled", value: false })).map(item => item.text), ["Off", "Off"]);
  const revised = original.reviseData({ source: "data", id: "revised", values: rows.map(row => ({ ...row, label: row.label + "!" })) });
  assert.deepEqual(glyphs(revised).map(item => item.text), ["Alpha!", "Beta!"]);
  const ordinary = original.encodeText({ value: "Plain" });
  assert.equal(ordinary.semanticSpec.layers[0].conditionals?.text, undefined);
  assert.deepEqual(glyphs(ordinary).map(item => item.text), ["Plain", "Plain"]);
  assert.equal(original.removeEncoding({ channel: "text" }).graphicSpec.objects.text.items.length, 0);
});

test("conditional text and offset selections use raw membership without recursive geometry", () => {
  const original = base().encodeText({ field: "label" }).selectMarks({ id: "chosen", target: "text", field: "x", op: "gt", value: 1 });
  const result = original.encodeText(condition({ value: "Selected" }, { field: "label" }, { selection: "chosen" }))
    .encodeDx(condition({ value: 12 }, { value: 0 }, { selection: "chosen" }));
  assert.deepEqual(glyphs(result).map(item => [item.text, item.x]), [["Alpha", 46], ["Selected", 110]]);
  const changed = result.editMarkSelection({ selection: "chosen", field: "x", op: "lt", value: 2 });
  assert.deepEqual(glyphs(changed).map(item => [item.text, item.x]), [["Selected", 58], ["Beta", 98]]);
});

test("source labels select semantic shares with the full source denominator", () => {
  const source = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "data", values: [{ category: "A", amount: 2 }, { category: "B", amount: 6 }] })
    .createBarPlot({ id: "bars", x: "category", y: { field: "amount", aggregate: "sum" }, guides: false })
    .createTextMark({ id: "text" });
  const when = expression({ type: "binary", op: "eq", left: { type: "field", name: "category" }, right: literal("B") });
  const result = source.encodeText(condition({ content: "share", format: ".0%" }, { content: "category" }, when));
  assert.deepEqual(glyphs(result).map(item => item.text), ["A", "75%"]);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
  assert.throws(() => result.encodeDx(condition({ value: 1 }, { value: 0 }, when)), /independent Text/i);
});

test("inactive text and offset payloads are validated atomically", () => {
  const original = base().encodeText({ field: "label" }), saved = serializeProgram(original);
  for (const value of [{ field: "absent" }, { field: "label", format: ".1f" }, { content: "share" }, { value: "" }]) {
    assert.throws(() => original.encodeText(condition(value, { value: "OK" }, expression(literal(false)))));
  }
  assert.throws(() => original.encodeDx(condition({ field: "label" }, { value: 0 }, expression(literal(false)))));
  assert.equal(serializeProgram(original), saved);
});

test("atomic channel assignment accepts text and pixel conditionals in native order", () => {
  const original = base();
  const channels = { text: condition({ field: "label" }, { value: "Other" }), dx: condition({ field: "shift" }, { value: 0 }), dy: condition({ value: 1 }, { value: -1 }) };
  const together = original.encodeChannels({ target: "text", channels });
  const separate = original.encodeText(channels.text).encodeDx(channels.dx).encodeDy(channels.dy);
  assert.deepEqual(together.graphicSpec, separate.graphicSpec);
});

test("constant conditional anchors keep one glyph while field and predicate rows establish row grain", () => {
  const constant = chart().createCanvas().createData({ values: rows }).createTextMark({ id: "text" })
    .encodeX({ datum: 5 }).encodeY({ datum: 5 });
  const when = expression(literal(true));
  assert.equal(glyphs(constant.encodeText(condition({ value: "A" }, { value: "B" }, when))).length, 1);
  assert.deepEqual(glyphs(constant.encodeText(condition({ value: "A" }, { value: "B" }))).map(item => item.text), ["B", "A"]);
  const empty = chart().createCanvas().createData({ values: [] }).createTextMark({ id: "text" })
    .encodeX({ datum: 5 }).encodeY({ datum: 5 }).encodeText(condition({ value: "A" }, { value: "B" }, when));
  assert.deepEqual(glyphs(empty).map(item => item.text), ["A"]);
});

test("text branch reassignment retains native formatting and malformed persisted branches reject", () => {
  const original = base().encodeText({ field: "x", format: ".2f" });
  const result = original.encodeText(condition({ field: "y" }, { value: 1 }));
  assert.deepEqual(glyphs(result).map(item => item.text), ["1.00", "4.00"]);
  const changed = result.encodeText(condition({ field: "x" }, { value: 2 }));
  assert.deepEqual(glyphs(changed).map(item => item.text), ["2.00", "3.00"]);
  assert.throws(() => serializeProgram(result.editSemantic({ property: "layer[text].conditionals.text", value: { ...result.semanticSpec.layers[0].conditionals.text, otherwise: { datum: 1, field: "x", format: "auto" } } })), /exactly one/);
});

test("empty constant text conditionals compose with appearance and retain a constant item identity", () => {
  const program = chart().createCanvas().createData({ values: [] }).createTextMark({ id: "text" })
    .encodeX({ datum: 1 }).encodeY({ datum: 1 })
    .encodeText(condition({ value: "A" }, { value: "B" }, expression(literal(true))))
    .encodeColor(condition({ value: "red" }, { value: "blue" }, expression(literal(true))));
  assert.deepEqual(glyphs(program).map(item => [item.text, item.fill]), [["A", "red"]]);
  assert.deepEqual(getMarkItems(program, { target: "text" }).map(item => item.channels.text), ["A"]);
});

test("skipped conditional offset rows keep the surviving source identity", () => {
  const program = chart().createCanvas().createData({ id: "data", values: [
    { key: "omit", x: 1, shift: null }, { key: "keep", x: 2, shift: 4 }
  ], keyField: "key" }).createTextMark({ id: "text", missing: "skip" })
    .encodeX({ field: "x" }).encodeY({ datum: 0 }).encodeText({ field: "key" })
    .encodeDx(condition({ field: "shift" }, { value: 0 }, expression(literal(true))));
  const items = getMarkItems(program, { target: "text" });
  assert.deepEqual(items.map(item => item.fields.key), ["keep"]);
  assert.deepEqual(glyphs(program).map(item => item.text), ["keep"]);
  assert.deepEqual(items[0].rows.map(row => row.rowKey), [program.semanticSpec.datasets[0].rowKeys[1]]);
});

test("conditional color materializes before concrete text validation for rows and attached labels", () => {
  const original = base().encodeText({ field: "label" }).selectMarks({ id: "chosen", target: "text", field: "x", op: "gt", value: 1 });
  const colored = original.encodeColor(condition({ value: "red" }, { value: "blue" }, { selection: "chosen" }));
  assert.deepEqual(glyphs(colored).map(item => item.fill), ["blue", "red"]);
  assert.deepEqual(glyphs(colored.editMarkSelection({ selection: "chosen", field: "x", op: "lt", value: 2 })).map(item => item.fill), ["red", "blue"]);
  const source = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .createMarkLabels({ id: "text", source: "points", field: "x" });
  assert.deepEqual(glyphs(source.encodeColor(condition({ value: "red" }, { value: "blue" }))).map(item => item.fill), ["blue", "red"]);
});

test("labels on conditional stacked measures use each selected aggregate and its mapped endpoint", () => {
  const program = chart().createCanvas({ width: 300, height: 200, margin: 20 }).createData({ values: [
    { category: "one", group: "A", a: 10, b: 0, selected: true },
    { category: "one", group: "B", a: 0, b: 10, selected: false }
  ] }).createBarMark({ id: "bars" }).encodeGroup({ field: "group" })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "b", aggregate: "sum", scale: { id: "measure", nice: false } }).layoutSeries({ mode: "stack" })
    .encodeY(condition({ field: "a", aggregate: "sum", scale: { id: "measure", nice: false } },
      { field: "b", aggregate: "sum", scale: { id: "measure", nice: false } }, expression({ type: "field", name: "selected" })));
  for (const [content, format, expected] of [["value", "auto", ["10", "10"]], ["share", ".0%", ["50%", "50%"]], ["category", "auto", ["one", "one"]]]) {
    const labeled = program.createMarkLabels({ id: "text", source: "bars", content, format });
    assert.deepEqual(glyphs(labeled).map(item => item.text), expected);
    assert.deepEqual(glyphs(labeled).map(item => item.y), [100, 20]);
  }
  const placed = program.createMarkLabels({ id: "text", source: "bars", content: "value", placement: { anchor: "insideEnd", overflow: "allow", gap: 2 } });
  assert.deepEqual(glyphs(placed).map(item => item.text), ["10", "10"]);
  assert.deepEqual(deserializeProgram(serializeProgram(placed)).graphicSpec, placed.graphicSpec);
});

test("conditional semantic text inspection keeps the full source denominator for a label subset", () => {
  const source = chart().createCanvas().createData({ values: [{ category: "A", amount: 2 }, { category: "B", amount: 6 }] })
    .createBarPlot({ id: "bars", x: "category", y: { field: "amount", aggregate: "sum" }, guides: false })
    .createMarkLabels({ id: "text", source: "bars", value: "x", select: { field: "category", op: "eq", value: "B" } });
  const result = source.encodeText(condition({ content: "share", format: ".0%" }, { content: "value" }, expression(literal(true))));
  assert.deepEqual(glyphs(result).map(item => item.text), ["75%"]);
  assert.deepEqual(getMarkItems(result, { target: "text" }).map(item => item.channels.text), [0.75]);
});


test("conditional positions can precede independent text content without materializing pending glyphs", () => {
  const original = base();
  const positioned = original.encodeX(condition({ field: "y" }, { field: "x" }))
    .encodeY(condition({ field: "x" }, { field: "y" }));
  assert.equal(positioned.graphicSpec.objects.text.items.length, 0);
  const result = positioned.encodeText({ field: "label" });
  assert.deepEqual(glyphs(result).map(item => [item.text, item.x, item.y]), [["Alpha", 46, 148], ["Beta", 124, 132]]);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
});


test("source label position selections reject feedback into the source's conditional position", () => {
  const original = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ values: [{ category: "A", amount: 2 }, { category: "B", amount: 6 }] })
    .createBarPlot({ id: "bars", x: "category", y: { field: "amount", aggregate: "sum" }, guides: false })
    .createTextMark({ id: "labels" }).encodeText({ content: "value" })
    .selectMarks({ id: "low", target: "labels", property: "y", op: "lt", value: 100 });
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeY({ target: "bars", ...condition({ field: "amount", aggregate: "mean" }, { field: "amount", aggregate: "sum" }, { selection: "low" }) }), /Cyclic conditional/);
  assert.equal(serializeProgram(original), saved);
  assert.doesNotThrow(() => original.encodeColor({ target: "bars", ...condition({ value: "red" }, { value: "blue" }, { selection: "low" }) }));
});


test("empty conditional field text omits glyphs while preserving surviving source identity", () => {
  const original = chart().createCanvas().createData({ values: [{ x: 1, label: "" }, { x: 2, label: "Visible" }] })
    .createTextMark({ id: "text" }).encodeX({ field: "x" }).encodeY({ datum: 0 });
  const result = original.encodeText(condition({ field: "label" }, { value: "Other" }, expression(literal(true))));
  assert.deepEqual(glyphs(result).map(item => item.text), ["Visible"]);
  assert.deepEqual(getMarkItems(result, { target: "text" }).map(item => item.fields.x), [2]);
  assert.equal(result.graphicSpec.objects.text.items[0].identity.lineage.rowKeys.length, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
});


test("line labels follow conditional vertex endpoints without evaluating row predicates at series grain", () => {
  const line = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ values: [{ x: 1, y: 2, alternate: 8, label: "First" }, { x: 3, y: 4, alternate: 6, label: "Last" }] })
    .createLineMark({ id: "line" }).encodeX({ field: "x", scale: { domain: [0, 10] } })
    .encodeY({ field: "y", scale: { domain: [0, 10] } })
    .encodeY(condition({ field: "alternate" }, { field: "y" }));
  const result = line.createTextMark({ id: "text" }).encodeText({ field: "label" });
  assert.deepEqual(glyphs(result).map(item => [item.text, item.x, item.y]), [["Last", 98, 84]]);
  assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec, result.graphicSpec);
});

import test from "node:test";
import assert from "node:assert/strict";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { chart, hconcat } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { collectResourceReferences } from "../../../src/core/resourceReferences.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const when = expression(binary("gte", field("x"), literal(2)));
const condition = (value, otherwise, predicate = when) => ({ conditions: [{ when: predicate, value }], otherwise });
const items = program => program.graphicSpec.objects.points.items;
const layer = program => program.semanticSpec.layers.find(item => item.id === "points");
function base() { return chart().createCanvas({ width: 400, height: 300, margin: 50 })
  .createData({ id: "raw", values: [{ id: "a", x: 1, y: 2, group: "A" }, { id: "b", x: 2, y: 4, group: "B" }, { id: "c", x: 3, y: 6, group: "C" }], keyField: "id" })
  .createScatterPlot({ id: "points", data: "raw", x: "x", y: "y" }); }

test("conditional categorical appearance retains source order when aggregate cells reorder categories", () => {
  const values = [
    { category: "one", group: "A", value: 2 },
    { category: "two", group: "B", value: 3 },
    { category: "one", group: "C", value: 5 },
    { category: "two", group: "A", value: 7 }
  ];
  for (const layout of ["stack", "group", "overlay"]) {
    const initial = chart().createCanvas({ width: 600, height: 400, margin: 60 })
      .createData({ id: "raw", values })
      .createBarPlot({ id: "bars", data: "raw", x: { field: "category", fieldType: "nominal" },
        y: { field: "value", aggregate: "sum" }, guides: false });
    const binding = { field: "group", layout, scale: { id: "groups" } };
    const ordinary = initial.encodeColor({ target: "bars", ...binding });
    const saved = serializeProgram(ordinary);
    assert.deepEqual(ordinary.resolvedScales.groups.domain, ["A", "B", "C"]);
    for (const predicate of [false, true]) {
      const conditional = condition(binding, binding, expression(literal(predicate)));
      for (const result of [ordinary.encodeColor({ target: "bars", ...conditional }),
        ordinary.encodeChannels({ target: "bars", channels: { color: conditional } })]) {
        assert.deepEqual(result.resolvedScales.groups.domain, ["A", "B", "C"]);
        assert.deepEqual(result.graphicSpec.objects.bars.items, ordinary.graphicSpec.objects.bars.items);
        const withLegend = result.createLegend({ target: "bars", channels: ["color"] });
        assert.deepEqual(withLegend.guideConfigs.legend.color.domain, ["A", "B", "C"]);
        const restored = deserializeProgram(serializeProgram(withLegend)).editCanvas({ width: 700 });
        assert.deepEqual(restored.resolvedScales.groups.domain, ["A", "B", "C"]);
      }
    }
    assert.equal(serializeProgram(ordinary), saved);
  }
});

test("constant and conditional stroke widths preserve an existing conditional stroke owner", () => {
  const original = base().encodeStroke(condition({ value: "red" }, { value: "blue" }));
  for (const result of [original.encodeStrokeWidth({ value: 2 }),
    original.encodeStrokeWidth(condition({ value: 2 }, { value: 1 }))]) {
    assert.equal(result.markConfigs.points.stroke, undefined);
    assert.deepEqual(items(result).map(item => item.properties.stroke), ["blue", "red", "red"]);
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(result)));
  }
  const reverse = base().encodeStrokeWidth(condition({ value: 2 }, { value: 1 }))
    .encodeStroke(condition({ value: "red" }, { value: "blue" }));
  assert.deepEqual(items(reverse).map(item => item.properties.strokeWidth), [1, 2, 2]);
  assert.equal(reverse.markConfigs.points.stroke, undefined);
});

test("conditional appearance is first-match with required otherwise and an exact zero", () => {
  const original = base(), saved = serializeProgram(original);
  const result = original.encodeOpacity({ target: "points", conditions: [
    { when, value: { value: 0 } }, { when: expression(literal(true)), value: { value: 0.25 } }
  ], otherwise: { value: 1 } });
  assert.deepEqual(items(result).map(item => item.properties.opacity), [0.25, 0, 0]);
  assert.equal(layer(result).encoding.opacity, undefined);
  assert.equal(result.markConfigs.points.opacity, undefined);
  assert.equal(serializeProgram(original), saved);
  assert.throws(() => original.encodeOpacity({ conditions: [{ when, value: { value: 0 } }] }), /otherwise/);
});

test("all inactive fields, values and resource references are checked before state changes", () => {
  const original = base(), saved = serializeProgram(original);
  assert.throws(() => original.encodeOpacity(condition({ value: 0 }, { value: -1 }, expression(literal(true)))), /opacity/i);
  assert.throws(() => original.encodeOpacity(condition({ value: 0 }, { field: "absent" }, expression(literal(true)))), /absent/);
  assert.throws(() => original.encodeOpacity(condition({ value: 0 }, { value: 1 }, expression(parameter("absent")))), /resource/);
  assert.equal(serializeProgram(original), saved);
});

test("all branch fields contribute scale domains and references without filtering the population", () => {
  const result = base().encodeColor(condition({ field: "group", scale: { id: "branch" } }, { value: "pink" }));
  assert.deepEqual(result.resolvedScales.branch.domain, ["A", "B", "C"]);
  assert.deepEqual(items(result).map(item => item.properties.fill), ["pink", "#f58518", "#e45756"]);
  assert.equal(collectResourceReferences(result, { kind: "scale", id: "branch" }).some(ref => ref.ownerId === "points"), true);
  assert.throws(() => result.removeScale({ id: "branch" }), /reference|consumer|used/i);
  assert.doesNotThrow(() => result.removeEncoding({ target: "points", channel: "color" }).removeScale({ id: "branch" }));
});

test("conditional-only parameter edits and fresh-process-compatible restoration rebind exact revisions", () => {
  const original = base().createParameter({ id: "on", value: true }).encodeOpacity(condition({ value: 0 }, { value: 1 }, expression(parameter("on"))));
  const saved = serializeProgram(original), result = deserializeProgram(saved).editParameter({ target: "on", value: false });
  assert.deepEqual(items(result).map(item => item.properties.opacity), [1, 1, 1]);
  assert.equal(layer(result).conditionals.opacity.parameterInputs[0].revision, 1);
  assert.equal(serializeProgram(original), saved);
  assert.throws(() => result.removeParameter({ id: "on" }), /referenced/i);
  assert.doesNotThrow(() => result.removeEncoding({ channel: "opacity" }).removeParameter({ id: "on" }));
});

test("explicit selections revise conditionals and cannot be removed while referenced", () => {
  const original = base().selectMarks({ id: "chosen", target: "points", field: "x", op: "gte", value: 2 })
    .encodeOpacity(condition({ value: 0 }, { value: 1 }, { selection: "chosen" }));
  assert.deepEqual(items(original).map(item => item.properties.opacity), [1, 0, 0]);
  const result = original.editMarkSelection({ selection: "chosen", field: "x", op: "gte", value: 3 });
  assert.deepEqual(items(result).map(item => item.properties.opacity), [1, 1, 0]);
  assert.equal(layer(result).conditionals.opacity.selectionInputs[0].revision, 1);
  assert.throws(() => result.removeMarkSelection({ selection: "chosen" }), /referenced/);
  assert.doesNotThrow(() => result.removeEncoding({ channel: "opacity" }).removeMarkSelection({ selection: "chosen" }));
});

test("a conditional cannot read its own output through a selection predicate", () => {
  const original = base().encodeOpacity({ value: 0.5 }).selectMarks({ id: "chosen", target: "points", property: "opacity", op: "gte", value: 0.5 });
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeOpacity(condition({ value: 0 }, { value: 1 }, { selection: "chosen" })), /Cyclic/);
  assert.equal(serializeProgram(original), saved);
});

test("point size shape and angle use selected values before concrete geometry", () => {
  const result = base().encodeSize(condition({ value: Math.PI * 100 }, { value: Math.PI * 4 }))
    .encodeShape(condition({ value: "square" }, { value: "circle" }))
    .encodeAngle(condition({ value: 45 }, { value: 0 }));
  assert.equal(items(result)[0].type, "circle");
  assert.equal(items(result)[0].properties.radius, 2);
  assert.equal(items(result)[1].type, "path");
  assert.equal(result.markConfigs.points?.radius, undefined);
  const ordinary = result.encodeSize({ value: Math.PI * 9 });
  assert.equal(layer(ordinary).conditionals.size, undefined);
  assert.equal(ordinary.markConfigs.points.radius, 3);
});

test("unique conditional bindings create legends and ambiguous replacements fail atomically", () => {
  const canvas = base().editCanvas({ margin: { right: 180, left: 60, top: 60, bottom: 60 }, width: 600 });
  const first = canvas.encodeColor(condition({ field: "group", scale: { id: "groups" } }, { value: "pink" }))
    .createLegend({ target: "points", channels: ["color"] });
  assert.equal(first.guideConfigs.legend.color.field, "group");
  assert.deepEqual(first.guideConfigs.legend.color.scales, ["groups"]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(first)));
  const saved = serializeProgram(first);
  assert.throws(() => first.encodeColor(condition({ field: "group", scale: { id: "one" } }, { field: "id", scale: { id: "two" } })), /legend|ambiguous/i);
  assert.equal(serializeProgram(first), saved);
  const ambiguous = canvas.encodeColor(condition({ field: "group" }, { field: "id" }));
  assert.throws(() => ambiguous.createLegend({ target: "points", channels: ["color"] }), /ambiguous/i);
});

test("parameter filters refresh aggregate scales, legends and conditional appearance together", () => {
  const cutoff = expression(binary("gte", field("x"), parameter("minimum")));
  let original = chart().createCanvas({ width: 600, height: 400, margin: { left: 50, right: 180, top: 40, bottom: 50 } })
    .createData({ id: "raw", values: [{ group: "A", x: 1, y: 2 }, { group: "A", x: 2, y: 4 }, { group: "B", x: 3, y: 8 }] })
    .createParameter({ id: "minimum", value: 1 }).filterData({ id: "filtered", where: cutoff })
    .createScatterPlot({ id: "points", data: "filtered", x: "x", y: "y" })
    .encodeColor(condition({ field: "group", scale: { id: "groups" } }, { value: "pink" }))
    .encodeOpacity(condition({ value: 0 }, { value: 1 }, expression(binary("gte", field("x"), parameter("minimum")))))
    .createLegend({ target: "points", channels: ["color"] });
  const revised = original.editParameter({ target: "minimum", value: 3 });
  assert.equal(items(revised).length, 1);
  assert.equal(items(revised)[0].properties.opacity, 0);
  assert.deepEqual(revised.resolvedScales.groups.domain, ["B"]);
  assert.deepEqual(revised.guideConfigs.legend.color.domain, ["B"]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("grouped line and aggregate bar conditionals use their final item grain", () => {
  const source = chart().createCanvas({ width: 500, height: 400, margin: 60 })
    .createData({ id: "raw", values: [{ group: "A", x: 1, y: 2 }, { group: "A", x: 2, y: 4 }, { group: "B", x: 1, y: 3 }, { group: "B", x: 2, y: 6 }] });
  const groupA = expression(binary("eq", field("group"), literal("A")));
  const line = source.createLineMark({ id: "lines" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeGroup({ field: "group" })
    .encodeColor(condition({ value: "red" }, { value: "blue" }, groupA));
  assert.deepEqual(line.graphicSpec.objects.lines.items.map(item => item.properties.stroke), ["red", "blue"]);
  assert.throws(() => line.encodeOpacity(condition({ value: 0 }, { value: 1 }, when)), /final item grain/);
  const bar = source.createBarPlot({ id: "bars", x: { field: "group", fieldType: "nominal" }, y: { field: "y", aggregate: "sum" } })
    .encodeOpacity(condition({ value: 0 }, { value: 0.5 }, groupA));
  assert.deepEqual(bar.graphicSpec.objects.bars.items.map(item => item.properties.opacity), [0, 0.5]);
  const revised = bar.reviseData({ source: "raw", id: "next", values: [{ group: "A", x: 1, y: 2 }] });
  assert.deepEqual(revised.graphicSpec.objects.bars.items.map(item => item.properties.opacity), [0]);
});

test("channel selections inspect the chosen raw branch value and reject feedback cycles", () => {
  const original = base().encodeOpacity(condition({ value: 0 }, { value: 1 }))
    .selectMarks({ id: "transparent", target: "points", channel: "opacity", op: "eq", value: 0 })
    .encodeColor(condition({ value: "red" }, { value: "blue" }, { selection: "transparent" }));
  assert.deepEqual(items(original).map(item => item.properties.fill), ["blue", "red", "red"]);
  const saved = serializeProgram(original);
  assert.throws(() => original.encodeOpacity(condition({ value: 0 }, { value: 1 }, { selection: "transparent" })), /Cyclic/);
  assert.equal(serializeProgram(original), saved);
});

test("conditional selection dependencies refresh transitively in dependency order", () => {
  const add = (p, id) => p.createPointMark({ id, data: "raw" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  let original = add(add(base(), "third"), "source").createParameter({ id: "on", value: true })
    .encodeOpacity({ target: "source", ...condition({ value: 0 }, { value: 1 }, expression(parameter("on"))) })
    .selectMarks({ id: "sourceChoice", target: "source", property: "opacity", op: "eq", value: 0 })
    .encodeColor({ target: "points", ...condition({ value: "red" }, { value: "blue" }, { selection: "sourceChoice" }) })
    .selectMarks({ id: "middleChoice", target: "points", property: "fill", op: "eq", value: "red" })
    .encodeColor({ target: "third", ...condition({ value: "green" }, { value: "purple" }, { selection: "middleChoice" }) });
  assert.deepEqual(original.graphicSpec.objects.third.items.map(item => item.properties.fill), ["green", "green", "green"]);
  const revised = original.editParameter({ target: "on", value: false });
  assert.deepEqual(items(revised).map(item => item.properties.fill), ["blue", "blue", "blue"]);
  assert.deepEqual(revised.graphicSpec.objects.third.items.map(item => item.properties.fill), ["purple", "purple", "purple"]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("named dash branches normalize through the ordinary dash owner", () => {
  const original = base().createLineMark({ id: "line", data: "raw" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeStrokeDash(condition({ value: "dashed" }, { value: "solid" }, expression(literal(true))));
  assert.deepEqual(original.graphicSpec.objects.line.items[0].properties.strokeDash, [6, 4]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(original)));
  const envelope = JSON.parse(serializeProgram(original)), state = decodeValue(envelope.payload);
  state.semanticSpec.layers.find(layer => layer.id === "line").conditionals.strokeDash.conditions[0].value.value = "dashed";
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /normalized dash array/);
});

test("discretized size branches retain numeric scale roles across creation and mixed scale reassignment", () => {
  for (const type of ["quantile", "quantize", "threshold"]) {
    const scale = { type, range: [4, 16], ...(type === "threshold" ? { domain: [2] } : {}) };
    const original = base().encodeSize(condition({ field: "x", scale }, { value: 0 }));
    assert.deepEqual(items(original).map(item => item.properties.radius), [0, Math.sqrt(16 / Math.PI), Math.sqrt(16 / Math.PI)]);
    const revised = original.encodeSize(condition({ field: "x", scale: { range: [9, 25] } }, { field: "x", scale: { id: "other-size", ...scale } }));
    assert.deepEqual(items(revised).map(item => item.properties.radius), [Math.sqrt(4 / Math.PI), Math.sqrt(25 / Math.PI), Math.sqrt(25 / Math.PI)]);
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
  }
});

test("conditional values retain item identity after highlighted items move to the front", () => {
  const original = base().highlightMarks({ id: "front", target: "points", select: { field: "x", op: "eq", value: 1 }, color: "green" })
    .encodeOpacity(condition({ value: 0 }, { value: 1 }));
  const values = new Map(items(original).map(item => [item.identity.lineage.rowKeys[0], item.properties.opacity]));
  const data = original.semanticSpec.datasets[0];
  assert.deepEqual(data.rowKeys.map(key => values.get(key)), [1, 0, 0]);
});

test("restore rejects duplicate channel owners and incompatible inactive branch scale roles", () => {
  const original = base().encodeOpacity(condition({ field: "x", scale: { id: "fade" } }, { value: 0 }));
  const malformed = mutate => {
    const envelope = JSON.parse(serializeProgram(original)), state = decodeValue(envelope.payload);
    mutate(state); envelope.payload = encodeValue(state); return JSON.stringify(envelope);
  };
  assert.throws(() => deserializeProgram(malformed(state => {
    state.semanticSpec.layers[0].encoding.opacity = { field: "x", fieldType: "quantitative", scale: "fade" };
  })), /same channel/);
  assert.throws(() => deserializeProgram(malformed(state => {
    state.semanticSpec.layers[0].conditionals.opacity.otherwise = { field: "group", fieldType: "nominal", scale: "fade" };
  })), /quantitative/);
  assert.throws(() => deserializeProgram(malformed(state => {
    state.semanticSpec.scales.find(scale => scale.id === "fade").type = "time";
  })), /scale type/);
});

test("derived field renames rebind branch fields and predicates while retaining string literals", () => {
  const original = chart().createCanvas({ width: 500, height: 400, margin: 60 })
    .createData({ id: "raw", values: [{ group: "A", y: 2 }, { group: "B", y: 6 }] })
    .createSummaryData({ id: "summary", source: "raw", groupBy: ["group"], aggregates: [{ op: "sum", field: "y", as: "total" }] })
    .createPointMark({ id: "points", data: "summary" }).encodeX({ field: "total" }).encodeY({ field: "total" })
    .selectMarks({ id: "chosen", target: "points", field: "total", op: "gte", value: 4 })
    .encodeOpacity(condition({ field: "total" }, { value: 0 }, expression(binary("gte", field("total"), literal(4)))))
    .encodeColor(condition({ value: "red" }, { value: "blue" }, { selection: "chosen" }));
  const revised = original.editSummaryData({ target: "summary", aggregates: [{ op: "sum", field: "y", as: "amount" }] });
  assert.equal(layer(revised).conditionals.opacity.conditions[0].value.field, "amount");
  assert.equal(layer(revised).conditionals.opacity.conditions[0].when.root.left.name, "amount");
  assert.equal(layer(revised).conditionals.color.selectionInputs[0].revision, 1);
  assert.deepEqual(items(revised).map(item => item.properties.fill), ["blue", "red"]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(revised)));
});

test("continuous Tick color supports conditional branch fields and explicit selection references remain inspectable", () => {
  const original = chart().createCanvas({ width: 400, height: 300, margin: 40 }).createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createTickMark({ id: "ticks" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor(condition({ field: "x", fieldType: "quantitative" }, { field: "y", fieldType: "quantitative" }));
  assert.equal(original.graphicSpec.objects.ticks.items.every(item => typeof item.properties.stroke === "string"), true);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(original)));
  const selected = base().selectMarks({ id: "chosen", target: "points", field: "x", op: "gte", value: 2 })
    .encodeOpacity(condition({ value: 0 }, { value: 1 }, { selection: "chosen" }));
  assert.equal(collectResourceReferences(selected, { kind: "selection", id: "chosen" }).some(ref => ref.ownerId === "points"), true);
});

test("conditional branch reassignment retains its scale id and follows ordinary scale edit semantics", () => {
  const original = base().encodeOpacity(condition({ field: "x", scale: { id: "fade", range: [0, 0.5] } }, { value: 0 }));
  const saved = serializeProgram(original);
  const revised = original.encodeOpacity(condition({ field: "x", scale: { range: [0.5, 1] } }, { value: 0 }));
  assert.equal(layer(revised).conditionals.opacity.conditions[0].value.scale, "fade");
  assert.deepEqual(revised.resolvedScales.fade.range, [0.5, 1]);
  assert.deepEqual(items(revised).map(item => item.properties.opacity), [0, 0.75, 1]);
  assert.equal(serializeProgram(original), saved);
});

test("empty conditional branch domains require explicit policy and recover when a filter refills", () => {
  const filtered = scale => chart().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ id: "raw", values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
    .createParameter({ id: "minimum", value: 1 })
    .filterData({ id: "selected", where: expression(binary("gte", field("x"), parameter("minimum"))) })
    .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 3] } }).encodeY({ field: "y", scale: { domain: [0, 6] } })
    .encodeOpacity(condition({ field: "x", scale }, { value: 0 }));
  const defaultPolicy = filtered({}), saved = serializeProgram(defaultPolicy);
  assert.throws(() => defaultPolicy.editParameter({ target: "minimum", value: 10 }), /domain|empty/i);
  assert.equal(serializeProgram(defaultPolicy), saved);
  for (const scale of [{ emptyDomain: "preserve" }, { domain: [0, 3] }]) {
    const original = filtered(scale), empty = original.editParameter({ target: "minimum", value: 10 });
    assert.equal(items(empty).length, 0);
    assert.deepEqual(empty.resolvedScales["points-opacity-condition-0"].domain, original.resolvedScales["points-opacity-condition-0"].domain);
    const restored = deserializeProgram(serializeProgram(empty)).editParameter({ target: "minimum", value: 1 });
    assert.equal(items(restored).length, 2);
  }
});

test("linked overlays use conditional glyph anchors and preserve their aggregate item values", () => {
  const source = base().encodeShape(condition({ value: "arrow" }, { value: "triangle-up" }))
    .encodeAngle(condition({ value: 45 }, { value: 0 }))
    .createOverlay({ id: "join", source: "points", type: "line", orderBy: "x" });
  assert.equal(source.graphicSpec.objects.join.items.length, 1);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(source)));
  const aggregate = chart().createCanvas({ width: 500, height: 400, margin: 50 })
    .createData({ values: [{ group: "A", y: 2 }, { group: "A", y: 4 }, { group: "B", y: 1 }] })
    .createBarPlot({ id: "bars", x: { field: "group", fieldType: "nominal" }, y: { field: "y", aggregate: "sum" } })
    .createOverlay({ id: "dots", source: "bars", type: "point" })
    .encodeColor({ target: "dots", ...condition({ value: "red" }, { value: "blue" }, expression(binary("gte", field("y"), literal(5)))) })
    .encodeSize({ target: "dots", ...condition({ value: Math.PI * 25 }, { value: Math.PI * 4 }, expression(binary("gte", field("y"), literal(5)))) });
  assert.deepEqual(aggregate.graphicSpec.objects.dots.items.map(item => [item.properties.fill, item.properties.radius]), [["red", 5], ["blue", 2]]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(aggregate)));
  for (const source of [base().encodeShape(condition({ value: "arrow" }, { value: "circle" })),
    base().encodeAngle(condition({ value: 90 }, { value: 0 }))]) {
    assert.doesNotThrow(() => source.createOverlay({ id: "join", source: "points", type: "line", orderBy: "x" }));
  }
});

test("conditional temporal color, aggregate color and stroke width share ordinary channel units", () => {
  const temporal = base().encodeStroke(condition({ field: "x", fieldType: "temporal", temporalUnit: "timestamp" }, { value: "black" }));
  assert.equal(layer(temporal).conditionals.stroke.conditions[0].value.temporalUnit, "timestamp");
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(temporal)));
  const bars = chart().createCanvas({ width: 500, height: 400, margin: 50 })
    .createData({ values: [{ group: "A", y: 2 }, { group: "A", y: 4 }, { group: "B", y: 1 }] })
    .createBarPlot({ id: "bars", x: { field: "group", fieldType: "nominal" }, y: { field: "y", aggregate: "sum" } })
    .encodeColor(condition({ field: "y", fieldType: "quantitative", aggregate: "sum" }, { value: "blue" }, expression(binary("eq", field("group"), literal("A")))))
    .encodeStrokeWidth(condition({ value: 2 }, { value: 0 }, expression(binary("eq", field("group"), literal("A")))));
  assert.deepEqual(bars.resolvedScales["bars-color-condition-0"].domain, [1, 6]);
  assert.deepEqual(bars.graphicSpec.objects.bars.items.map(item => item.properties.strokeWidth), [2, 0]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(bars)));
});

test("conditional parameters retain their scope through facets, repeats and explicit concat child targets", () => {
  const unit = base().createParameter({ id: "on", value: true })
    .encodeOpacity(condition({ field: "x", scale: { id: "fade" } }, { value: 0 }, expression(parameter("on"))));
  const facets = unit.facet({ id: "panels", field: "group" });
  for (const child of Object.values(facets.children)) assert.deepEqual(child.resolvedScales.fade.domain, [1, 3]);
  const revised = deserializeProgram(serializeProgram(facets)).editParameter({ target: "on", value: false });
  for (const child of Object.values(revised.children)) {
    assert.equal(layer(child).conditionals.opacity.parameterInputs[0].revision, 1);
    assert.deepEqual(items(child).map(item => item.properties.opacity), [0]);
  }
  const repeated = unit.repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["x", "y"] })
    .editParameter({ target: "on", value: false });
  for (const child of Object.values(repeated.children)) assert.deepEqual(items(child).map(item => item.properties.opacity), [0, 0, 0]);
  const joined = hconcat({ programs: [{ id: "left", program: unit }, { id: "right", program: unit }] });
  const scoped = joined.editParameter({ target: { childPath: ["left"], id: "on" }, value: false });
  assert.deepEqual(items(scoped.children.left).map(item => item.properties.opacity), [0, 0, 0]);
  assert.equal(scoped.children.right, joined.children.right);
});

test("replacing a conditional releases its shared domain contribution and refreshes surviving consumers", () => {
  const original = base().createData({ id: "other", values: [{ x: 8, y: 8, group: "Z" }] })
    .createPointMark({ id: "otherPoints", data: "other" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "group", scale: { id: "groups" } })
    .encodeColor({ target: "points", ...condition({ field: "group", scale: { id: "groups" } }, { value: "pink" }) });
  assert.deepEqual(original.resolvedScales.groups.domain, ["A", "B", "C", "Z"]);
  for (const revised of [original.encodeColor({ target: "points", value: "red" }),
    original.encodeColor({ target: "points", ...condition({ value: "red" }, { value: "blue" }) })]) {
    assert.deepEqual(revised.resolvedScales.groups.domain, ["Z"]);
    assert.equal(revised.graphicSpec.objects.otherPoints.items[0].properties.fill, "#4c78a8");
  }
});

test("optional missing fields retain expression and explicit scale unknown semantics", () => {
  const original = chart().createCanvas({ width: 400, height: 300, margin: 40 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4, optional: 2 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y" })
    .encodeOpacity(condition({ value: 0 }, { value: 1 }, expression(binary("gt", field("optional"), literal(1)))));
  assert.deepEqual(items(original).map(item => item.properties.opacity), [1, 0]);
  const mapped = original.encodeOpacity(condition({ field: "optional", scale: { domain: [0, 2], unknown: 0.1 } }, { value: 0 }, expression(literal(true))));
  assert.deepEqual(items(mapped).map(item => item.properties.opacity), [0.1, 1]);
});


test("conditional density-area color materializes valid fills before concrete graphic validation", () => {
  const original = chart().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ id: "raw", values: [
      { x: 1, group: "A" }, { x: 2, group: "A" }, { x: 3, group: "A" },
      { x: 2, group: "B" }, { x: 3, group: "B" }, { x: 4, group: "B" }
    ] })
    .createAreaMark({ id: "area", data: "raw" })
    .encodeDensity({ target: "area", source: "raw", field: "x", groupBy: "group", steps: 8 })
    .encodeColor({ target: "area", field: "group", layout: "center" })
    .configureAreaStrokeFromFill({ id: "area", strokeWidth: 2 });
  const saved = serializeProgram(original);
  const value = { field: "group", layout: "center" };
  const result = original.encodeColor({ target: "area", conditions: [
    { when: expression(literal(false)), value }
  ], otherwise: value });
  assert.deepEqual(result.graphicSpec.objects.area.items.map(item => item.properties.fill),
    ["#4c78a8", "#f58518"]);
  assert.deepEqual(result.graphicSpec.objects.area.items.map(item => item.properties.stroke),
    ["#4c78a8", "#f58518"]);
  assert.equal(serializeProgram(original), saved);
  const restored = deserializeProgram(serializeProgram(result));
  const revised = restored.encodeColor({ target: "area", conditions: [
    { when: expression(literal(true)), value: { value: "#dc2626" } }
  ], otherwise: { value: "#2563eb" } });
  assert.deepEqual(revised.graphicSpec.objects.area.items.map(item => item.properties.fill),
    ["#dc2626", "#dc2626"]);
  assert.deepEqual(revised.graphicSpec.objects.area.items.map(item => item.properties.stroke),
    ["#dc2626", "#dc2626"]);
});


test("conditional point and area strokes retain the ordinary visible default width", () => {
  for (const shape of ["circle", "square", "triangle-up"]) {
    for (const value of [{ value: "#dc2626" }, { field: "group", scale: { id: "strokes" } }]) {
      const original = base().encodeShape({ value: shape });
      const result = original.encodeStroke(condition(value, { value: "#2563eb" }));
      assert.deepEqual(items(result).map(item => item.properties.strokeWidth), [1, 1, 1]);
      assert.equal(items(result)[0].properties.stroke, "#2563eb");
      assert.doesNotThrow(() => renderToSVG(result));
      const restored = deserializeProgram(serializeProgram(result));
      assert.doesNotThrow(() => renderToSVG(restored.editCanvas({ width: 420 })));
    }
  }
  const zero = base().encodeStrokeWidth({ value: 0 })
    .encodeStroke(condition({ value: "red" }, { value: "blue" }));
  assert.deepEqual(items(zero).map(item => item.properties.strokeWidth), [0, 0, 0]);
  const area = chart().createCanvas({ width: 400, height: 300, margin: 50 })
    .createData({ id: "raw", values: [{ x: 1 }, { x: 2 }, { x: 3 }] })
    .createAreaMark({ id: "area", data: "raw" })
    .encodeDensity({ target: "area", field: "x", steps: 8 })
    .encodeStroke({ target: "area", conditions: [
      { when: expression(literal(true)), value: { value: "#dc2626" } }
    ], otherwise: { value: "#2563eb" } });
  assert.deepEqual(area.graphicSpec.objects.area.items.map(item =>
    [item.properties.stroke, item.properties.strokeWidth]), [["#dc2626", 1]]);
  assert.doesNotThrow(() => renderToSVG(area));
});


test("conditional positions reject feedback through interval size and radial centroids", () => {
  const rows = [{ category: "A", x: 1, y: 2 }, { category: "B", x: 3, y: 6 }];
  const start = () => chart().createCanvas({ width: 300, height: 200 }).createData({ values: rows });
  const bars = start().createBarPlot({ id: "bars", x: "category", y: { field: "y", aggregate: "sum" }, guides: false })
    .selectMarks({ id: "tall", target: "bars", property: "height", op: "gt", value: 50 });
  assert.throws(() => bars.encodeY(condition({ field: "y", aggregate: "mean" }, { field: "y", aggregate: "sum" }, { selection: "tall" })), /Cyclic conditional/);
  const rect = start().createRectMark({ id: "rect" }).encodeX({ field: "x" }).encodeX2({ field: "y" }).encodeY({ datum: 0 }).encodeY2({ datum: 1 })
    .selectMarks({ id: "wide", target: "rect", property: "width", op: "gt", value: 20 });
  assert.throws(() => rect.encodeX2(condition({ field: "y" }, { field: "x" }, { selection: "wide" })), /Cyclic conditional/);
  const arcs = start().createArcMark({ id: "arcs" }).encodeTheta({ field: "category", fieldType: "nominal" }).encodeR({ field: "y" })
    .selectMarks({ id: "right", target: "arcs", property: "x", op: "gt", value: 100 });
  assert.throws(() => arcs.encodeR(condition({ field: "x" }, { field: "y" }, { selection: "right" })), /Cyclic conditional/);
});

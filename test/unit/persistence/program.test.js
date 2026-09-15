import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { action, ChartProgram, registerExtension } from "../../../src/extension.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { buildActionRelationshipPrograms } from "../../../scripts/action-relationship-source.js";
import { requireResolvedScale } from "../../../src/selectors/scales.js";

function example(factory = chart) {
  return factory().createCanvas().createData({ id: "rows", values: [{ x: 1, y: 2 }, { x: 2, y: 5 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y" });
}
function corrupt(program, mutate) {
  const envelope = JSON.parse(serializeProgram(program));
  const state = decodeValue(envelope.payload);
  mutate(state);
  envelope.payload = encodeValue(state);
  return JSON.stringify(envelope);
}

test("all action corpus programs round trip without replay and preserve graphics and state", () => {
  const programs = buildActionRelationshipPrograms();
  assert.ok(programs.length >= 139);
  for (const [index, original] of programs.entries()) {
    const stored = serializeProgram(original);
    const restored = deserializeProgram(stored);
    assert.equal(serializeProgram(restored), stored, `canonical state ${index}`);
    const graphic = deserializeGraphic(serializeGraphic(original));
    let svg;
    try { svg = renderToSVG(original); } catch (error) {
      assert.throws(() => renderToSVG(restored), { message: error.message });
      assert.throws(() => renderToSVG(graphic), { message: error.message });
    }
    if (svg !== undefined) {
      assert.equal(renderToSVG(restored), svg, `SVG ${index}`);
      assert.equal(renderToSVG(graphic), svg, `graphic ${index}`);
    }
    assert.deepEqual(restored.actionStack, []);
    for (const child of Object.values(restored.children)) assert.deepEqual(child.actionStack, []);
  }
});

test("empty, partial, Basic, and composed states restore as immutable editable Full programs", () => {
  for (const original of [chart(), chart().createData({ values: [{ x: 1 }] }).createPointMark(), example(), example(basicChart)]) {
    const restored = deserializeProgram(serializeProgram(original));
    assert.ok(restored instanceof ChartProgram);
    assert.ok(Object.isFrozen(restored));
    const previous = serializeProgram(restored);
    const changed = restored.createData({ id: "extra", values: [{ missing: undefined, big: 9007199254740993n, special: NaN }] });
    assert.equal(serializeProgram(restored), previous);
    assert.equal(changed.semanticSpec.datasets.at(-1).values[0].big, 9007199254740993n);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(changed))), serializeProgram(changed));
  }
  const child = example();
  const composed = hconcat({ programs: [{ id: "__proto__", program: child }, { id: "other", program: child }] });
  const restored = deserializeProgram(serializeProgram(composed));
  assert.ok(Object.hasOwn(restored.children, "__proto__"));
  assert.equal(Object.getPrototypeOf(restored.children), Object.prototype);
  assert.equal(renderToSVG(restored), renderToSVG(composed));
  const edited = restored.children.__proto__.editPointMark({ target: "points", fill: "red" });
  assert.notDeepEqual(edited.graphicSpec, restored.children.__proto__.graphicSpec);
});

test("editable schema version 1 migrates dataset schemas while version 2 requires them", () => {
  const original = chart()
    .createData({ id: "source", values: [{ group: "A", value: 2 }] })
    .createSummaryData({
      id: "summary",
      groupBy: "group",
      aggregates: [{ op: "mean", field: "value", as: "mean" }]
    });
  const envelope = JSON.parse(serializeProgram(original));
  const state = decodeValue(envelope.payload);
  for (const dataset of state.semanticSpec.datasets) delete dataset.schema;
  envelope.schemaVersion = 1;
  envelope.payload = encodeValue(state);

  const migrated = deserializeProgram(JSON.stringify(envelope));
  assert.deepEqual(
    migrated.semanticSpec.datasets.map(dataset => dataset.schema.completeness),
    ["known", "known"]
  );
  assert.deepEqual(
    migrated.semanticSpec.datasets[1].schema.fields.map(field => field.name),
    ["group", "mean"]
  );
  assert.equal(JSON.parse(serializeProgram(migrated)).schemaVersion, 2);

  envelope.schemaVersion = 2;
  assert.throws(
    () => deserializeProgram(JSON.stringify(envelope)),
    /requires schema/
  );

  const composed = hconcat({ programs: [
    {
      id: "left",
      program: chart().createCanvas().createData({ id: "leftRows", values: [{ x: 1 }] })
    },
    {
      id: "right",
      program: chart().createCanvas().createData({ id: "rightRows", values: [{ y: 2 }] })
    }
  ] });
  const composedEnvelope = JSON.parse(serializeProgram(composed));
  const composedState = decodeValue(composedEnvelope.payload);
  for (const child of Object.values(composedState.children)) {
    for (const dataset of child.semanticSpec.datasets) delete dataset.schema;
  }
  composedEnvelope.schemaVersion = 1;
  composedEnvelope.payload = encodeValue(composedState);
  const migratedComposition = deserializeProgram(JSON.stringify(composedEnvelope));
  assert.deepEqual(
    Object.values(migratedComposition.children).map(child =>
      child.semanticSpec.datasets[0].schema.completeness),
    ["known", "known"]
  );
});

test("editable restoration retains compatible empty-domain preservation identity", () => {
  const original = chart()
    .createCanvas()
    .createData({
      id: "source",
      values: [{ x: 1, y: 2 }, { x: 4, y: 5 }],
      schema: { fields: [
        { name: "x", storageType: "number", nullable: false },
        { name: "y", storageType: "number", nullable: false }
      ] }
    })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x", scale: { emptyDomain: "preserve" } })
    .encodeY({ target: "points", field: "y", scale: { emptyDomain: "preserve" } });
  const restored = deserializeProgram(serializeProgram(original));
  const emptied = restored.reviseData({ source: "source", id: "empty", values: [] });
  assert.deepEqual(emptied.resolvedScales.x.domain, original.resolvedScales.x.domain);
  assert.deepEqual(emptied.resolvedScales.y.domain, original.resolvedScales.y.domain);
  assert.equal(emptied.graphicSpec.objects.points.items.length, 0);
});

test("registered extensions restore without executing actions; unknown classes and operations fail", () => {
  let calls = 0;
  registerExtension({ name: "persistence-test", actions: {
    recordPersistenceValue: action({ op: "recordPersistenceValue", description: "Record a value." }, function () { calls++; return this.createData({ id: "extensionRows", values: [] }); })
  } });
  const original = chart().recordPersistenceValue();
  const stored = serializeProgram(original);
  assert.deepEqual(JSON.parse(stored).extensions, ["persistence-test"]);
  assert.equal(serializeProgram(deserializeProgram(stored)), stored);
  assert.equal(calls, 1);
  class Custom extends ChartProgram {}
  assert.throws(() => serializeProgram(new Custom()), /unregistered program class/);
  assert.throws(() => serializeProgram({}), /unregistered program class/);
  assert.throws(() => serializeProgram(chart()._enterAction({ op: "createCanvas", description: "Open", args: {} })), /open actionStack/);
  const custom = action({ op: "notRegistered", description: "Unregistered." }, function () { return this; }).call(chart());
  assert.throws(() => serializeProgram(custom), /unregistered action/);
  const envelope = JSON.parse(stored);
  for (const extensions of [[], ["missing"], ["persistence-test", "persistence-test"]]) {
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, extensions })), /extensions/);
  }
});

test("envelopes, canonical keys, and closed traces are mandatory", () => {
  const envelope = JSON.parse(serializeProgram(chart()));
  for (const value of [null, 1, {}, "{", "[]", JSON.stringify({ ...envelope, schemaVersion: 3 }),
    JSON.stringify({ ...envelope, kind: "graphic" }), JSON.stringify({ ...envelope, packageVersion: "unknown" }),
    JSON.stringify({ ...envelope, extra: true })]) assert.throws(() => deserializeProgram(value));
  for (const mutate of [s => { delete s.context; }, s => { s.markConfigs = {}; },
    s => { s.children = []; }, s => { s.actionStack = [{}]; },
    s => { s.trace.children.push({ ...s.trace, id: "a1", op: "program" }); },
    s => { s.trace.children.push({ ...s.trace, id: "a2", op: "createData" }); }]) {
    assert.throws(() => deserializeProgram(corrupt(chart(), mutate)));
  }
  assert.throws(() => deserializeGraphic(serializeProgram(chart())), /kind/);
  assert.equal(deserializeGraphic(serializeGraphic(chart())).createData, undefined);
});

test("restoration rejects malformed semantics, dangling resources, caches, selectors, and ownership", () => {
  const original = example().selectMarks({ id: "selected", target: "points", field: "x", op: "eq", value: 1 });
  for (const mutate of [
    s => { s.semanticSpec.datasets.push(s.semanticSpec.datasets[0]); },
    s => { s.semanticSpec.datasets[0].values = [null]; },
    s => { s.semanticSpec.datasets[0].source = "rows"; },
    s => { s.semanticSpec.datasets[0].values = Array(1); },
    s => { s.semanticSpec.layers[0].mark.type = "unknown"; },
    s => { s.semanticSpec.layers[0].data = "missing"; },
    s => { s.semanticSpec.layers[0].data = 7; },
    s => { s.semanticSpec.layers[0].encoding.x.scale = "missing"; },
    s => { s.semanticSpec.layers[0].coordinate = "missing"; },
    s => { s.semanticSpec.layers[0].encoding.x.field = 1; },
    s => { s.semanticSpec.layers[0].unknown = true; },
    s => { s.semanticSpec.scales[0].type = "unknown"; },
    s => { s.resolvedScales.x.type = "band"; },
    s => { s.resolvedScales.x.domain = "auto"; },
    s => { s.resolvedScales.missing = s.resolvedScales.x; },
    s => { s.materializationConfigs.marks.missing = {}; },
    s => { s.materializationConfigs.selections.selected.target = "missing"; },
    s => { s.materializationConfigs.selections.selected.selector.op = "unknown"; },
    s => { s.context.currentMark = "missing"; }
  ]) assert.throws(() => deserializeProgram(corrupt(original, mutate)));
  assert.throws(() => requireResolvedScale(chart(), "constructor"), /does not exist|Unknown/);
  assert.throws(() => requireResolvedScale(chart(), "__proto__"), /does not exist|Unknown/);
});

test("graphic snapshots reject malformed, duplicated, orphaned and cyclic concrete trees", () => {
  const original = example();
  for (const mutate of [
    g => { g.order.push("missing"); }, g => { g.order.push("constructor"); },
    g => { g.order.push(g.order[0]); }, g => { g.objects.canvas.children.push("canvas"); },
    g => { g.objects.orphan = { type: "circle", properties: {} }; },
    g => { g.objects.points.type = "unknown"; },
    g => { g.objects.points.items[0].properties.x = NaN; },
    g => { g.objects.points.items[0].properties.unknown = 1; },
    g => { g.objects.points.items[0].id = "canvas"; },
    g => { g.objects.points.children = []; },
    g => { g.objects.canvas.extra = true; }
  ]) {
    const graphicSpec = decodeValue(encodeValue(original.graphicSpec));
    mutate(graphicSpec);
    assert.throws(() => serializeGraphic({ graphicSpec }));
    const envelope = JSON.parse(serializeGraphic(original));
    envelope.payload = encodeValue(graphicSpec);
    assert.throws(() => deserializeGraphic(JSON.stringify(envelope)));
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { decodeValue, encodeValue } from "../../src/persistence/codec.js";
import { namespaceGraphicId } from "../../src/selectors/graphicCapacity.js";

const rows = [{ x: 1, y: 2, z: 4, group: "a" }, { x: 2, y: 3, z: 5, group: "b" }];
const base = (create = chart) => create().createCanvas({ width: 400, height: 300, margin: 65 })
  .createData({ id: "rows", values: rows }).createScatterPlot({ x: "x", y: "y", guides: false });
const unchanged = (program, operation, pattern) => {
  const before = serializeProgram(program);
  assert.throws(operation, pattern);
  assert.equal(serializeProgram(program), before);
};

test("Full and Basic reject a second Y resource even with equal domains and no guides", () => {
  for (const create of [chart, basicChart]) {
    const p = base(create).createPointMark({ id: "other", data: "rows" }).encodeX({ field: "x" });
    unchanged(p, () => p.encodeY({ field: "z", scale: { id: "otherY", domain: [0, 5] } }), /requires one Y scale/);
    const valid = p.encodeY({ field: "z", scale: { id: "y" } });
    assert.equal(valid.semanticSpec.layers.at(-1).encoding.y.scale, "y");
  }
});

test("position admission rejects before extension subclasses observe any state-changing child", () => {
  for (const create of [chart, basicChart]) {
    const Base = create().constructor, calls = [];
    let armed = false;
    class CapturingProgram extends Base {}
    for (const name of ["createCoordinate", "editSemantic", "createScale", "editScale", "createGraphics", "editGraphics", "rebindLayerData", "createCompleteData"]) {
      if (typeof Base.prototype[name] !== "function") continue;
      CapturingProgram.prototype[name] = function (args) {
        if (armed) calls.push(name);
        return Base.prototype[name].call(this, args);
      };
    }
    const p = base(() => new CapturingProgram()).createPointMark({ id: "other", data: "rows" }).encodeX({ field: "x" });
    const before = JSON.stringify(p);
    armed = true;
    assert.throws(() => p.encodeY({ field: "z", scale: { id: "otherY" } }), /requires one Y scale/);
    assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(p), before);
  }
});

test("conditional admission examines inactive branches before clearing or replaying any assignment", () => {
  const Base = chart().constructor, calls = [];
  let armed = false;
  class CapturingProgram extends Base {
    editSemantic(args) {
      if (armed) calls.push(args.property);
      return super.editSemantic(args);
    }
  }
  const p = base(() => new CapturingProgram());
  const when = { version: 2, registry: "standard@1", root: { type: "literal", value: false } };
  const valid = p.encodeY({ target: "scatterPlot", conditions: [{ when, value: { field: "y" } }], otherwise: { field: "z" } });
  const anchor = p.createStripPlot({ id: "strip", data: "rows", x: { field: "x", scale: { id: "x" } }, guides: false });
  const unbound = new CapturingProgram().createCanvas().createData({ id: "rows", values: rows }).createPointMark({ id: "unbound" });
  armed = true;
  const rejects = (program, args) => {
    const before = JSON.stringify(program);
    assert.throws(() => program.encodeY(args), /requires one Y scale/);
    assert.equal(JSON.stringify(program), before);
  };
  for (const [program, args] of [
    [p, { target: "scatterPlot", conditions: [{ when, value: { field: "y", scale: { id: "hiddenY" } } }], otherwise: { field: "z", scale: { id: "y" } } }],
    [valid, { target: "scatterPlot", conditions: [{ when, value: { field: "y", scale: { id: "hiddenY" } } }], otherwise: { field: "z", scale: { id: "y" } } }],
    [anchor, { target: "strip", conditions: [{ when, value: { field: "y", scale: { id: "hiddenY" } } }], otherwise: { field: "z", scale: { id: "hiddenY" } } }]
  ]) {
    rejects(program, args);
    assert.deepEqual(calls, []);
  }
  armed = false;
  const other = valid.createPointMark({ id: "other", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "z" });
  armed = true;
  rejects(other, { target: "scatterPlot", field: "y", scale: { id: "otherY" } });
  assert.deepEqual(calls, []);
  const unboundBefore = JSON.stringify(unbound);
  assert.throws(() => unbound.encodeY({ conditions: [{ when, value: { field: "y", coordinate: "first" } }],
    otherwise: { field: "z", coordinate: "second" } }), /must share one coordinate/);
  assert.deepEqual(calls, []);
  assert.equal(JSON.stringify(unbound), unboundBefore);
});

test("position preflight permits a complete guide-scale replacement and preserves wrapped trace steps", () => {
  const source = base().createYAxis();
  const next = source.encodeY({ target: "scatterPlot", field: "z", scale: { id: "replacementY" } });
  assert.equal(next.semanticSpec.layers[0].encoding.y.scale, "replacementY");
  assert.equal(next.semanticSpec.guides.axis.y.scale, "replacementY");
  assert.equal(source.semanticSpec.layers[0].encoding.y.scale, "y");
  const pending = [next.trace];
  let guideWrite = false;
  while (pending.length) {
    const node = pending.pop();
    guideWrite ||= node.op === "editSemantic" && node.args.property === "guide.axis.y.scale";
    pending.push(...node.children);
  }
  assert.ok(guideWrite);
});

test("completed Area reassignment rejects a frame conflict before rebinding its source", () => {
  const Base = chart().constructor, calls = [];
  let armed = false;
  class CapturingProgram extends Base {
    editSemantic(args) {
      if (armed) calls.push("editSemantic");
      return super.editSemantic(args);
    }
    rebindLayerData(args) {
      if (armed) calls.push("rebindLayerData");
      return super.rebindLayerData(args);
    }
    createCompleteData(args) {
      if (armed) calls.push("createCompleteData");
      return super.createCompleteData(args);
    }
  }
  const p = new CapturingProgram().createCanvas().createData({ id: "source", values: [
    { g: "A", y: 1, z: 10, m: 2 }, { g: "A", y: 2, z: 20, m: 4 },
    { g: "B", y: 1, z: 20, m: 3 }, { g: "B", y: 3, z: 30, m: 5 }
  ] }).createCompleteData({ id: "aligned", source: "source", key: "y", groupBy: "g", fill: { m: 0 } })
    .createAreaMark({ id: "area", data: "aligned" }).encodeXRange({ lower: { datum: 0 }, upper: "m" })
    .encodeY({ field: "y" }).encodeGroup({ field: "g" }).createPointMark({ id: "point", data: "source" })
    .encodeX({ field: "m", scale: { id: "x" } }).encodeY({ field: "y", scale: { id: "y" } });
  const before = JSON.stringify(p);
  armed = true;
  assert.throws(() => p.encodeY({ target: "area", field: "z", scale: { id: "replacementY" } }), /requires one Y scale/);
  assert.deepEqual(calls, []);
  assert.equal(JSON.stringify(p), before);
});

test("hidden guides cannot admit an independent scale and visible mirrors remain atomic errors", () => {
  const p = base().createYAxis().createScale({ id: "otherY", type: "linear", domain: [0, 5] });
  unchanged(p, () => p.createYAxis({ id: "right", position: "right" }), /one visible Y guide/);
  const hidden = base().createYAxis({ id: "right", position: "right" }).editYAxis({ target: "right", visible: false })
    .createYAxis().createScale({ id: "otherY", type: "linear", domain: [0, 5] });
  unchanged(hidden, () => hidden.editSemantic({ property: "guide.axis.right.scale", value: "otherY" }), /requires one Y scale/);
  unchanged(hidden, () => hidden.editYAxis({ target: "right", visible: true }), /one visible Y guide/);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(hidden)));
});

test("semantic primitives reject changed Y bindings before exposing the candidate", () => {
  const p = base().createPointMark({ id: "other", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "z" })
    .createScale({ id: "otherY", type: "linear", domain: [0, 5] });
  unchanged(p, () => p.editSemantic({ property: "layer[other].encoding.y.scale", value: "otherY" }), /requires one Y scale/);
});

test("range endpoints and independent panels survive editing and persistence", () => {
  const area = chart().createCanvas({ width: 400, height: 300, margin: 60 }).createData({ values: rows })
    .createAreaMark({ id: "area" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeY2({ field: "z" });
  assert.equal(area.semanticSpec.layers[0].encoding.y.scale, area.semanticSpec.layers[0].encoding.y2.scale);
  for (const p of [area, base().facet({ field: "group" }), hconcat({ programs: [base(), base()] })]) {
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(p)));
  }
});

test("concrete child Canvas movement cannot overlay independent frames", () => {
  const p = hconcat({ id: "pair", programs: [{ id: "a", program: base() }, { id: "b", program: base() }] });
  const target = namespaceGraphicId("pair-b", "canvas");
  unchanged(p, () => p.editGraphics({ target, property: "x", value: 0 }), /overlaps an independent/);
});

test("conditional Y branches share one inferred scale and reject explicit independent identities", () => {
  const p = base(), when = { version: 2, registry: "standard@1", root: { type: "literal", value: false } };
  const q = p.encodeY({ target: "scatterPlot", conditions: [{ when, value: { field: "y" } }], otherwise: { field: "z" } });
  const conditional = q.semanticSpec.layers[0].conditionals.y;
  assert.equal(conditional.conditions[0].value.scale, conditional.otherwise.scale);
  unchanged(p, () => p.encodeY({ target: "scatterPlot", conditions: [{ when, value: { field: "y", scale: { id: "first" } } }], otherwise: { field: "z", scale: { id: "second" } } }), /requires one Y scale/);
});

test("editable imports reject hidden independent bindings through the same policy", () => {
  const p = base().createPointMark({ id: "other", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "z" })
    .createScale({ id: "otherY", type: "linear", domain: [0, 5] });
  const saved = JSON.parse(serializeProgram(p)), state = structuredClone(decodeValue(saved.payload));
  state.semanticSpec.layers.find(layer => layer.id === "other").encoding.y.scale = "otherY";
  assert.throws(() => deserializeProgram(JSON.stringify({ ...saved, payload: encodeValue(state) })), /requires one Y scale/);
});


test("detached overlays retain explicit plot positions and ordinary re-encoding restores data-axis admission", () => {
  const source = base().createOverlay({ id: "frozen", source: "scatterPlot", type: "point" });
  const detached = source.editOverlay({ target: "frozen", follow: false });
  const layer = detached.semanticSpec.layers.find(layer => layer.id === "frozen");
  assert.deepEqual(layer.derivedBindings.plotSnapshot, { x: layer.encoding.x.field, y: layer.encoding.y.field });
  assert.deepEqual(detached.graphicSpec.objects.frozen.items.map(item => [item.properties.cx, item.properties.cy]),
    source.graphicSpec.objects.frozen.items.map(item => [item.properties.cx, item.properties.cy]));
  assert.deepEqual(deserializeProgram(serializeProgram(detached)).graphicSpec, detached.graphicSpec);
  unchanged(detached, () => detached.editScale({ id: layer.encoding.y.scale, domain: [0, 2] }), /normalized linear position/);
  unchanged(detached, () => detached.encodeY({ target: "frozen", field: "z" }), /requires one Y scale/);
  const rebound = detached.encodeY({ target: "frozen", field: "z", scale: { id: "y" } });
  assert.deepEqual(rebound.semanticSpec.layers.at(-1).derivedBindings.plotSnapshot, { x: layer.encoding.x.field });
  const both = rebound.encodeX({ target: "frozen", field: "x", scale: { id: "x" } });
  assert.equal(both.semanticSpec.layers.at(-1).derivedBindings?.plotSnapshot, undefined);
  for (const value of [null, {}, { z: "x" }, { y: "" }, { y: 1 }]) {
    unchanged(detached, () => detached.editSemantic({ property: "layer[frozen].derivedBindings.plotSnapshot", value }), /Plot snapshot/);
  }
  const saved = JSON.parse(serializeProgram(detached)), state = structuredClone(decodeValue(saved.payload));
  state.semanticSpec.layers.find(layer => layer.id === "frozen").derivedBindings.plotSnapshot.y = "z";
  assert.throws(() => deserializeProgram(JSON.stringify({ ...saved, payload: encodeValue(state) })), /normalized linear position/);
});

test("unfinished extension assignments defer missing coordinate references until materialization", () => {
  const p = chart().editSemantic({ property: "layer[point].mark.type", value: "point" })
    .editSemantic({ property: "layer[point].coordinate", value: "future" })
    .editSemantic({ property: "layer[point].encoding.y.scale", value: "y" });
  assert.equal(p.graphicSpec.objects.point, undefined);
  const before = JSON.stringify(p);
  assert.throws(() => p.createGraphics({ id: "point", type: "circle" }), /Unknown coordinate/);
  assert.equal(JSON.stringify(p), before);
  assert.doesNotThrow(() => p.editSemantic({ property: "coordinate[future].type", value: "cartesian" }));
});

test("Rug edges and one-dimensional Strip slots retain explicit plot anchors beside data Y scales", () => {
  const p = base();
  for (const edge of ["top", "bottom", "left", "right"]) {
    const vertical = ["left", "right"].includes(edge), axis = vertical ? "x" : "y";
    const q = p.createRugPlot({ id: "rug", data: "rows", [vertical ? "y" : "x"]:
      { field: vertical ? "y" : "x", scale: { id: vertical ? "y" : "x" } }, edge, guides: false });
    const layer = q.semanticSpec.layers.at(-1), value = ["top", "right"].includes(edge) ? 1 : 0;
    assert.deepEqual(layer.derivedBindings.plotAnchor, { [axis]: value });
    assert.equal(layer.encoding[axis].datum, value);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    unchanged(q, () => q.editScale({ id: layer.encoding[axis].scale, domain: [0, 2] }), /normalized linear position/);
    const rebound = q[vertical ? "encodeX" : "encodeY"]({ target: "rug", field: axis, scale: { id: axis } });
    assert.equal(rebound.semanticSpec.layers.at(-1).derivedBindings?.plotAnchor, undefined);
  }
  const strip = p.createStripPlot({ id: "strip", data: "rows", x: { field: "x", scale: { id: "x" } }, guides: false });
  assert.deepEqual(strip.semanticSpec.layers.at(-1).derivedBindings.plotAnchor, { y: 0.5 });
  assert.deepEqual(deserializeProgram(serializeProgram(strip)).graphicSpec, strip.graphicSpec);
  const when = { version: 2, registry: "standard@1", root: { type: "literal", value: true } };
  const changed = strip.encodeY({ target: "strip", conditions: [{ when, value: { field: "y", scale: { id: "y" } } }], otherwise: { field: "z", scale: { id: "y" } } });
  assert.equal(changed.semanticSpec.layers.at(-1).derivedBindings?.plotAnchor, undefined);
  for (const value of [null, {}, { z: 0 }, { y: -1 }, { y: 2 }, { y: "0" }, { y: Infinity }]) {
    unchanged(strip, () => strip.editSemantic({ property: "layer[strip].derivedBindings.plotAnchor", value }), /Plot anchor/);
  }
  unchanged(strip, () => strip.editSemantic({ property: "layer[strip].derivedBindings.plotAnchor", value: { y: 1 } }), /normalized linear position/);
  const saved = JSON.parse(serializeProgram(strip)), state = structuredClone(decodeValue(saved.payload));
  state.semanticSpec.layers.at(-1).encoding.y.datum = 1;
  assert.throws(() => deserializeProgram(JSON.stringify({ ...saved, payload: encodeValue(state) })), /normalized linear position/);
});

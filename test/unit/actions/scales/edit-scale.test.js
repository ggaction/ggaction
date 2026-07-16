import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ x: -5, y: 1, group: "a" }),
  Object.freeze({ x: 5, y: 2, group: "b" }),
  Object.freeze({ x: 15, y: 3, group: "a" })
]);

function pointProgram() {
  return chart()
    .createCanvas({
      width: 300,
      height: 200,
      margin: { top: 10, right: 20, bottom: 30, left: 40 }
    })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "x",
      scale: { domain: [0, 10] }
    })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeRadius({ value: 3 });
}

test("edits a scale immutably and reverses its final concrete range", () => {
  const original = pointProgram();
  const before = original.graphicSpec.objects.points.children.map(
    child => child.properties.x
  );
  const edited = original.editScale({ id: "x", reverse: true });
  const after = edited.graphicSpec.objects.points.children.map(
    child => child.properties.x
  );

  assert.deepEqual(original.semanticSpec.scales.find(scale => scale.id === "x"), {
    id: "x",
    type: "linear",
    domain: [0, 10],
    range: "auto"
  });
  assert.equal(edited.semanticSpec.scales.find(scale => scale.id === "x").reverse, true);
  assert.deepEqual(edited.resolvedScales.x.range, [280, 40]);
  assert.deepEqual(after, before.map(value => 320 - value));
  assert.notStrictEqual(edited.semanticSpec, original.semanticSpec);
  assert.notStrictEqual(edited.graphicSpec, original.graphicSpec);
});

test("applies clamp to out-of-domain continuous values", () => {
  const unclamped = pointProgram();
  const clamped = unclamped.editScale({ id: "x", clamp: true });
  const values = clamped.graphicSpec.objects.points.children.map(
    child => child.properties.x
  );

  assert.deepEqual(values, [40, 160, 280]);
  assert.equal(clamped.resolvedScales.x.clamp, true);
});

test("resets auto domain and range while preserving omitted policies", () => {
  const explicitRange = [80, 220];
  const edited = pointProgram().editScale({
    id: "x",
    domain: "auto",
    range: explicitRange,
    nice: true,
    zero: false
  });
  explicitRange[0] = -100;

  assert.deepEqual(edited.semanticSpec.scales.find(scale => scale.id === "x"), {
    id: "x",
    type: "linear",
    domain: "auto",
    range: [80, 220],
    nice: true,
    zero: false
  });
  assert.deepEqual(edited.resolvedScales.x.domain, [-5, 15]);
  assert.deepEqual(edited.resolvedScales.x.range, [80, 220]);
});

test("infers one existing scale and records meaningful nested actions", () => {
  const base = chart()
    .createCanvas({ width: 100, height: 100, margin: 10 })
    .createData({ id: "rows", values: [{ x: 1 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" });
  const edited = base.editScale({ reverse: true });
  const node = edited.trace.children.at(-1);

  assert.equal(node.op, "editScale");
  assert.deepEqual(
    node.children.map(child => child.op),
    ["editSemantic", "rematerializeScale"]
  );
});

test("rejects invalid, empty, unknown, incompatible, and ambiguous edits atomically", () => {
  const base = pointProgram();
  const snapshot = {
    semanticSpec: base.semanticSpec,
    graphicSpec: base.graphicSpec,
    context: base.context,
    trace: base.trace
  };

  assert.throws(() => base.editScale({ id: "x" }), /at least one/);
  assert.throws(() => base.editScale({ id: "missing", reverse: true }), /Unknown scale/);
  assert.throws(() => base.editScale({ id: "x", reverse: "yes" }), /must be a boolean/);
  assert.throws(() => base.editScale({ id: "color", clamp: true }), /does not support clamp/);
  assert.throws(
    () => base.editScale({ id: "x", type: "time" }),
    /consumer incompatible with type "time"/
  );
  const ambiguous = base._clone({ context: {} });
  assert.throws(() => ambiguous.editScale({ reverse: true }), /requires id/);

  assert.strictEqual(base.semanticSpec, snapshot.semanticSpec);
  assert.strictEqual(base.graphicSpec, snapshot.graphicSpec);
  assert.strictEqual(base.context, snapshot.context);
  assert.strictEqual(base.trace, snapshot.trace);
});

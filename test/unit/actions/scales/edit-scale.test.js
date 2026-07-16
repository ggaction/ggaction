import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import {
  assertAtomicFailures,
  requireTestScale
} from "../../../support/program-state.js";

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
  const before = original.graphicSpec.objects.points.items.map(
    child => child.properties.x
  );
  const edited = original.editScale({ id: "x", reverse: true });
  const after = edited.graphicSpec.objects.points.items.map(
    child => child.properties.x
  );

  assert.deepEqual(requireTestScale(original, "x"), {
    id: "x",
    type: "linear",
    domain: [0, 10],
    range: "auto"
  });
  assert.equal(requireTestScale(edited, "x").reverse, true);
  assert.deepEqual(edited.resolvedScales.x.range, [280, 40]);
  assert.deepEqual(after, before.map(value => 320 - value));
  assert.notStrictEqual(edited.semanticSpec, original.semanticSpec);
  assert.notStrictEqual(edited.graphicSpec, original.graphicSpec);
});

test("applies clamp to out-of-domain continuous values", () => {
  const unclamped = pointProgram();
  const clamped = unclamped.editScale({ id: "x", clamp: true });
  const values = clamped.graphicSpec.objects.points.items.map(
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

  assert.deepEqual(requireTestScale(edited, "x"), {
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
  const ambiguous = base._clone({ context: {} });
  assertAtomicFailures(base, [
    { operation: () => base.editScale({ id: "x" }), error: /at least one/ },
    {
      operation: () => base.editScale({ id: "missing", reverse: true }),
      error: /Unknown scale/
    },
    {
      operation: () => base.editScale({ id: "x", reverse: "yes" }),
      error: /must be a boolean/
    },
    {
      operation: () => base.editScale({ id: "color", clamp: true }),
      error: /does not support clamp/
    },
    {
      operation: () => base.editScale({ id: "x", type: "time" }),
      error: /consumer incompatible with type "time"/
    }
  ]);
  assertAtomicFailures(ambiguous, [{
    operation: () => ambiguous.editScale({ reverse: true }),
    error: /requires id/
  }]);
});

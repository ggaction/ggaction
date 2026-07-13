import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";

test("creates a concrete canvas without visual properties", () => {
  const empty = chart();
  const program = empty.createGraphics({ id: "canvas", type: "canvas" });

  assert.deepEqual(empty.graphicSpec, { objects: {}, order: [] });
  assert.deepEqual(program.graphicSpec, {
    objects: {
      canvas: { type: "canvas", properties: {} }
    },
    order: ["canvas"]
  });
  assert.equal(program.semanticSpec, empty.semanticSpec);
  assert.equal(program.trace.children[0].op, "createGraphics");
});

test("creates a homogeneous drawable collection with generated child IDs", () => {
  const program = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });

  assert.deepEqual(program.graphicSpec.objects.points, {
    type: "circle",
    children: [
      { id: "points:0", properties: {} },
      { id: "points:1", properties: {} }
    ]
  });
});

test("creates an empty heterogeneous drawable collection", () => {
  const program = chart().createGraphics({
    id: "symbols",
    type: "collection"
  });

  assert.deepEqual(program.graphicSpec.objects.symbols, {
    type: "collection",
    children: []
  });
  assert.throws(
    () => chart().createGraphics({
      id: "symbols",
      type: "collection",
      length: 2
    }),
    /use editGraphics children/
  );
});

test("treats an equivalent repeated creation as idempotent", () => {
  const first = chart().createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });
  const second = first.createGraphics({
    id: "points",
    type: "circle",
    length: 2
  });

  assert.equal(second.graphicSpec, first.graphicSpec);
  assert.equal(second.trace.children.length, 2);
});

test("places new graphics before or after an existing top-level graphic", () => {
  const base = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .createGraphics({ id: "bars", type: "rect", length: 0 });
  const before = base.createGraphics({
    id: "grid",
    type: "line",
    length: 0,
    before: "bars"
  });
  const after = before.createGraphics({
    id: "labels",
    type: "text",
    length: 0,
    after: "bars"
  });

  assert.deepEqual(base.graphicSpec.order, ["canvas", "bars"]);
  assert.deepEqual(after.graphicSpec.order, [
    "canvas",
    "grid",
    "bars",
    "labels"
  ]);
  assert.equal(Object.isFrozen(after.graphicSpec.order), true);
  assert.deepEqual(after.trace.children.at(-1).args, {
    id: "labels",
    type: "text",
    length: 0,
    after: "bars"
  });
});

test("keeps equivalent placement idempotent and rejects conflicting placement", () => {
  const program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .createGraphics({ id: "bars", type: "rect", length: 0 })
    .createGraphics({
      id: "grid",
      type: "line",
      length: 0,
      before: "bars"
    });
  const repeated = program.createGraphics({
    id: "grid",
    type: "line",
    length: 0,
    before: "bars"
  });

  assert.equal(repeated.graphicSpec, program.graphicSpec);
  assert.throws(
    () =>
      program.createGraphics({
        id: "grid",
        type: "line",
        length: 0,
        after: "bars"
      }),
    /conflicting placement/
  );
});

test("rejects invalid and conflicting graphic definitions", () => {
  assert.throws(
    () => chart().createGraphics({ id: "points", type: "ellipse" }),
    /Unknown graphic type/
  );
  assert.throws(
    () => chart().createGraphics({ id: "layout", type: "container" }),
    /Unknown graphic type/
  );
  assert.throws(
    () => chart().createGraphics({ id: "bad id", type: "circle" }),
    /requires an id/
  );
  assert.throws(
    () => chart().createGraphics({ id: "canvas", type: "canvas", length: 1 }),
    /does not accept length/
  );
  assert.throws(
    () => chart().createGraphics({ id: "points", type: "circle", length: -1 }),
    /non-negative integer/
  );

  const program = chart().createGraphics({ id: "shape", type: "circle" });
  assert.throws(
    () => program.createGraphics({ id: "shape", type: "rect" }),
    /different definition/
  );
  assert.throws(
    () =>
      program.createGraphics({
        id: "other",
        type: "circle",
        before: "shape",
        after: "shape"
      }),
    /cannot use before and after together/
  );
  assert.throws(
    () =>
      program.createGraphics({
        id: "other",
        type: "circle",
        before: "missing"
      }),
    /Unknown graphic placement target/
  );
  assert.throws(
    () =>
      chart()
        .createGraphics({ id: "canvas", type: "canvas" })
        .createGraphics({ id: "other", type: "circle", before: "canvas" }),
    /before the canvas/
  );
  assert.throws(
    () =>
      program.createGraphics({
        id: "other",
        type: "circle",
        before: "other"
      }),
    /relative to itself/
  );
});

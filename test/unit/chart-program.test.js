import assert from "node:assert/strict";
import test from "node:test";

import { ChartProgram, chart } from "../../src/core/ChartProgram.js";

test("creates an immutable program with canonical empty state", () => {
  const program = chart();

  assert.equal(program instanceof ChartProgram, true);
  assert.deepEqual(program.semanticSpec, {
    datasets: [],
    layers: [],
    scales: [],
    coordinates: [],
    guides: {}
  });
  assert.deepEqual(program.graphicSpec, {
    objects: {},
    order: []
  });
  assert.deepEqual(program.children, {});
  assert.deepEqual(program.context, {});
  assert.deepEqual(program.trace, {
    id: "program",
    op: "program",
    description: "Program action trace root.",
    args: {},
    children: []
  });
  assert.deepEqual(program.actionStack, []);
  assert.equal(Object.isFrozen(program), true);
  assert.equal(Object.isFrozen(program.semanticSpec), true);
  assert.equal(Object.isFrozen(program.semanticSpec.datasets), true);
  assert.equal(Object.isFrozen(program.trace.children), true);
});

test("creates independent empty programs", () => {
  const first = chart();
  const second = chart();

  assert.notEqual(first, second);
  assert.notEqual(first.semanticSpec, second.semanticSpec);
  assert.notEqual(first.graphicSpec, second.graphicSpec);
  assert.notEqual(first.trace, second.trace);
});

test("clones only the supplied program branches", () => {
  const original = chart();
  const next = original._clone({
    context: { currentData: "cars" }
  });

  assert.notEqual(next, original);
  assert.equal(next instanceof ChartProgram, true);
  assert.equal(next.semanticSpec, original.semanticSpec);
  assert.equal(next.graphicSpec, original.graphicSpec);
  assert.equal(next.trace, original.trace);
  assert.deepEqual(original.context, {});
  assert.deepEqual(next.context, { currentData: "cars" });
  assert.equal(Object.isFrozen(next.context), true);
});

test("rejects mutation of stored program state", () => {
  const program = chart();

  assert.throws(() => {
    program.semanticSpec.datasets.push({ id: "cars" });
  }, TypeError);

  assert.throws(() => {
    program.context.currentData = "cars";
  }, TypeError);
});

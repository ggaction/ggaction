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
    guides: {},
    title: {}
  });
  assert.deepEqual(program.graphicSpec, {
    objects: {},
    order: []
  });
  assert.deepEqual(program.resolvedScales, {});
  assert.deepEqual(program.markConfigs, {});
  assert.deepEqual(program.guideConfigs, {});
  assert.equal(program.titleConfig, undefined);
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
  assert.equal(Object.isFrozen(program.resolvedScales), true);
  assert.equal(Object.isFrozen(program.markConfigs), true);
  assert.equal(Object.isFrozen(program.guideConfigs), true);
  assert.equal(Object.isFrozen(program.trace.children), true);
});

test("creates independent empty programs", () => {
  const first = chart();
  const second = chart();

  assert.notEqual(first, second);
  assert.notEqual(first.semanticSpec, second.semanticSpec);
  assert.notEqual(first.graphicSpec, second.graphicSpec);
  assert.notEqual(first.resolvedScales, second.resolvedScales);
  assert.notEqual(first.markConfigs, second.markConfigs);
  assert.notEqual(first.guideConfigs, second.guideConfigs);
  assert.equal(first.titleConfig, undefined);
  assert.equal(second.titleConfig, undefined);
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
  assert.equal(next.resolvedScales, original.resolvedScales);
  assert.equal(next.markConfigs, original.markConfigs);
  assert.equal(next.guideConfigs, original.guideConfigs);
  assert.equal(next.titleConfig, original.titleConfig);
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

test("takes ownership of shallow-frozen constructor input", () => {
  const semanticSpec = Object.freeze({
    datasets: Object.freeze([]),
    layers: Object.freeze([]),
    scales: Object.freeze([]),
    coordinates: Object.freeze([]),
    guides: Object.freeze({ custom: { title: "Before" } }),
    title: Object.freeze({})
  });
  const program = new ChartProgram({ semanticSpec });

  semanticSpec.guides.custom.title = "After";

  assert.equal(program.semanticSpec.guides.custom.title, "Before");
});

test("updates private context immutably without changing the trace", () => {
  const margin = { top: 10, right: 20, bottom: 30, left: 40 };
  const original = chart()._withContext({ currentData: "cars" });
  const next = original._withContext({ currentMargin: margin });

  margin.left = 99;

  assert.deepEqual(original.context, { currentData: "cars" });
  assert.deepEqual(next.context, {
    currentData: "cars",
    currentMargin: { top: 10, right: 20, bottom: 30, left: 40 }
  });
  assert.equal(next.semanticSpec, original.semanticSpec);
  assert.equal(next.graphicSpec, original.graphicSpec);
  assert.equal(next.trace, original.trace);
  assert.equal(Object.isFrozen(next.context.currentMargin), true);
});

test("rejects non-object private context patches", () => {
  assert.throws(() => chart()._withContext(null), /plain object/);
  assert.throws(() => chart()._withContext([]), /plain object/);
});

test("stores resolved scales immutably without changing authoring state", () => {
  const scale = {
    type: "linear",
    domain: [0, 10],
    range: [20, 100]
  };
  const original = chart();
  const next = original._withResolvedScale("x", scale);

  scale.domain[0] = -10;

  assert.deepEqual(original.resolvedScales, {});
  assert.deepEqual(next.resolvedScales, {
    x: {
      type: "linear",
      domain: [0, 10],
      range: [20, 100]
    }
  });
  assert.equal(next.semanticSpec, original.semanticSpec);
  assert.equal(next.graphicSpec, original.graphicSpec);
  assert.equal(next.trace, original.trace);
  assert.equal(Object.isFrozen(next.resolvedScales.x.domain), true);
});

test("validates private resolved scale updates", () => {
  assert.throws(
    () => chart()._withResolvedScale("", { type: "linear" }),
    /non-empty string/
  );
  assert.throws(
    () => chart()._withResolvedScale("x", []),
    /plain object/
  );
});

test("stores private mark materialization config immutably", () => {
  const config = { barWidth: { band: 0.72 } };
  const original = chart();
  const next = original._withMarkConfig("bars", config);
  config.barWidth.band = 0.2;

  assert.deepEqual(original.markConfigs, {});
  assert.deepEqual(next.markConfigs, { bars: { barWidth: { band: 0.72 } } });
  assert.equal(Object.isFrozen(next.markConfigs.bars.barWidth), true);
  assert.equal(next.trace, original.trace);
  assert.throws(() => chart()._withMarkConfig("", {}), /non-empty string/);
  assert.throws(() => chart()._withMarkConfig("bars", []), /plain object/);
});

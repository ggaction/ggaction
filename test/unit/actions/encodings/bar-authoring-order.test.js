import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const values = [
  { category: "A", year: 2020, value: 2, other: 8, group: "one" },
  { category: "A", year: 2020, value: 6, other: 4, group: "two" },
  { category: "B", year: 2021, value: 3, other: 6, group: "one" },
  { category: "B", year: 2021, value: 9, other: 2, group: "two" }
];

function base(rows = values) {
  return chart().createCanvas({ width: 420, height: 300 })
    .createData({ id: "data", values: rows }).createBarMark({ id: "bars" });
}

function state(program) {
  const semantic = structuredClone(program.semanticSpec);
  semantic.scales.sort((a, b) => a.id.localeCompare(b.id));
  return {
    semantic,
    graphic: program.graphicSpec,
    scales: program.resolvedScales,
    configs: program.markConfigs
  };
}

const orders = [
  ["category", "measure", "width"], ["category", "width", "measure"],
  ["measure", "category", "width"], ["measure", "width", "category"],
  ["width", "category", "measure"], ["width", "measure", "category"]
];

for (const horizontal of [false, true]) {
  for (const fieldType of ["nominal", "ordinal", "temporal"]) {
    test(`Bar positions and width converge: ${horizontal ? "horizontal" : "vertical"} ${fieldType}`, () => {
      for (const width of [{ band: 0.5 }, { pixels: 18 }]) {
        const actions = {
          category: program => program[horizontal ? "encodeY" : "encodeX"]({
            field: fieldType === "temporal" ? "year" : "category", fieldType
          }),
          measure: program => program[horizontal ? "encodeX" : "encodeY"]({ field: "value" }),
          width: program => program.encodeBarWidth(width)
        };
        const expected = orders[0].reduce((p, name) => actions[name](p), base());
        for (const order of orders) {
          const initial = base();
          const snapshot = structuredClone(state(initial));
          const trace = initial.trace;
          const actual = order.reduce((p, name) => actions[name](p), initial);
          assert.deepEqual(state(actual), state(expected), order.join(" → "));
          assert.deepEqual(state(actual.editCanvas({ width: 560 })), state(expected.editCanvas({ width: 560 })));
          assert.deepEqual(state(initial), snapshot);
          assert.equal(initial.trace, trace);
          const measure = actual.semanticSpec.layers[0].encoding[horizontal ? "x" : "y"];
          assert.equal(measure.aggregate, "mean");
          assert.equal(measure.stack, null);
          assert.equal(actual.graphicSpec.objects.bars.items.length, 2);
        }
      }
    });
  }
}

test("pending width and measure store only valid intent, with no invented aggregate or items", () => {
  const before = base();
  const pending = before.encodeBarWidth({ pixels: 12 }).encodeY({ field: "value" });
  assert.deepEqual(pending.markConfigs.bars.barWidth, { pixels: 12 });
  assert.deepEqual(pending.semanticSpec.layers[0].encoding.y, {
    field: "value", fieldType: "quantitative", scale: "y"
  });
  assert.equal(pending.graphicSpec.objects.bars.items.length, 0);
  assert.equal(pending.trace.children.at(-2).children.length, 0);
  const completed = pending.encodeX({ field: "category", fieldType: "nominal" });
  assert.ok(completed.trace.children.at(-1).children.some(child => child.op === "encodeY"));
  assert.equal(before.markConfigs.bars?.barWidth, undefined);
});

test("pending explicit aggregates, stack modes, and scale choices survive completion", () => {
  for (const aggregate of ["sum", "count", { op: "quantile", probability: 0.5 }]) {
    for (const stack of [null, "zero", "normalize"]) {
      for (const zero of [true, false]) {
        const measure = { field: "value", aggregate, stack, scale: { id: "measure", zero, nice: false } };
        const category = { field: "category", fieldType: "nominal" };
        const expected = base().encodeX(category).encodeY(measure);
        const actual = base().encodeY(measure).encodeX(category);
        assert.deepEqual(state(actual), state(expected));
      }
    }
  }
});

test("histogram y-first resolves count and zero stack only when binned x arrives", () => {
  for (const aggregate of [undefined, "count"]) {
    for (const scale of [{}, { nice: false, zero: false }, { zero: true }]) {
      const y = { field: "value", ...(aggregate === undefined ? {} : { aggregate }), scale };
      const x = { field: "value", bin: { boundaries: [0, 5, 10] } };
      const pending = base().encodeY(y);
      assert.equal(pending.semanticSpec.layers[0].encoding.y.stack, undefined);
      const actual = pending.encodeX(x);
      const expected = base().encodeX(x).encodeY(y);
      assert.deepEqual(state(actual), state(expected));
      assert.equal(actual.semanticSpec.layers[0].encoding.y.aggregate, "count");
      assert.equal(actual.semanticSpec.layers[0].encoding.y.stack, "zero");
      assert.equal(actual.graphicSpec.objects.bars.items.length, 2);
    }
  }
});

test("invalid partial input and incompatible completions reject without changing input or trace", () => {
  const initial = base();
  for (const [program, call, message] of [
    [initial, p => p.encodeY({ field: "missing" }), /field "missing" does not exist/],
    [initial, p => p.encodeY({ field: "category" }), /numeric|finite/],
    [initial, p => p.encodeY({ field: "value", stack: "center" }), /Centered/],
    [initial, p => p.encodeBarWidth({ pixels: -1 }), /positive finite/],
    [initial.encodeY({ field: "value" }), p => p.encodeX({ field: "other" }), /opposite a categorical/],
    [initial.encodeY({ field: "other" }), p => p.encodeX({ field: "value", bin: {} }), /must match/],
    [initial.encodeY({ field: "value", aggregate: "sum" }), p => p.encodeX({ field: "value", bin: {} }), /must be "count"/],
    [initial.encodeBarWidth({ band: 0.5 }).encodeY({ field: "value" }), p => p.encodeX({ field: "value", bin: {} }), /category slot/],
    [initial.encodeX({ field: "value", bin: {} }).encodeY(), p => p.encodeBarWidth(), /category slot/]
  ]) {
    const snapshot = structuredClone(state(program));
    const trace = program.trace;
    assert.throws(() => call(program), message);
    assert.deepEqual(state(program), snapshot);
    assert.equal(program.trace, trace);
  }
});

test("grouped bars preserve early width and removing position clears items while retaining width", () => {
  const category = { field: "category", fieldType: "nominal" };
  const expected = base().encodeX(category).encodeY({ field: "value" })
    .encodeColor({ field: "group", layout: "group" }).encodeBarWidth({ pixels: 14 });
  const actual = base().encodeBarWidth({ pixels: 14 }).encodeY({ field: "value" })
    .encodeX(category).encodeColor({ field: "group", layout: "group" });
  assert.deepEqual(state(actual), state(expected));
  const removed = actual.removeEncoding({ channel: "y" });
  assert.equal(removed.graphicSpec.objects.bars.items.length, 0);
  assert.deepEqual(removed.markConfigs.bars.barWidth, { pixels: 14 });
  assert.deepEqual(state(removed.encodeY({ field: "value" })), state(expected));
});

test("a deferred Box keeps its dedicated width owner and completes its range without an aggregate", () => {
  const before = chart().createCanvas({ width: 420, height: 300 })
    .createData({ values }).createBoxPlot({ width: { band: 0.5 } });
  assert.throws(() => before.encodeBarWidth({ pixels: 12 }), /complete aggregate/);
  const actual = before.encodeY({ field: "value" })
    .encodeX({ field: "category", fieldType: "nominal" });
  const expected = chart().createCanvas({ width: 420, height: 300 })
    .createData({ values }).createBoxPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value" }, width: { band: 0.5 }
    });
  assert.deepEqual(state(actual), state(expected));
  assert.equal(actual.semanticSpec.layers[0].encoding.y.aggregate, undefined);
});

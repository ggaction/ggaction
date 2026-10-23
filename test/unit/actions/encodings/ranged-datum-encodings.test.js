import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = Object.freeze([
  Object.freeze({ low: 1, high: 100, position: 1 }),
  Object.freeze({ low: 2, high: 80, position: 2 })
]);

function base(mark, channel) {
  let p = chart().createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: rows });
  p = mark === "rect" ? p.createRectMark({ id: "m" }) : p.createRuleMark({ id: "m" });
  return p[channel === "x" ? "encodeY" : "encodeX"]({ field: "position", fieldType: "quantitative" });
}

test("rule secondary numeric datum defaults match explicit quantitative endpoints", () => {
  for (const channel of ["x", "y"]) {
    const primary = channel === "x" ? "encodeX" : "encodeY";
    const secondary = channel === "x" ? "encodeX2" : "encodeY2";
    const before = base("rule", channel)[primary]({ datum: 100,
      scale: { domain: [0, 100], nice: false } });
    const snapshot = JSON.stringify(before);
    const options = Object.freeze({ datum: 0 });
    const inferred = before[secondary](options);
    const explicit = before[secondary]({ datum: 0, fieldType: "quantitative" });
    assert.deepEqual(inferred.semanticSpec, explicit.semanticSpec);
    assert.deepEqual(inferred.graphicSpec, explicit.graphicSpec);
    assert.deepEqual(inferred.resolvedScales, explicit.resolvedScales);
    assert.equal(renderToSVG(inferred), renderToSVG(explicit));
    assert.deepEqual(deserializeProgram(serializeProgram(inferred)).graphicSpec, inferred.graphicSpec);
    assert.deepEqual(inferred.editCanvas({ width: 300 }).graphicSpec,
      explicit.editCanvas({ width: 300 }).graphicSpec);
    assert.equal(inferred.semanticSpec.layers[0].encoding[channel + "2"].fieldType, "quantitative");
    assert.equal(inferred.semanticSpec.layers[0].encoding[channel + "2"].datum, 0);
    assert.equal(JSON.stringify(before), snapshot);
    assert.deepEqual(options, { datum: 0 });
  }
});

test("rule secondary datum inference retains finite, field, scale and categorical checks", () => {
  for (const channel of ["x", "y"]) {
    const primary = channel === "x" ? "encodeX" : "encodeY";
    const secondary = channel === "x" ? "encodeX2" : "encodeY2";
    const before = base("rule", channel)[primary]({ datum: 1,
      scale: { id: "positionScale", domain: [0, 100], nice: false } });
    const snapshot = JSON.stringify(before);
    for (const datum of [NaN, Infinity, -Infinity, "0", null, true, {}]) {
      assert.throws(() => before[secondary]({ datum }), /finite number/);
      assert.equal(JSON.stringify(before), snapshot);
    }
    assert.throws(() => before[secondary]({ field: "high" }), /requires fieldType/);
    assert.throws(() => before[secondary]({ datum: 0, scale: { id: "other" } }), /share one scale/);
    assert.throws(() => before[secondary]({ datum: 0, fieldType: "nominal" }), /fieldType must match/);
    const categorical = base("rule", channel)[primary]({ datum: "low", fieldType: "nominal",
      scale: { domain: ["low", "high"] } });
    const bounded = categorical[secondary]({ datum: "high", fieldType: "nominal" });
    assert.equal(bounded.semanticSpec.layers[0].encoding[channel + "2"].fieldType, "nominal");
    assert.throws(() => categorical[secondary]({ datum: "high" }), /fieldType must match/);
    assert.equal(JSON.stringify(before), snapshot);
  }
});

test("rect and rule numeric range bounds match the existing direct encoders exactly", () => {
  for (const mark of ["rect", "rule"]) for (const channel of ["x", "y"]) {
    const primary = channel === "x" ? "encodeX" : "encodeY";
    const secondary = channel === "x" ? "encodeX2" : "encodeY2";
    const range = channel === "x" ? "encodeXRange" : "encodeYRange";
    for (const type of ["linear", "log", "pow", "sqrt", "symlog"]) {
      const scale = { type, domain: [1, 100], nice: false, ...(type === "pow" ? { exponent: 2 } : {}) };
      for (const [lower, upper] of [
        ["low", "high"], ["low", { datum: 100 }], [{ datum: 1 }, "high"],
        [{ datum: 1 }, { datum: 100 }], [{ datum: 100 }, { datum: 1 }]
      ]) {
        const before = base(mark, channel), snapshot = JSON.stringify(before);
        const endpoint = value => typeof value === "string" ? { field: value } : value;
        const direct = before[primary]({ ...endpoint(lower), fieldType: "quantitative", scale })
          [secondary]({ ...endpoint(upper), fieldType: "quantitative" });
        const actual = before[range]({ lower, upper, scale });
        assert.deepEqual(actual.semanticSpec, direct.semanticSpec);
        assert.deepEqual(actual.resolvedScales, direct.resolvedScales);
        assert.deepEqual(actual.graphicSpec, direct.graphicSpec);
        assert.equal(renderToSVG(actual), renderToSVG(direct));
        assert.deepEqual(actual.semanticSpec.datasets[0].values, rows);
        assert.equal(JSON.stringify(before), snapshot);
        assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
        assert.deepEqual(actual.editCanvas({ width: 300 }).graphicSpec,
          direct.editCanvas({ width: 300 }).graphicSpec);
        assert.equal(actual.trace.children.at(-1).op, range);
      }
    }
  }
});

test("constant rect bounds preserve a full-height interval without invented data fields", () => {
  const input = Object.freeze([Object.freeze({ x0: 0, x1: 2 })]);
  const p = chart().createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: input }).createRectMark({ id: "period" })
    .encodeXRange({ lower: "x0", upper: "x1", scale: { domain: [0, 2], nice: false } })
    .encodeYRange({ lower: { datum: 45000 }, upper: { datum: 0 }, scale: { domain: [0, 45000], nice: false } });
  const rect = p.graphicSpec.objects.period.items[0].properties;
  assert.equal(rect.y, 20);
  assert.equal(rect.height, 120);
  assert.deepEqual(p.semanticSpec.datasets[0].values, input);
  assert.equal(p.semanticSpec.layers[0].encoding.y.datum, 45000);
  assert.equal(p.semanticSpec.layers[0].encoding.y2.datum, 0);
});

test("datum range replacement preflights the final pair and its shared scale", () => {
  for (const mark of ["rect", "rule"]) for (const channel of ["x", "y"]) {
    const op = channel === "x" ? "encodeXRange" : "encodeYRange";
    const before = base(mark, channel)[op]({ lower: "high", upper: { datum: 0 } });
    const snapshot = JSON.stringify(before);
    const next = before[op]({ lower: { datum: 1 }, upper: "high",
      scale: { id: "positiveRange", type: "log", domain: [1, 100], nice: false } });
    const fresh = base(mark, channel)[op]({ lower: { datum: 1 }, upper: "high",
      scale: { id: "positiveRange", type: "log", domain: [1, 100], nice: false } });
    assert.deepEqual(next.graphicSpec, fresh.graphicSpec);
    assert.equal(JSON.stringify(before), snapshot);
    assert.equal(next.semanticSpec.layers[0].encoding[channel + "2"].datum, undefined);
    assert.equal(next.semanticSpec.layers[0].encoding[channel + "2"].field, "high");
    assert.throws(() => next[op]({ lower: { datum: 0 }, upper: "high",
      scale: { type: "log", domain: [0, 100] } }), /positive|log|domain/i);
  }
  for (const values of [[], rows]) {
    const base = chart().createCanvas().createData({ values }).createRectMark({ id: "interval" });
    const first = base.encodeXRange({ lower: { datum: 1 }, upper: { datum: 2 }, scale: { domain: [0, 3] } });
    const direct = base.encodeX({ datum: 1, scale: { domain: [0, 3] } }).encodeX2({ datum: 2 });
    assert.equal(first.semanticSpec.layers[0].encoding.x.datum, 1);
    assert.deepEqual(first.graphicSpec, direct.graphicSpec);
    assert.equal(first.graphicSpec.objects.interval.items.length, 1);
    assert.deepEqual(first.semanticSpec.datasets[0].values, values);
  }
});

test("invalid datum range bounds reject immutably and retain area and bar policies", () => {
  for (const mark of ["rect", "rule"]) {
    const before = base(mark, "y"), snapshot = JSON.stringify(before);
    for (const options of [
      { lower: { datum: 1 }, upper: { datum: Infinity } },
      { lower: { datum: NaN }, upper: "high" },
      { lower: "low", upper: { datum: "100" } },
      { lower: { datum: 1, field: "low" }, upper: "high" },
      { lower: "low", upper: {} },
      { lower: { datum: 1 }, upper: { datum: 2 }, fieldType: "temporal" }
    ]) {
      const input = structuredClone(options);
      assert.throws(() => before.encodeYRange(options));
      assert.equal(JSON.stringify(before), snapshot);
      assert.deepEqual(options, input);
    }
  }
  const area = chart().createCanvas().createData({ values: rows }).createAreaMark()
    .encodeX({ field: "position" });
  assert.throws(() => area.encodeYRange({ lower: { datum: 1 }, upper: { datum: 2 } }), /field/i);
  const bar = chart().createCanvas().createData({ values: [{ category: "a", value: 2 }] })
    .createBarMark().encodeX({ field: "category", fieldType: "nominal" });
  assert.throws(() => bar.encodeYRange({ lower: { datum: 0 }, upper: "value" }), /field|datum/i);
});

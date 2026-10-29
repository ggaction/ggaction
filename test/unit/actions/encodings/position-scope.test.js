import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { positionScaleBindings, withPositionScaleBindings } from "../../../../src/actions/encodings/position/scope.js";

test("aggregate position bindings use exact argument identity and expire across nested failure", () => {
  const args = Object.freeze({ id: "curve" }), outer = Object.freeze({ x: "sharedX", y: "sharedY" });
  const inner = Object.freeze({ y: "innerY" });
  assert.deepEqual(positionScaleBindings(args), {});
  const result = withPositionScaleBindings(args, outer, observed => {
    assert.equal(observed, args);
    assert.equal(positionScaleBindings(args), outer);
    assert.deepEqual(positionScaleBindings({ ...args }), {});
    assert.throws(() => withPositionScaleBindings(args, inner, () => {
      assert.equal(positionScaleBindings(args), inner);
      throw new Error("late failure");
    }), /late failure/);
    assert.equal(positionScaleBindings(args), outer);
    return "complete";
  });
  assert.equal(result, "complete");
  assert.deepEqual(positionScaleBindings(args), {});
  assert.throws(() => withPositionScaleBindings(args, outer, () => { throw new Error("outer failure"); }), /outer failure/);
  assert.deepEqual(positionScaleBindings(args), {});
});

test("layered ECDF retains shared probability identity through edit, source revision and editable restore", () => {
  const rows = [{ value: 1, other: 2 }, { value: 2, other: 4 }, { value: 3, other: 6 }];
  const source = chart().createCanvas({ margin: 70 }).createData({ id: "rows", values: rows })
    .createECDFPlot({ id: "first", field: "value" });
  const before = serializeProgram(source);
  const layered = source.createLayerPlot({ id: "second", source: "first", plot: { action: "createECDFPlot" } });
  const scale = p => p.semanticSpec.layers.find(layer => layer.id === "second").encoding.y.scale;
  assert.equal(scale(layered), "firstProbability");
  assert.equal(layered.semanticSpec.scales.some(value => value.id === "secondProbability"), false);
  const edited = layered.editECDFPlot({ target: "second", field: "other" });
  assert.equal(scale(edited), "firstProbability");
  const revised = edited.reviseData({ source: "rows", id: "revised", values: rows.map(row => ({ value: row.value + 1, other: row.other + 2 })) });
  assert.equal(scale(revised), "firstProbability");
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec, revised.graphicSpec);
  assert.equal(serializeProgram(source), before);
  assert.throws(() => layered.createECDFPlot({ id: "independent", field: "value", guides: false }), /requires one Y scale/);
  assert.throws(() => layered.editECDFPlot({ target: "second", field: "missing" }));
  assert.equal(scale(layered.editECDFPlot({ target: "second", field: "other" })), "firstProbability");
});

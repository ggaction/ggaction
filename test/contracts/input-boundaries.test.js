import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { action } from "../../src/core/action.js";
import { ChartProgram } from "../../src/core/ChartProgram.js";

for (const [entry, create] of [["Full", chart], ["Basic", basicChart]]) {
  test(`${entry} rejects unknown primitive options without changing the source`, () => {
    const p = create().createCanvas();
    const before = { semantic: p.semanticSpec, graphic: p.graphicSpec, trace: p.trace };
    for (const [method, options] of [
      ["createGraphics", { id: "points", type: "circle", lenght: 2 }],
      ["editGraphics", { target: "canvas", property: "width", value: 320, extra: 1 }],
      ["editSemantic", { property: "title.text", value: "Changed", extra: 1 }]
    ]) {
      assert.throws(() => p[method](options), /Unknown .* option/);
    }
    assert.equal(p.semanticSpec, before.semantic);
    assert.equal(p.graphicSpec, before.graphic);
    assert.equal(p.trace, before.trace);
  });

  test(`${entry} rejects sparse rows at both source data boundaries`, () => {
    for (const values of [[, { x: 1 }], [{ x: 1 }, ,], new Array(2)]) {
      const p = create();
      const index = Object.hasOwn(values, 0) ? 1 : 0;
      assert.throws(() => p.createData({ values }), new RegExp(`invalid row at index ${index}`));
      assert.throws(() => p.editSemantic({ property: "dataset[data].values", value: values }), /invalid row at index/);
      assert.deepEqual(p.semanticSpec.datasets, []);
      assert.deepEqual(p.trace.children, []);
    }
    const row = Object.assign(Object.create(null), { x: 1, nested: [{ y: 2 }] });
    const p = create().createData({ values: [row] });
    row.nested[0].y = 9;
    assert.equal(p.semanticSpec.datasets[0].values[0].nested[0].y, 2);
  });

  test(`${entry} refuses mutable function cells without freezing caller values`, () => {
    const callback = () => 1;
    callback.metadata = { revision: 1 };
    const values = [{ nested: { callbacks: [callback] } }];
    const p = create();
    assert.throws(() => p.createData({ values }), /Cannot store a function at state\[0\]\.nested\.callbacks\[0\]/);
    assert.equal(Object.isFrozen(callback), false);
    assert.equal(Object.isFrozen(values), false);
    callback.metadata.revision = 2;
    assert.deepEqual(p.semanticSpec.datasets, []);
    assert.deepEqual(p.trace.children, []);
  });
}

test("extension callbacks remain executable without entering immutable trace state", () => {
  class CallbackProgram extends ChartProgram {}
  CallbackProgram.prototype.evaluate = action({ op: "evaluate", description: "Evaluate an external callback." }, function ({ callback }) {
    return this._withContext({ result: callback() });
  });
  const callback = () => 42;
  const p = new CallbackProgram().evaluate({ callback });
  assert.equal(p.context.result, 42);
  assert.deepEqual(p.trace.children[0].args, { callbackType: "function" });
  assert.throws(() => new CallbackProgram({ context: { callback } }), /Cannot store a function/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ChartProgram } from "../../src/ChartProgram.js";
import { action, getWrappedActionMetadata, invokeWrappedActionImplementation } from "../../src/core/action.js";
import { chart } from "../../src/index.js";
import { buildActionRelationships } from "../../scripts/action-relationship-source.js";

test("every cataloged public action rejects malformed and unknown options on a valid source state", async () => {
  const catalog = JSON.parse(await readFile(new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url), "utf8"));
  const originals = new Map();
  const calls = new Map();
  try {
    for (const { name } of catalog.actions) {
      const original = ChartProgram.prototype[name];
      originals.set(name, original);
      ChartProgram.prototype[name] = action(getWrappedActionMetadata(original), function (args = {}) {
        const result = invokeWrappedActionImplementation(original, this, args);
        if (!calls.has(name)) calls.set(name, { source: this, args });
        return result;
      });
    }
    await buildActionRelationships();
  } finally {
    for (const [name, original] of originals) ChartProgram.prototype[name] = original;
  }
  assert.deepEqual([...calls.keys()].sort(), catalog.actions.map(action => action.name).sort());
  const acceptedUnknown = [];
  for (const [name, { source, args }] of calls) {
    const original = originals.get(name);
    const before = JSON.stringify(source);
    assert.ok(original.call(source, args) instanceof ChartProgram, `${name} valid fixture`);
    for (const malformed of [null, [], 1, "options"]) {
      assert.throws(() => original.call(source, malformed), /plain object/, name);
    }
    try { original.call(source, { ...args, __unexpected_option__: true }); acceptedUnknown.push(name); }
    catch { /* The valid source proves rejection is caused by the added option. */ }
    assert.equal(JSON.stringify(source), before, `${name} source is unchanged`);
  }
  assert.deepEqual(acceptedUnknown, []);
});

test("generic, focused, and atomic authoring paths preserve the same intended chart", () => {
  const base = chart().createCanvas().createData({ values: [{ x: 1, y: 4 }, { x: 3, y: 2 }] })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
  const id = base.semanticSpec.layers[0].encoding.x.scale;
  const generic = base.editScale({ id, reverse: true });
  const focused = base.editXScale({ target: "points", reverse: true });
  assert.deepEqual(focused.semanticSpec, generic.semanticSpec);
  assert.deepEqual(focused.graphicSpec, generic.graphicSpec);
  const atomic = base.encodeChannels({ target: "points", channels: { x: { field: "y" }, y: { field: "x" } } });
  const sequential = base.encodeX({ target: "points", field: "y" }).encodeY({ target: "points", field: "x" });
  assert.deepEqual(atomic.semanticSpec, sequential.semanticSpec);
  assert.deepEqual(atomic.graphicSpec, sequential.graphicSpec);
});

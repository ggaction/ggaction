import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

function separatedFrames(create, responsive) {
  let p = create().createCanvas({ width: 500, height: 300, margin: 20,
    ...(responsive ? { responsive: {} } : {}) })
    .createData({ id: "rows", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] });
  for (const [id, alignX] of [["left", "start"], ["right", "end"]]) {
    p = p.createCoordinate({ id });
    const aspect = { mode: "frame", ratio: 0.4, alignX };
    p = typeof p.editCoordinate === "function" ? p.editCoordinate({ target: id, aspect })
      : p.editSemantic({ property: `coordinate[${id}].aspect`, value: aspect });
    p = p.createScatterPlot({ id, data: "rows", coordinate: id,
        x: { field: "x", scale: { id: `${id}X` } },
        y: { field: "y", scale: { id: `${id}Y` } }, guides: false });
  }
  return p;
}

test("Canvas resizing rejects overlapping independent frames before its first child", () => {
  for (const responsive of [false, true]) {
    const create = chart;
    const Base = create().constructor, calls = [];
    let armed = false;
    class CapturingProgram extends Base {}
    for (const name of ["createGraphics", "editGraphics", "editSemantic", "replaceResource"]) {
      if (typeof Base.prototype[name] !== "function") continue;
      CapturingProgram.prototype[name] = function (args) {
        if (armed) calls.push(name);
        return Base.prototype[name].call(this, args);
      };
    }
    const source = separatedFrames(() => new CapturingProgram(), responsive);
    const before = JSON.stringify(source);
    armed = true;
    for (const options of [{ width: 100 }, { margin: { left: 420 } },
      ...(!responsive ? [{ plot: { width: 60, height: 260 } }] : [])]) {
      assert.throws(() => source.editCanvas(options), /overlaps an independent/);
      assert.deepEqual(calls, []);
      assert.equal(JSON.stringify(source), before);
    }
    armed = false;
    const valid = source.editCanvas({ width: 600 });
    assert.equal(valid.graphicSpec.objects.canvas.properties.width, 600);
    const registered = separatedFrames(create, responsive).editCanvas({ width: 600 });
    assert.deepEqual(deserializeProgram(serializeProgram(registered)).graphicSpec, registered.graphicSpec);
  }
});

test("nested snapshots retain separated child frames during resize and scoped edits", () => {
  const child = separatedFrames(chart);
  const source = hconcat({ id: "pair", programs: [{ id: "a", program: child }, { id: "b", program: child }] });
  const before = serializeProgram(source);
  assert.throws(() => source.editCanvas({ target: { childPath: ["a"] }, width: 100 }), /overlaps an independent/);
  assert.equal(serializeProgram(source), before);
  const valid = source.editCanvas({ target: { childPath: ["a"] }, width: 600 });
  assert.deepEqual(deserializeProgram(serializeProgram(valid)).graphicSpec, valid.graphicSpec);
});

test("literal annotations and normalized anchors keep their existing resize lifecycle", () => {
  const source = chart().createCanvas({ width: 500, height: 300, margin: 50, responsive: {} })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .createRugPlot({ x: "x", edge: "bottom", guides: false })
    .createAnnotation({ id: "note", text: "Note", space: "plot", x: 0.5, y: 0.5 });
  const next = source.editCanvas({ width: 400 });
  assert.equal(next.graphicSpec.objects.canvas.properties.width, 400);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
});

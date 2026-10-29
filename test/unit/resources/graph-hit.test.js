import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { prepareProgramHitFrame } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";

const graph = () => chart().createCanvas({ width: 400, height: 200, margin: 0 })
  .createData({ id: "nodes", values: [{ id: "a", score: 3 }, { id: "b", score: 2 }, { id: "c", score: 1 }], keyField: "id" })
  .createData({ id: "edges", values: [{ from: "a", to: "b" }, { from: "b", to: "c" }] })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", attributes: ["score"] })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [
    { key: "a", x: 20, y: 40 }, { key: "b", x: 100, y: 40 }, { key: "c", x: 180, y: 100 }
  ] } }).createGraphPlot({ id: "plot" });
const point = node => ({ x: node.properties.x + node.offset[0], y: node.properties.y + node.offset[1] });
const selection = { field: "attribute:score", op: "gte", value: 2 };

test("graph hit frames follow induced visibility while retaining exact surviving identities", () => {
  const original = graph(), before = serializeProgram(original), first = prepareProgramHitFrame(original, 0);
  const circles = first.scene.nodes.filter(node => node.type === "circle");
  const frame = createHitFrameBridge(first);
  const visible = frame.hit(point(circles[0]), { slop: 0 }).target;
  const hidden = frame.hit(point(circles[2]), { slop: 0 }).target;
  const filtered = original.filterMarks(selection).applyTheme({ theme: "dark" });
  const restored = deserializeProgram(serializeProgram(filtered));
  frame.updateFrame(prepareProgramHitFrame(restored, 1));
  const current = frame.hit(point(circles[0]), { slop: 0 }).target;
  assert.equal(current.itemKey, visible.itemKey);
  assert.deepEqual(current.resourceRefs, visible.resourceRefs);
  assert.equal(frame.hit(point(circles[2]), { slop: 0 }).target, null);
  assert.ok(!prepareProgramHitFrame(restored).entries.some(entry => entry.metadata.itemKey === hidden.itemKey));
  assert.deepEqual(new Set(prepareProgramHitFrame(restored).entries.map(entry => entry.metadata.itemKey)),
    new Set(getMarkItems(restored).map(item => item.key)));
  frame.updateFrame(prepareProgramHitFrame(restored.removeMarkFilter(), 2));
  assert.equal(frame.hit(point(circles[2]), { slop: 0 }).target.itemKey, hidden.itemKey);
  assert.equal(serializeProgram(original), before);
});

test("scoped graph filtering removes only the selected child's hit entries", () => {
  const unit = graph(), combined = hconcat({ programs: [{ id: "left", program: unit }, { id: "right", program: unit }] });
  const filtered = combined.filterMarks({ target: { childPath: ["left"], id: "plot" }, ...selection });
  const frame = prepareProgramHitFrame(filtered);
  for (const child of ["left", "right"]) {
    const keys = new Set(frame.entries.filter(entry => entry.metadata.childPath[0] === child).map(entry => entry.metadata.itemKey));
    assert.deepEqual(keys, new Set(getMarkItems(filtered, { target: { kind: "mark", id: "plot", childPath: [child] } }).map(item => item.key)));
    assert.equal(keys.size, child === "left" ? 3 : 5);
  }
});

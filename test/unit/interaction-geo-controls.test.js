import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { createGeographicMarks } from "../../examples/geographic-marks/program.js";

test("geographic context identity survives sibling visibility and partition focus transactions", () => {
  const geo = createGeographicMarks().selectMarks({ id: "picked", target: "geo-point", items: [] })
    .highlightMarks({ selection: "picked", color: "gold", dimOthers: false, bringToFront: false });
  const points = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ id: "rows", keyField: "id", values: [
    { id: "a", x: 1, y: 2, category: 1 }, { id: "b", x: 2, y: 8, category: "1" }
  ] }).createScatterPlot({ id: "points", x: "x", y: "y", color: "category", guides: false }).createLegend({ channels: ["color"] });
  const hierarchy = chart().createCanvas({ width: 300, height: 250 }).createData({ values: [
    { id: "root", parent: null }, { id: "A", parent: "root", value: 2 }, { id: "B", parent: "root", value: 4 }
  ] }).createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "partition-layout", method: "partition" }).createPartitionPlot({ id: "partition" });
  const program = hconcat({ programs: [{ id: "map", program: geo }, { id: "values", program: points }, { id: "tree", program: hierarchy }] });
  const before = serializeProgram(program), session = createInteractionSession({ program, bindings: [] }), events = [];
  session.subscribe(event => events.push(event));
  try {
    const node = session.getState().scene.nodes.find(node => node.type === "circle" && node.properties.fill === "#dc2626");
    const point = { x: node.offset[0] + node.properties.x, y: node.offset[1] + node.properties.y };
    session.dispatch({ type: "contextMenu", point, slop: 0 });
    const hit = session.getState().hit.target;
    assert.equal(hit.ownerId, "geo-point"); assert.deepEqual(hit.childPath, ["map"]);
    assert.deepEqual(hit.resourceRefs, [{ kind: "geometry", id: "stops", revision: 0 }]);
    assert.equal(session.getState().program, program); assert.equal(session.getState().revision, 0);
    session.dispatch({ type: "select", target: { childPath: ["map"], id: "geo-point" }, payload: { id: "picked", select: { items: [hit.itemKey] } } });
    const selectedMap = session.getState().program.children.map;
    session.dispatch({ type: "setVisibility", target: { childPath: ["values"], id: "points" }, payload: { channel: "color", values: ["1"], visible: false, scaleDomain: "all-data" } });
    session.dispatch({ type: "focusHierarchy", target: { childPath: ["tree"], id: "partition" }, payload: { focus: { key: "A" } } });
    const next = session.getState().program;
    assert.equal(next.children.map, selectedMap);
    for (const value of [next, deserializeProgram(serializeProgram(next))]) {
      assert.deepEqual(getMarkItems(value.children.values, { target: "points" }).map(item => item.fields.id), ["a"]);
      assert.deepEqual(value.children.values.resolvedScales.y.domain, [2, 8]);
      assert.deepEqual(getMarkItems(value.children.tree, { target: "partition" }).filter(item => item.visible).map(item => item.fields.id), ["A"]);
      assert.deepEqual(getMarkItems(value.children.map, { target: "geo-point" }).filter(item => item.properties.fill === "gold").map(item => item.fields.name), ["West"]);
    }
    assert.throws(() => session.dispatch({ type: "setVisibility", target: { childPath: ["map"], id: "geo-point" }, payload: { channel: "color", values: ["West"], visible: false, scaleDomain: "all-data" } }));
    assert.equal(session.getState().program, next); assert.equal(session.getState().revision, 3);
    assert.equal(events.filter(event => event.phase === "commit").length, 3); assert.equal(serializeProgram(program), before);
  } finally { session.destroy(); }
});

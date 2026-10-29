import test from "node:test";
import assert from "node:assert/strict";
import { graphEdgeGeometry } from "../../../../src/materialization/graph/geometry.js";
const style = { parallelGap: 20, loopRadius: 20, arrowSize: 8, arrows: true };
const positions = new Map([["a", { x: 0, y: 0 }], ["b", { x: 90, y: 0 }]]);
const radii = new Map([["a", 6], ["b", 6]]);
const edge = (key, sourceKey = "a", targetKey = "b") => ({ key, sourceKey, targetKey });

test("direct graph routes trim node circles and retain exact arrow ownership", () => {
  const model = { edges: [edge("one")] }, before = JSON.stringify(model);
  const [result] = graphEdgeGeometry(model, positions, radii, style);
  assert.deepEqual(result.commands, [{ op: "M", x: 6, y: 0 }, { op: "C", x1: 30, y1: 0, x2: 60, y2: 0, x: 84, y: 0 }]);
  assert.deepEqual(result.arrowCommands, [{ op: "M", x: 84, y: 0 }, { op: "L", x: 76, y: 4 }, { op: "L", x: 76, y: -4 }, { op: "Z" }]);
  assert.equal(result.edge, model.edges[0]); assert.equal(JSON.stringify(model), before);
});

test("parallel and reverse edges retain independent routes in source order", () => {
  const model = { edges: [edge("one"), edge("two", "b", "a"), edge("three")] };
  const result = graphEdgeGeometry(model, positions, radii, style);
  assert.deepEqual(result.map(r => r.edge.key), ["one", "two", "three"]);
  assert.deepEqual(result.map(r => r.commands[1].y1), [-20, 0, 20]);
  assert.equal(new Set(result.map(r => JSON.stringify(r.commands))).size, 3);
});

test("self-loops and coincident nodes remain visible independent paths", () => {
  const result = graphEdgeGeometry({ edges: [edge("loop", "a", "a"), edge("loop2", "a", "a")] }, positions, radii, style);
  assert.deepEqual(result[0].commands, [{ op: "M", x: -6, y: 0 }, { op: "C", x1: -26, y1: -40, x2: 26, y2: -40, x: 6, y: 0 }]);
  assert.equal(result[1].commands[1].y1, -80);
  const same = new Map([["a", {x:0,y:0}], ["b", {x:0,y:0}]]);
  const [coincident] = graphEdgeGeometry({ edges: [edge("pair")] }, same, radii, style);
  assert.deepEqual(coincident.commands, result[0].commands);
  assert.equal(coincident.edge.sourceKey, "a"); assert.equal(coincident.edge.targetKey, "b");
});

test("zero geometry, arrow suppression, empty graphs and numeric overflow are explicit", () => {
  assert.deepEqual(graphEdgeGeometry({ edges: [] }, positions, radii, style), []);
  const zero = new Map([["a", 0], ["b", 0]]);
  for (const override of [{ arrows: false }, { arrowSize: 0 }]) assert.equal(graphEdgeGeometry({ edges: [edge("a")] }, positions, zero, {...style,...override})[0].arrowCommands, undefined);
  const [flat] = graphEdgeGeometry({ edges: [edge("a", "a", "a")] }, positions, zero, {...style,loopRadius:0});
  assert.ok(flat.commands.every(command => Object.entries(command).every(([key,value])=>key === "op" || Number.isFinite(value))));
  assert.throws(()=>graphEdgeGeometry({ edges: [edge("a")] }, new Map([["a",{x:-1e308,y:0}],["b",{x:1e308,y:0}]]), radii, style), /finite|overflow/i);
});

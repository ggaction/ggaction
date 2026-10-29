import assert from "node:assert/strict";
import test from "node:test";
import { createInteractionSession } from "../../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";
import { createGeographicMarks } from "../../../examples/geographic-marks/program.js";

test("geographic feature selection survives session frames and an exact offline restoration", () => {
  const program = createGeographicMarks().selectMarks({ id: "picked", target: "geo-point", items: [] });
  const original = serializeProgram(program), session = createInteractionSession({ program, bindings: [] });
  try {
    const state = session.getState(), scene = structuredClone(state.scene);
    for (const node of scene.nodes) if (node.type === "circle") node.properties.x += 20;
    assert.deepEqual(session.dispatch({ type: "frame", scene, generation: state.generation, version: state.frameVersion + 1 }), { status: "applied" });
    session.dispatch({ type: "inspect", point: { x: 140, y: 130 }, slop: 0 });
    const hit = session.getState().hit.target;
    assert.equal(hit.ownerId, "geo-point");
    assert.deepEqual(hit.resourceRefs, [{ kind: "geometry", id: "stops", revision: 0 }]);
    assert.deepEqual(session.dispatch({ type: "select", target: "geo-point", payload: { id: "picked", select: { items: [hit.itemKey] } } }), { status: "applied" });
    const selected = session.getState().program;
    for (const value of [selected, deserializeProgram(serializeProgram(selected))]) {
      const resolved = resolveStoredSelection(value, "picked");
      assert.deepEqual(resolved.keys, [hit.itemKey]);
      assert.equal(resolved.items.find(item => item.key === hit.itemKey).fields.name, "West");
    }
    assert.deepEqual(session.dispatch({ type: "frame", scene, generation: 0, version: 100 }), { status: "stale" });
    assert.equal(session.getState().program, selected);
    assert.equal(serializeProgram(program), original);
  } finally { session.destroy(); }
});

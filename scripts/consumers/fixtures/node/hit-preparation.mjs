import assert from "node:assert/strict";
import { chart } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";
import { createTransitionScene } from "ggaction/scene";

const programFor = rows => chart().createCanvas({ width: 400, height: 400, margin: 20, plotBorder: false })
  .createData({ id: "rows", keyField: "id", values: rows }).createPointMark({ id: "points", maxItems: 100000 })
  .encodeX({ field: "x", scale: { id: "x", domain: [0, 1], nice: false } })
  .encodeY({ field: "y", scale: { id: "y", domain: [0, 1], nice: false } });
const host = { addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 620, height: 620 }) };

export const cases = [
  { id: "hit-preparation/all-100000-native-points", run() {
    const count = 100000, side = Math.ceil(Math.sqrt(count));
    const rows = Array.from({ length: count }, (_, id) => ({ id, x: (id % side + 1) / (side + 1), y: (Math.floor(id / side) + 1) / (side + 1) }));
    const original = JSON.stringify(rows), program = programFor(rows), scene = createTransitionScene(program, { format: "canvas" });
    const items = program.graphicSpec.objects.points.items, circles = scene.nodes.filter(node => node.type === "circle");
    assert.equal(items.length, count); assert.equal(circles.length, count); assert.equal(scene.nodes.length, count + 1);
    for (let i = 0; i < count; i++) {
      assert.ok(Math.abs(circles[i].properties.x - (20 + 360 * rows[i].x)) < 1e-10);
      assert.ok(Math.abs(circles[i].properties.y - (380 - 360 * rows[i].y)) < 1e-10);
      assert.deepEqual(items[i].identity.lineage.rowKeys, [program.semanticSpec.datasets[0].rowKeys[i]]);
    }
    for (const hitPreparation of [undefined, {}, { maxWork: 128000000 }]) assert.throws(() => createInteractionSession({ program, bindings: [], hitPreparation }), /item budget/);
    const session = createInteractionSession({ program, bindings: [], hitPreparation: { maxSceneNodes: 100001, maxWork: 128000000 } });
    try {
      assert.equal(session.getState().scene, scene); session.mount(host, { rootTransform: [1.5, 0, 0, 1.5, 7, 11] });
      for (const id of [0, 1, side - 1, 25000, 50000, 75000, count - side, count - 2, count - 1]) {
        const x = 20 + 360 * rows[id].x, y = 380 - 360 * rows[id].y;
        session.dispatch({ type: "inspect", point: { x: x * 1.5 + 7, y: y * 1.5 + 11 }, slop: 0 });
        const result = session.getState().hit, expected = rows.flatMap((row, i) => Math.hypot(20 + 360 * row.x - x, 380 - 360 * row.y - y) <= 3 ? [i] : []).reverse();
        assert.deepEqual(result.candidates.map(value => value.rowKeys), expected.map(i => [program.semanticSpec.datasets[0].rowKeys[i]]));
        assert.ok(result.candidates.every(value => value.ownerId === "points" && value.role === "point" && value.childPath.length === 0 && value.resourceRefs[0].id === "rows"));
        assert.ok(result.statistics.work <= 2000000);
      }
      assert.equal(session.getState().program, program); assert.equal(JSON.stringify(rows), original);
    } finally { session.destroy(); }
  } },
  { id: "hit-preparation/closed-session-policy-atomic-replacement", run() {
    const program = programFor([{ id: "a", x: 0.5, y: 0.5 }]), hitPreparation = { maxSceneNodes: 3, maxWork: 10000000 };
    const session = createInteractionSession({ program, bindings: [], hitPreparation }); hitPreparation.maxSceneNodes = 200000;
    try {
      session.mount(host); const previous = session.getState();
      assert.throws(() => session.updateProgram(programFor(Array.from({ length: 4 }, (_, id) => ({ id, x: id / 4, y: id / 4 })))), /item budget/);
      assert.equal(session.getState().program, previous.program); assert.equal(session.getState().scene, previous.scene); assert.equal(session.getState().revision, 0);
      const modified = program.editPointMark({ target: "points", fill: "red" }); session.updateProgram(modified, { history: "record" });
      session.dispatch({ type: "undo" }); assert.equal(session.getState().program, program); session.dispatch({ type: "redo" }); assert.equal(session.getState().program, modified);
      assert.throws(() => session.dispatch({ type: "leave", hitPreparation: {} }), /unsupported/);
      assert.ok(!Object.hasOwn(session.getState(), "hitPreparation"));
    } finally { session.destroy(); }
    assert.throws(() => createInteractionSession({ program, hitPreparation: { maxWork: 128000001 } }), /maxWork/);
    assert.throws(() => createInteractionSession({ program, hitPreparation: { queryWork: 3000000 } }), /unsupported/);
  } }
];

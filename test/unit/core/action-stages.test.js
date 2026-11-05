import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { invokeActionStages, invokeWrappedActionImplementation } from "../../../src/core/action.js";
import { drainStages } from "../../../src/core/stages.js";

const program = () => chart().createCanvas({ width: 200, height: 120 })
  .createData({ id: "rows", keyField: "id", values: Array.from({ length: 3000 }, (_, id) => ({ id, x: id % 40, y: id % 17 })) })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });

test("staged invocation equals the synchronous action, trace and errors included", () => {
  const base = program(), args = { target: "points", property: "fill", value: "red" };
  const staged = invokeActionStages(base, base.editGraphics, args);
  let yields = 0, step = staged.next();
  while (!step.done) { yields++; step = staged.next(); }
  assert.ok(yields > 0);
  assert.equal(serializeProgram(step.value), serializeProgram(base.editGraphics(args)));
  assert.throws(() => drainStages(invokeActionStages(base, base.editGraphics, { target: "points", property: "fill" })), /requires a value/);
  assert.throws(() => drainStages(invokeActionStages(base, base.editGraphics, { target: "points", unknown: 1 })), /Unknown/);
});

test("plain methods keep their call shape and staged actions run through their direct implementation", () => {
  const base = program(), calls = [];
  const method = function (...args) { calls.push(args.length); return this; };
  assert.equal(drainStages(invokeActionStages(base, method)), base);
  assert.equal(drainStages(invokeActionStages(base, method, { id: 1 })), base);
  assert.deepEqual(calls, [0, 1]);
  const entered = base._enterAction({ op: "test", description: "Test", scope: "unit", args: {} });
  const direct = invokeWrappedActionImplementation(base.editGraphics, entered, { target: "points", property: "opacity", value: 0.5 });
  assert.equal(direct.graphicSpec.objects.points.items[0].properties.opacity, 0.5);
});

import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/ChartProgram.js";
import { hconcat } from "../../src/composition.js";
import {
  comparePrograms,
  describeAction,
  inspectProgram
} from "../../src/inspection.js";

function pointProgram() {
  return chart()
    .createCanvas({ width: 300, height: 200 })
    .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("describeAction reports supported and incompatible checks without execution", () => {
  const program = pointProgram();
  const supported = describeAction(program, {
    action: "encodeShape",
    target: { kind: "mark", id: "points" },
    options: { field: "x" }
  });
  const missing = describeAction(program, {
    action: "encodeShape",
    target: { kind: "mark", id: "points" },
    options: { field: "missing" }
  });
  const canvas = describeAction(program, { action: "createCanvas" });

  assert.equal(supported.applicability, "supported");
  assert.equal(supported.checks.find(check => check.name === "execution").status, "not_run");
  assert.equal(missing.applicability, "incompatible");
  assert.equal(missing.findings[0].reason, "field-unavailable");
  assert.equal(canvas.applicability, "supported");
  assert.ok(canvas.parameterDefinitions.some(definition => definition.path === "width"));
  assert.equal(program.trace.children.at(-1).op, "encodeY");
});

test("describeAction rejects unsupported mark combinations and unknown actions", () => {
  const line = chart()
    .createCanvas()
    .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createLineMark({ id: "line" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });

  assert.equal(describeAction(line, {
    action: "encodeShape",
    target: { kind: "mark", id: "line" },
    options: { field: "x" }
  }).applicability, "unsupported");
  assert.equal(describeAction(line, { action: "doesNotExist" }).applicability, "unsupported");
});

test("comparePrograms ignores trace-only identity and reports binding roles", () => {
  const before = pointProgram();
  const same = before._withContext({ currentMark: "points" });
  const after = before.encodeY({ target: "points", field: "x" });

  assert.equal(comparePrograms(before, same).equivalence, "equal");
  const comparison = comparePrograms(before, after);
  const mark = comparison.changes.find(change => change.resource.kind === "mark" && change.resource.id === "points");
  assert.equal(comparison.equivalence, "different");
  assert.equal(mark.effect, "binding");
  assert.deepEqual(mark.roles, ["y"]);
});

test("comparePrograms includes composition intent and changed consumers in target scope", () => {
  const child = pointProgram();
  const before = hconcat({ programs: [
    { id: "left", program: child },
    { id: "right", program: child }
  ] });
  const after = before.editCompositionLayout({ gap: 32 });
  assert.ok(comparePrograms(before, after).changes.some(change =>
    change.resource.kind === "composition" && change.effect === "structure"
  ));

  const rebound = child.encodeY({ target: "points", field: "x" });
  const scoped = comparePrograms(child, rebound, {
    target: { kind: "data", id: "source" }
  });
  assert.ok(scoped.changes.some(change =>
    change.resource.kind === "mark" && change.resource.id === "points"
  ));
  assert.equal(scoped.completeProgramComparison, false);
});

test("inspectProgram reports concrete item visibility and target relationships", () => {
  const program = pointProgram().editPointMark({ target: "points", opacity: 0 });
  const inspection = inspectProgram(program);
  const view = inspection.views[0];

  assert.equal(view.rawRows, 2);
  assert.equal(view.logicalDataItems, 2);
  assert.equal(view.visibleCandidates, 0);
  assert.equal(view.flags.find(flag => flag.reason === "opacity-zero").count, 2);
  assert.equal(inspection.checks[0].status, "not_run");
  assert.equal(inspectProgram(program, { target: { kind: "data", id: "source" } }).views.length, 1);
});

test("inspection resolves stable logical dataset owners after focused edits", () => {
  const before = chart()
    .createCanvas({ width: 300, height: 200 })
    .createData({ id: "source", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .filterData({ id: "selection", source: "source", field: "x", range: { min: 1 } })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const after = before.editFilteredData({
    target: "selection",
    range: { min: 2 },
    dependents: "recompute"
  });

  assert.equal(inspectProgram(after, {
    target: { kind: "data", id: "selection" }
  }).views.length, 1);
  assert.equal(comparePrograms(before, after, {
    target: { kind: "data", id: "selection" }
  }).equivalence, "different");
});

test("inspectProgram keeps guide items separate from data-mark counts", () => {
  const program = pointProgram().createAxes();
  const report = inspectProgram(program);
  const point = report.views.find(view => view.owner.id === "points");
  const axes = report.views.find(view => view.owner.kind === "guide" && view.owner.id === "axis");
  assert.equal(point.logicalDataItems, 2);
  assert.ok(axes.logicalDataItems > 0);
  const targeted = inspectProgram(program, {
    target: { kind: "guide", id: "axis" }
  });
  assert.deepEqual(targeted.views.map(view => view.owner.id), ["axis"]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { chart } from "../../src/ChartProgram.js";
import { getWrappedActionMetadata } from "../../src/core/action.js";
import { describeAction } from "../../src/inspection.js";
import { buildInspectionDescriptors } from "../../scripts/generate-inspection-descriptors.js";

test("keeps browser inspection descriptors synchronized with action cards", async () => {
  assert.equal(
    await readFile(new URL("../../src/inspectionDescriptors.js", import.meta.url), "utf8"),
    await buildInspectionDescriptors()
  );
});

test("covers every registered built-in action without descriptor evasion", () => {
  const program = chart();
  const actions = new Set();
  for (let prototype = Object.getPrototypeOf(program);
    prototype !== null;
    prototype = Object.getPrototypeOf(prototype)) {
    for (const name of Object.getOwnPropertyNames(prototype)) {
      if (getWrappedActionMetadata(program[name]) !== undefined) actions.add(name);
    }
  }
  assert.ok(actions.size > 300);
  for (const action of actions) {
    const description = describeAction(program, { action });
    assert.notEqual(description.applicability, "unverified", action);
    assert.notEqual(description.applicability, "unsupported", action);
  }
});

test("hierarchy discovery describes stored layout prerequisites and object paint options", async () => {
  const cards = JSON.parse(await readFile(new URL("../../knowledge/action-cards.json", import.meta.url), "utf8")).cards;
  assert.deepEqual(cards.find(card => card.name === "layoutHierarchy").resources.prerequisites,
    ["existing hierarchy resource"]);
  const layout = describeAction(chart(), { action: "layoutHierarchy" });
  assert.equal(layout.parameterDefinitions.find(option => option.path === "hierarchy").kind, "resource");
  for (const action of ["createTreePlot", "editTreePlot", "createTreemapPlot", "editTreemapPlot"]) {
    const prerequisites = cards.find(card => card.name === action).resources.prerequisites;
    assert.equal(prerequisites.includes("canvas and dataset context"), false);
    assert.equal(prerequisites.includes(`canvas and ${action.includes("Treemap") ? "treemap" : "tree"} layout resource`), true);
    const description = describeAction(chart(), { action });
    assert.equal(description.parameterDefinitions.find(option => option.path === "layout").kind, "resource");
    for (const name of [action.includes("Treemap") ? "cells" : "nodes", "labels"]) {
      assert.equal(description.parameterDefinitions.find(option => option.path === name).kind, "object");
    }
  }
});

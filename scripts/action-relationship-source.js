import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chart } from "../src/index.js";
import {
  buildScenario,
  generateScenarioDescriptors
} from "../test/support/scenarios/engine.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");

function selectionLifecyclePrograms() {
  const selected = chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({ values: [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 3 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .selectMarks({ id: "focus", field: "x", op: "max" })
    .highlightMarks({ selection: "focus", color: "#dc2626" })
    .editMarkSelection({ selection: "focus", field: "x", op: "min" });
  return [selected, selected.removeMarkSelection({ selection: "focus" })];
}

function collectDirectRelationships(trace, directNames, relationships, observed) {
  if (directNames.has(trace.op)) {
    observed.add(trace.op);
    const wraps = relationships.get(trace.op);
    for (const child of trace.children ?? []) {
      if (directNames.has(child.op) && child.op !== trace.op) wraps.add(child.op);
    }
  }
  for (const child of trace.children ?? []) {
    collectDirectRelationships(child, directNames, relationships, observed);
  }
}

export async function buildActionRelationships() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  const actionNames = catalog.actions.map(action => action.name);
  const directNames = new Set(actionNames);
  const relationships = new Map(actionNames.map(name => [name, new Set()]));
  const observed = new Set();
  const descriptors = generateScenarioDescriptors({
    mode: "smoke",
    includeTidyTuesday: false
  });
  const programs = [
    ...descriptors.map(buildScenario),
    ...selectionLifecyclePrograms()
  ];
  for (const program of programs) {
    collectDirectRelationships(program.trace, directNames, relationships, observed);
  }
  const missing = actionNames.filter(name => !observed.has(name));
  if (missing.length > 0) {
    throw new Error(`Action relationship corpus is missing: ${missing.join(", ")}.`);
  }
  return {
    schemaVersion: 1,
    source: "generated lifecycle smoke corpus plus selection lifecycle",
    actionCount: actionNames.length,
    relationships: actionNames.map(name => ({
      name,
      wraps: [...relationships.get(name)]
    }))
  };
}

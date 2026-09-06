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

function focusedScaleEditorPrograms() {
  const values = [
    { x: 1, y: 2, group: "a", amount: 2 },
    { x: 2, y: 3, group: "a", amount: 2 },
    { x: 3, y: 4, group: "b", amount: 5 },
    { x: 4, y: 5, group: "b", amount: 5 }
  ];
  const point = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeSize({ field: "amount" })
    .encodeOpacity({ field: "amount" })
    .encodeShape({ field: "group" })
    .editXScale({ reverse: true })
    .editYScale({ reverse: true })
    .editColorScale({ palette: "set2" })
    .editSizeScale({ range: [20, 80] })
    .editOpacityScale({ range: [0.2, 0.9] })
    .editShapeScale({ range: ["circle", "diamond"] });
  const polar = chart()
    .createCanvas({ width: 240, height: 240, margin: 30 })
    .createData({ values })
    .createPointMark()
    .encodeTheta({ field: "x" })
    .encodeR({ field: "amount" })
    .editThetaScale({ reverse: true })
    .editRScale({ domain: [0, 8] });
  const line = chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ values })
    .createLineMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeGroup({ field: "group" })
    .encodeStrokeWidth({ field: "amount" })
    .encodeStrokeDash({ field: "group" })
    .editStrokeWidthScale({ range: [1, 8] })
    .editStrokeDashScale({ range: [[], [6, 2]] });
  return [point, polar, line];
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
    ...selectionLifecyclePrograms(),
    ...focusedScaleEditorPrograms()
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

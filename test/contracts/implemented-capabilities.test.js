import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ACTION_CONTRACT_ROOT,
  ACTION_INDEX,
  contractCorpus,
  owningActionSection,
  REPOSITORY_ROOT
} from "../support/action-contracts.js";

const root = REPOSITORY_ROOT;
const contractRoot = ACTION_CONTRACT_ROOT;
const index = ACTION_INDEX;
const plannedCorpus = contractCorpus("planned");

test("keeps implemented capability groups out of planned inventory", () => {
  const currentNames = new Set(index.actions.map(action => action.name));
  const plannedNames = new Set(index.plannedActions.map(action => action.name));
  const plannedIds = new Set(index.plannedCapabilities.map(item => item.id));
  const groups = [
    {
      actions: ["editHorizontalGrid", "editVerticalGrid", "editLegend", "editTitle"],
      capabilities: [
        "top-x-axis-position", "right-y-axis-position",
        "axis-label-format-strings", "left-legend-position",
        "chart-title-positions", "title-wrapping-and-measurement"
      ]
    },
    {
      actions: [
        "createRuleMark", "encodeStroke", "encodeStrokeWidth",
        "createIntervalData", "createErrorBar", "encodeX2"
      ],
      capabilities: [
        "error-bar-horizontal-and-explicit", "error-bar-cap-and-style-options"
      ]
    },
    {
      actions: ["createErrorBand", "encodeXRange"],
      capabilities: [
        "error-band-curve-and-advanced-boundaries",
        "regression-error-band-delegation",
        "composite-mark-ownership-and-storage"
      ]
    },
    {
      actions: [
        "createThetaAxis", "createRadialAxis",
        "editThetaAxis", "editRadialAxis",
        "editThetaAxisLine", "editRadialAxisLine",
        "editThetaAxisTicks", "editRadialAxisTicks",
        "editThetaAxisLabels", "editRadialAxisLabels",
        "editThetaAxisTitle", "editRadialAxisTitle",
        "removeThetaAxis", "removeRadialAxis",
        "createThetaGrid", "createRadialGrid",
        "editThetaGrid", "editRadialGrid"
      ],
      capabilities: ["polar-guides"]
    }
  ];

  for (const group of groups) {
    for (const action of group.actions) {
      assert.equal(currentNames.has(action), true, action);
      assert.equal(plannedNames.has(action), false, action);
    }
    for (const capability of group.capabilities) {
      assert.equal(plannedIds.has(capability), false, capability);
    }
  }
});

test("keeps the implemented box-plot contract complete", () => {
  const contract = owningActionSection("createBoxPlot").source;
  assert.equal(index.actions.some(action => action.name === "createBoxPlot"), true);
  assert.equal(index.plannedActions.some(action => action.name === "createBoxPlot"), false);
  assert.match(contract, /factor\?: PositiveFinite/);
  assert.match(contract, /type: "minmax"; factor\?: never/);
  assert.match(contract, /width\?: \{ band\?: UnitIntervalExclusive \}/);
  assert.match(contract, /outliers\?: boolean/);
  assert.match(contract, /box\?: \{/);
  assert.match(contract, /median\?: \{/);
  assert.match(contract, /outlier\?: \{/);
  assert.doesNotMatch(plannedCorpus, /createBoxPlot\(\{/);
});

test("keeps mark selection current, documented, and executable", () => {
  const names = ["filterMarks", "selectMarks", "highlightMarks", "editBarMark"];
  const current = new Map(index.actions.map(action => [action.name, action]));
  const types = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
  const reference = readFileSync(path.join(root, "docs/reference/actions.md"), "utf8");
  const contract = readFileSync(
    path.join(contractRoot, "current/MARK_SELECTION.md"),
    "utf8"
  );

  for (const name of names) {
    assert.deepEqual(current.get(name)?.coverage, {
      contract: "complete",
      effects: "complete",
      tests: "complete"
    });
    assert.match(types, new RegExp(`\\b${name}\\(`));
    assert.match(reference, new RegExp(`\\b${name}\\b`));
  }
  assert.match(contract, /^## Capability: `mark-item-selection-grammar`$/m);
  assert.doesNotMatch(plannedCorpus, /^## `selectRows`$/m);
  assert.equal(existsSync(path.join(root, "examples/mark-selection/program.js")), true);
  for (const chart of [
    "mark-selection-points", "mark-selection-bars", "mark-selection-lines"
  ]) {
    assert.equal(existsSync(path.join(
      root,
      `test/charts/${chart}/variants/manifest.js`
    )), true, chart);
  }
});

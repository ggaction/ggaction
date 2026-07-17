import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const contractRoot = path.join(root, "agent_docs/contract");
const index = JSON.parse(readFileSync(
  path.join(contractRoot, "ACTION_INDEX.json"),
  "utf8"
));
const currentFiles = readdirSync(path.join(contractRoot, "current"))
  .filter(file => file.endsWith(".md"))
  .map(file => path.join(contractRoot, "current", file));
const plannedCorpus = readdirSync(path.join(contractRoot, "planned"))
  .filter(file => file.endsWith(".md"))
  .map(file => readFileSync(path.join(contractRoot, "planned", file), "utf8"))
  .join("\n");

function owningSection(action) {
  const heading = `## \`${action}\``;
  const matches = currentFiles.flatMap(file => {
    const source = readFileSync(file, "utf8");
    const start = source.indexOf(heading);
    if (start < 0) return [];
    const next = source.indexOf("\n## ", start + heading.length);
    return [source.slice(start, next < 0 ? source.length : next)];
  });
  assert.equal(matches.length, 1, `${action} must have one owning contract`);
  return matches[0];
}

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
  const contract = owningSection("createBoxPlot");
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

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

export const CRITICAL_COVERAGE_FAMILIES = Object.freeze({
  "position-policies": Object.freeze({
    prefix: "actions/encodings/position/policies/",
    floor: Object.freeze({ lines: 50, branches: 30, functions: 80 }),
    rationale: "Every positional mark policy must remain executable through shared encodings."
  }),
  "selection-materialization": Object.freeze({
    prefix: "materialization/selection/",
    floor: Object.freeze({ lines: 80, branches: 65, functions: 80 }),
    rationale: "Selection grain and rematerialization errors silently target the wrong marks."
  }),
  "canvas-renderer": Object.freeze({
    prefix: "renderers/canvas/",
    floor: Object.freeze({ lines: 75, branches: 60, functions: 80 }),
    rationale: "Every concrete primitive renderer is a public rendering boundary."
  }),
  "regression-grammar": Object.freeze({
    prefix: "grammar/regression/",
    floor: Object.freeze({ lines: 90, branches: 75, functions: 100 }),
    rationale: "Every regression validation, fit, and prediction owner must preserve the statistical contract."
  })
});

export const CRITICAL_COVERAGE_OVERRIDES = Object.freeze({
  "actions/selection/actions.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "actions/encodings/position/policies/index.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "core/immutable.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "grammar/areaSeries.js": Object.freeze({ lines: 75, branches: 75, functions: 100 }),
  "grammar/markFilter.js": Object.freeze({ lines: 75, branches: 60, functions: 100 }),
  "grammar/markSelection.js": Object.freeze({ lines: 90, branches: 90, functions: 100 }),
  "grammar/scales/definition.js": Object.freeze({
    lines: 90,
    branches: 85,
    functions: 100
  }),
  "grammar/schemas/concreteGraphic.js": Object.freeze({
    lines: 85,
    branches: 85,
    functions: 100
  }),
  "grammar/schemas/graphicTree.js": Object.freeze({
    lines: 90,
    branches: 85,
    functions: 90
  }),
  "grammar/schemas/graphicBounds.js": Object.freeze({
    lines: 85,
    branches: 75,
    functions: 90
  }),
  "grammar/transforms.js": Object.freeze({
    lines: 85,
    branches: 75,
    functions: 100
  }),
  "layout/grid.js": Object.freeze({ lines: 100, branches: 100, functions: 100 }),
  "layout/legend.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "layout/title.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/planner.js": Object.freeze({
    lines: 95,
    branches: 95,
    functions: 100
  }),
  "materialization/selection/filter.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "materialization/selection/items/common.js": Object.freeze({
    lines: 85,
    branches: 70,
    functions: 90
  }),
  "materialization/selection/items/bar.js": Object.freeze({
    lines: 90,
    branches: 70,
    functions: 80
  }),
  "materialization/selection/items/path.js": Object.freeze({
    lines: 90,
    branches: 70,
    functions: 100
  }),
  "materialization/selection/items/point.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 100
  }),
  "materialization/selection/items/rule.js": Object.freeze({
    lines: 95,
    branches: 85,
    functions: 100
  }),
  "materialization/selection/policies/index.js": Object.freeze({
    lines: 90,
    branches: 85,
    functions: 100
  }),
  "materialization/selection/state.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 100
  }),
  "materialization/selection/styles.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "renderers/canvas/index.js": Object.freeze({ lines: 85, branches: 70, functions: 100 }),
  "renderers/png.js": Object.freeze({ lines: 90, branches: 80, functions: 100 })
});

function sourceFiles(directory, relative = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const childRelative = path.posix.join(relative, entry.name);
    const child = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(child, childRelative)
      : entry.name.endsWith(".js") ? [childRelative] : [];
  });
}

export function coverageFloorsForFiles(
  files,
  families = CRITICAL_COVERAGE_FAMILIES,
  overrides = CRITICAL_COVERAGE_OVERRIDES
) {
  const floors = {};
  for (const file of files) {
    for (const family of Object.values(families)) {
      if (file.startsWith(family.prefix)) floors[file] = family.floor;
    }
  }
  return Object.freeze({ ...floors, ...overrides });
}

export const CRITICAL_COVERAGE_FLOORS = coverageFloorsForFiles(sourceFiles(sourceRoot));

export function parseCoverageTable(output) {
  const stack = [];
  const files = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(
      /^(?:ℹ|#)( +)([^|]+?)\s+\|\s*([\d.]+)?\s*\|\s*([\d.]+)?\s*\|\s*([\d.]+)?\s*\|/
    );
    if (!match || match[2].trim() === "file") continue;
    const depth = match[1].length;
    const name = match[2].trim();
    stack.length = depth - 1;
    stack[depth - 1] = name;
    if (match[3] === undefined) continue;
    const relative = stack[0] === "src"
      ? stack.slice(1).join("/")
      : stack.join("/");
    files.set(relative, Object.freeze({
      lines: Number(match[3]),
      branches: Number(match[4]),
      functions: Number(match[5])
    }));
  }
  return files;
}

export function assertCriticalCoverage(
  output,
  floors = CRITICAL_COVERAGE_FLOORS
) {
  const coverage = parseCoverageTable(output);
  const failures = [];
  for (const [file, floor] of Object.entries(floors)) {
    const actual = coverage.get(file);
    if (actual === undefined) {
      failures.push(`${file}: missing from coverage report`);
      continue;
    }
    for (const metric of ["lines", "branches", "functions"]) {
      if (actual[metric] < floor[metric]) {
        failures.push(
          `${file}: ${metric} ${actual[metric]}% is below ${floor[metric]}%`
        );
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Critical coverage policy failed:\n${failures.join("\n")}`);
  }
}

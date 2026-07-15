export const CRITICAL_COVERAGE_FLOORS = Object.freeze({
  "core/immutable.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "grammar/areaSeries.js": Object.freeze({ lines: 75, branches: 75, functions: 100 }),
  "grammar/regression.js": Object.freeze({ lines: 90, branches: 75, functions: 100 }),
  "grammar/schemas/concreteGraphic.js": Object.freeze({
    lines: 85,
    branches: 85,
    functions: 100
  }),
  "renderers/canvas/index.js": Object.freeze({ lines: 85, branches: 70, functions: 100 }),
  "renderers/png.js": Object.freeze({ lines: 90, branches: 80, functions: 100 })
});

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

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

export const CRITICAL_COVERAGE_FAMILIES = Object.freeze({
  "structured-paint": { prefix: "grammar/paint.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Authored and concrete fill contracts must preserve normalized coordinate frames and reject unsafe values." },
  "gradient-stops": { prefix: "grammar/gradientStops.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Ordered stops and hard transitions share one complete validation owner." },
  "fill-materialization": { prefix: "materialization/fillPaint.js", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Explicit fill origins, glyph bounds and cumulative pattern work must remain exercised." },
  "paint-color": { prefix: "grammar/color.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Paint colors must have finite host-independent channels and preserve legacy scale parsing." },
  "image-payload": { prefix: "grammar/imagePayload", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-mark-options": { prefix: "grammar/imageMark", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "asset-request": { prefix: "grammar/assetRequest", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "asset-host": { prefix: "core/assetHost", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-resource-preparation": { prefix: "resources/imageResource", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-resource-actions": { prefix: "actions/images/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-mark-actions": { prefix: "actions/marks/image/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-rendering": { prefix: "renderers/imageRendering", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "canvas-scene-compiler": { prefix: "renderers/canvasScene", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-drawing": { prefix: "renderers/canvas/image", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-selection": { prefix: "materialization/selection/policies/image", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },

  "png-byte-encoding": { prefix: "core/pngEncoding", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Bounded glyph PNG bytes must preserve RGBA and reject unsafe inputs before allocation." },
  "conditional-grammar": { prefix: "grammar/conditional", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Ordered predicates and stored branch contracts must reject inactive malformed inputs." },
  "conditional-materialization": { prefix: "materialization/conditional", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Final item grain, exact dependencies and conditional rematerialization must remain exercised." },
  "asset-preparation": { prefix: "resources/assetPreparation", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image and font preparation share exact bytes, host errors and abort cleanup." },
  "font-preparation": { prefix: "resources/resolveFonts", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared font bytes and measured widths must bind the same explicit font identity and provider." },
  "svg-image-validation": { prefix: "grammar/svgImage", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Static SVG parsing, local resource identity and decoder budgets must reject active content before host work." },
  "image-preparation": { prefix: "resources/resolveAssets", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Asset bytes, identity, abort and export eligibility must remain exercised before host callbacks." },
  "image-placement": { prefix: "materialization/image", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image fit and viewport clipping must share finite, aspect-preserving concrete geometry." },
  "graph": { prefix: "grammar/graph/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Graph topology, metrics and finite geometry must preserve typed identity, missing policies and bounded work." },
  "hierarchy-grammar": { prefix: "grammar/hierarchy/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Hierarchy identity, topology, aggregation and bounded layout must preserve exact node meaning." },
  "source-preparation": { prefix: "resources/", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Host input, opaque preparation and freshness must be validated before application." },
  "source-grammar": { prefix: "grammar/dataSource", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Parsing, retained payload and request proofs must agree without host execution." },
  "data-resource-revision": { prefix: "actions/data/resourceRevision", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Exact-class data-backed resource dispatch must preserve immutable registration and Basic isolation." },
  "source-actions": { prefix: "actions/data/source", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Prepared source planning and exact child contexts preserve atomic application." },
  "source-state": { prefix: "materialization/dataSourceState", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Historic receipts and live source revisions have distinct validated owners." },
  "source-primitive-context": { prefix: "actions/primitives/preparedResourceContext", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Prepared replacement authority must expire on every exit." },
  "complete-grammar": { prefix: "grammar/complete", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Completion must preserve observed rows and explicitly bound calendar expansion, grouping and work." },
  "pivot-actions": { prefix: "actions/data/pivot", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Pivot inference, ownership and explicit materialization must remain exercised." },
  "calendar-day": { prefix: "grammar/calendarDay", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Civil-day domains must preserve strict parsing, explicit zones, DST boundaries and bounded output." },
  "pivot-grammar": { prefix: "grammar/pivot", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Pivot grouping, typed columns, numerical policies and work limits must remain exercised." },
  "transform-input": { prefix: "grammar/transformInput", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Shared data input validation must remain safe before dispatch in Full and Basic." },
  "expression-kernel": { prefix: "grammar/expression", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Closed AST evaluation, explicit types, lazy diagnostics and resource budgets must remain exercised." },
  "path-geometry": { prefix: "grammar/path", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "Concrete path validation, topology and numeric geometry must remain exercised." },
  "radial-gradient-kernel": { prefix: "grammar/radialGradient", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared radial geometry, focal containment and ordered stop validation must remain exercised." },
  "shadow-kernel": { prefix: "grammar/shadow", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Deterministic alpha-mask convolution, finite bounds and allocation preflight must remain exercised." },
  "compositing-kernel": { prefix: "grammar/compositing", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Premultiplied blend equations, one group attenuation and bounded quantization must remain exercised." },
  "pattern-kernel": { prefix: "grammar/patterns", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared vector tile normalization, periodic coverage and bounded geometry must remain exercised." },
  "resource-state": { prefix: "materialization/resourceState", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "Stored resource revisions and dependency validation must remain exercised." },
  "builtin-resource-kinds": { prefix: "materialization/resourceKinds", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Class-specific builtin validation must reject unsafe records, inheritance and repeated registration." },
  "row-lineage": { prefix: "grammar/rowLineage", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "Every transform must preserve exact contributing rows." },
  "core-state": { prefix: "core/", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "State and action boundaries must remain exercised." },
  "all-renderers": { prefix: "renderers/", floor: { lines: 50, branches: 60, functions: 80 }, rationale: "Includes the lazy native loader; Canvas and explicit overrides retain stricter floors." },
  "all-selectors": { prefix: "selectors/", floor: { lines: 80, branches: 80, functions: 80 }, rationale: "Resource identity and ambiguity are public contracts." },
  "mcp": { prefix: "mcp/", floor: { lines: 85, branches: 75, functions: 70 }, rationale: "Adapter and server contracts need explicit evidence." },
  "inspection": { prefix: "inspection", floor: { lines: 90, branches: 80, functions: 90 }, rationale: "Inspection descriptors and state must agree." },
  "scene": { prefix: "scene", floor: { lines: 95, branches: 90, functions: 95 }, rationale: "Scene construction is a public boundary." },
  "legend-policies": Object.freeze({
    prefix: "grammar/legend",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Legend eligibility, stored intent and paint policies must reject incompatible edits atomically."
  }),
  "facet-guide-scaffolding": Object.freeze({
    prefix: "materialization/facetGuides/",
    floor: Object.freeze({ lines: 80, branches: 75, functions: 80 }),
    rationale: "Shared facet scaffolding must retain independent guides through composition and replay."
  }),
  "snapshot-validation": Object.freeze({
    prefix: "persistence/",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Persisted snapshots must preserve values and reject malformed state before editable restoration."
  }),
  "guide-layout-validation": Object.freeze({
    prefix: "materialization/guides/",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Guide ownership and final-state collision validation must remain symmetric across domain actions."
  }),
  "parallel-axis-policies": Object.freeze({
    prefix: "actions/guides/axes/parallel/",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Field recipes, component lifecycle and scale replay must preserve Parallel axis ownership."
  }),
  "coordinate-policies": Object.freeze({
    prefix: "actions/coordinates/",
    floor: Object.freeze({ lines: 85, branches: 75, functions: 85 }),
    rationale: "Coordinate ownership and inference must reject ambiguity consistently."
  }),
  "position-policies": Object.freeze({
    prefix: "grammar/positionPolicies/",
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
  "actions/encodings/conditional.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/legendEncodings.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/overlayGeometry.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/valueEncoding.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "layout/facetHeaderTitles.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/data/regressionStatistics.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/colorSize.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/combine.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/graphicProperties.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "actions/primitives/semanticAction.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/axisTextPlacement.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "grammar/colorSizeLegend.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/facets/legendIntent.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/guideDash.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/facetGuides/edit.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/facetGuides/owner.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/facetGuides/ownerLayout.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/graphicTranslation.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/legendBorder.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/legendClip.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "selectors/axes.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "selectors/graphicCapacity.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/continuous/colorSymbols.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/intervals/revision.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/primitives/graphicProperties.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "accessibility.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "persistence.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/positionDatum.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/pointPolygon.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "grammar/markLabels.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "actions/guides/legends/transition.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "layout/guideCollisions.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "layout/legendLane.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "layout/legendItems.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/creation.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/edit.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/lifecycle.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/parallelAxisTitles.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "actions/encodings/seriesLayout.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "actions/charts/area.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "actions/encodings/density/resolve.js": Object.freeze({
    lines: 90,
    branches: 80,
    functions: 100
  }),
  "actions/encodings/horizon/resolve.js": Object.freeze({
    lines: 80,
    branches: 70,
    functions: 90
  }),
  "actions/guides/axes/parallel/resolve.js": Object.freeze({
    lines: 90,
    branches: 80,
    functions: 100
  }),
  "actions/marks/area/materialize.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 80
  }),
  "actions/marks/line/materialize.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 90
  }),
  "actions/scales/patch.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 100
  }),
  "actions/selection/actions.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "grammar/positionPolicies/index.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "core/immutable.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "core/compositionState.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "core/font.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/textMetricProfile.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "materialization/typography.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/textMetrics.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
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
  "materialization/layout.js": Object.freeze({
    lines: 100,
    branches: 100,
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
    if (file === "mcp/cli.js") continue;
    for (const family of Object.values(families)) {
      if (file.startsWith(family.prefix)) floors[file] = Object.fromEntries(
        ["lines", "branches", "functions"].map(metric => [metric, Math.max(floors[file]?.[metric] ?? 0, family.floor[metric])])
      );
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
    if (match[3] === undefined && !name.endsWith(".js")) continue;
    const metrics = match.slice(3, 6).map(Number);
    if (metrics.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
      throw new Error(`Malformed coverage metrics for ${name}.`);
    }
    const relative = stack[0] === "src"
      ? stack.slice(1).join("/")
      : stack.join("/");
    if (files.has(relative)) throw new Error(`Duplicate coverage row: ${relative}`);
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

// The CLI exits/opens stdio and is exercised by installed subprocess consumers;
// importing it into an instrumented test process would change that contract.
export const SOURCE_COVERAGE_EXCLUSIONS = Object.freeze({
  "mcp/cli.js": "Installed MCP stdio and missing-SDK consumer tests in scripts/package-consumer.js."
});
export function assertSourceCoverage(output, files = sourceFiles(sourceRoot), exclusions = SOURCE_COVERAGE_EXCLUSIONS) {
  const coverage = parseCoverageTable(output);
  const missing = files.filter(file => !coverage.has(file) && !Object.hasOwn(exclusions, file));
  if (missing.length) throw new Error(`Source files missing from coverage: ${missing.join(", ")}`);
  for (const [file, reason] of Object.entries(exclusions)) {
    if (!files.includes(file) || typeof reason !== "string" || reason.length < 20) {
      throw new Error(`Invalid source coverage exclusion: ${file}`);
    }
  }
}

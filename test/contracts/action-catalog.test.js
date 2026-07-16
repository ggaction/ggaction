import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";
import { renderActionCatalog } from "../../scripts/generate-action-catalog.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const contractRoot = path.join(root, "agent_docs/contract");
const index = JSON.parse(
  readFileSync(path.join(contractRoot, "ACTION_INDEX.json"), "utf8")
);
const catalog = readFileSync(
  path.join(contractRoot, "ACTION_CATALOG.md"),
  "utf8"
);
const roadmap2 = readFileSync(
  path.join(root, "agent_docs/impl/roadmap2/ROADMAP.md"),
  "utf8"
);

function markdownFiles(directory) {
  return readdirSync(path.join(contractRoot, directory))
    .filter(file => file.endsWith(".md"))
    .map(file => path.join(contractRoot, directory, file));
}

const currentFiles = markdownFiles("current");
const plannedFiles = markdownFiles("planned");
const currentCorpus = currentFiles
  .map(file => readFileSync(file, "utf8"))
  .join("\n");
const plannedCorpus = plannedFiles
  .map(file => readFileSync(file, "utf8"))
  .join("\n");

function declaredProgramMethods() {
  const declaration = readFileSync(
    path.join(root, "types/program.d.ts"),
    "utf8"
  );
  const classBody = declaration.slice(
    declaration.indexOf("export class ChartProgram")
  );

  return [...classBody.matchAll(/^  ([A-Za-z][A-Za-z0-9]*)\(/gm)]
    .map(match => match[1])
    .filter(name => name !== "constructor");
}

function runtimeActionMethods() {
  return Object.entries(
    Object.getOwnPropertyDescriptors(ChartProgram.prototype)
  )
    .filter(([name, descriptor]) =>
      !name.startsWith("_") && typeof descriptor.value === "function"
    )
    .map(([name]) => name)
    .filter(name => name !== "constructor");
}

function actionSections(source) {
  const headings = [...source.matchAll(/^## \`([A-Za-z][A-Za-z0-9]*)\`$/gm)];
  return headings.map((heading, indexInFile) => {
    const rest = source.slice(heading.index + heading[0].length);
    const next = rest.search(/^## /m);
    return {
      action: heading[1],
      source: source.slice(
        heading.index,
        next < 0
          ? source.length
          : heading.index + heading[0].length + next
      )
    };
  });
}

function owningSection(action) {
  const matches = currentFiles.flatMap(file => {
    const source = readFileSync(file, "utf8");
    return actionSections(source)
      .filter(section => section.action === action)
      .map(section => ({ ...section, file }));
  });
  assert.equal(matches.length, 1, `${action} must have one owning contract`);
  return matches[0];
}

function assertContractTarget(contract) {
  assert.ok(contract);
  const file = path.join(root, contract.file);
  assert.equal(existsSync(file), true, contract.file);
  const source = readFileSync(file, "utf8");
  const expectedHeading = contract.file.includes("/current/")
    ? new RegExp(`^## \\\`${contract.anchor}\\\`$`, "mi")
    : new RegExp(
      `^## (?:${contract.anchor.replaceAll("-", " ")}|[^\\n]+)$`,
      "mi"
    );
  if (contract.file.includes("/current/")) {
    assert.match(source, expectedHeading, contract.file);
  } else {
    const anchors = [...source.matchAll(/^## (.+)$/gm)]
      .map(match => match[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    assert.equal(anchors.includes(contract.anchor), true, `${contract.file}#${contract.anchor}`);
  }
}

test("keeps the generated catalog synchronized with the manifest", () => {
  assert.equal(catalog, renderActionCatalog(index));
  assert.equal(index.version, 2);
});
test("keeps every declared direct action in one current domain contract", () => {
  const declared = declaredProgramMethods();
  const indexed = index.actions.map(action => action.name);
  const documented = currentFiles.flatMap(file =>
    actionSections(readFileSync(file, "utf8")).map(section => section.action)
  );

  assert.equal(new Set(declared).size, declared.length);
  assert.equal(new Set(indexed).size, indexed.length);
  assert.equal(new Set(documented).size, documented.length);
  assert.deepEqual(new Set(indexed), new Set(declared));
  assert.deepEqual(new Set(documented), new Set(declared));

  for (const action of index.actions) {
    assert.equal(action.status, "implemented", action.name);
    assertContractTarget(action.contract);
    const section = owningSection(action.name).source;
    assert.match(section, new RegExp(`^### Formal values — \\\`${action.name}\\\`$`, "m"));
    assert.match(section, new RegExp(`^### Value coverage — \\\`${action.name}\\\`$`, "m"));
    assert.match(section, /^- Implemented: /m, action.name);
    assert.match(section, /^- Proposed \(NOT IMPLEMENTED\): /m, action.name);
    assert.match(section, /(✅ Covered|⚠️ Partial|❌ Missing)/, action.name);
    assert.match(section, /(Proposed|Planned|future|No proposal)/i, action.name);
    assert.match(section, /Evidence:/, action.name);
  }
});

test("keeps lifecycle, coverage, and edit gaps machine-readable", () => {
  const lifecycles = new Set(index.contractSchema.lifecycles);
  const coverageStates = new Set(index.contractSchema.coverageStates);

  for (const action of index.actions) {
    assert.equal(lifecycles.has(action.lifecycle), true, action.name);
    for (const state of Object.values(action.coverage)) {
      assert.equal(coverageStates.has(state), true, `${action.name}: ${state}`);
    }
    if (action.lifecycle === "Stable resource, edit gap") {
      assert.match(action.audit, /Planned|Proposed/, action.name);
    }
    if (action.lifecycle === "Assignment") {
      assert.match(action.name, /^encode/, action.name);
      assert.match(action.audit, /Implemented|Planned|Proposed/, action.name);
    }
    if (action.lifecycle === "Structural create-only") {
      assert.equal(action.audit, "Intentional", action.name);
    }
  }

  assert.equal(
    index.actions.find(action => action.name === "createScale").audit,
    "Complete"
  );
  for (const name of ["encodeOpacity", "encodeRadius", "encodeBarWidth"]) {
    assert.equal(
      index.actions.find(action => action.name === name).audit,
      "Reassignment — Implemented"
    );
  }
});

test("keeps primitives and internal wrapped actions in separate layers", () => {
  assert.deepEqual(
    index.actions
      .filter(action => action.layer === "primitive")
      .map(action => action.name),
    ["editSemantic", "createGraphics", "editGraphics"]
  );

  const declared = new Set(declaredProgramMethods());
  const runtime = runtimeActionMethods();
  const materialization = runtime
    .filter(name => /^(?:materialize|rematerialize)/.test(name))
    .sort();

  assert.deepEqual([...index.internal.materialization].sort(), materialization);
  assert.deepEqual(index.internal.guideComponents, [
    "createCategoricalLegend",
    "createGradientLegend",
    "createOpacityLegend",
    "removeCategoricalLegend",
    "removeOpacityLegend",
    "createSizeLegend"
  ]);
  assert.deepEqual(index.internal.stateTransitions, ["releaseDerivedData"]);
  assert.deepEqual(index.internal.aggregateComponents, [
    "createBoxMedian",
    "createBoxOutlierData",
    "createBoxOutliers",
    "createBoxSummaryData",
    "createErrorBarCap",
    "createErrorBandBoundary"
  ]);
  assert.equal(runtime.includes("createLegendSymbols"), true);
  assert.equal(runtime.includes("createCategoricalLegend"), true);
  assert.equal(runtime.includes("createSizeLegend"), true);
  assert.equal(
    existsSync(path.join(root, index.internal.contract)),
    true
  );
  for (const name of [
    ...index.internal.materialization,
    ...index.internal.guideComponents,
    ...index.internal.stateTransitions,
    ...index.internal.aggregateComponents,
    "createLegendSymbols"
  ]) {
    assert.equal(declared.has(name), false, name);
  }
});

test("keeps planned direct actions and reassignment gaps explicit", () => {
  const names = index.plannedActions.map(action => action.name);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(new Set(names), new Set([
    "editBarMark",
    "filterMarks",
    "highlightMarks",
    "selectMarks"
  ]));
  assert.equal(names.includes("editRuleMark"), false);

  for (const action of index.plannedActions) {
    assert.equal(
      index.contractSchema.plannedStatuses.includes(action.status),
      true,
      action.name
    );
    assert.equal(
      index.contractSchema.plannedReadiness.includes(action.readiness),
      true,
      action.name
    );
    if (action.contract) assertContractTarget(action.contract);
  }

  const expectedFromAudit = index.actions
    .map(action => action.audit.match(/\`([A-Za-z][A-Za-z0-9]*)\` — Planned/))
    .filter(Boolean)
    .map(match => match[1]);
  for (const expected of expectedFromAudit) {
    assert.equal(names.includes(expected), true, expected);
  }

  const plannedReassignments = index.actions
    .filter(action => action.audit === "Reassignment — Planned")
    .map(action => action.name);
  const indexedReassignments = index.plannedCapabilities
    .filter(capability => capability.kind === "behavior")
    .map(capability => capability.action);
  assert.deepEqual(new Set(indexedReassignments), new Set(plannedReassignments));
});

test("maps every planned contract into Roadmap 2", () => {
  for (const action of index.plannedActions) {
    assert.equal(
      roadmap2.includes(`\`${action.name}\``),
      true,
      `Roadmap 2 is missing planned action ${action.name}`
    );
  }
  for (const capability of index.plannedCapabilities) {
    assert.equal(
      roadmap2.includes(`\`${capability.id}\``),
      true,
      `Roadmap 2 is missing planned capability ${capability.id}`
    );
  }
});

test("keeps completed Phase 5 guide and layout scope out of planned inventory", () => {
  const actions = [
    "editHorizontalGrid",
    "editVerticalGrid",
    "editLegend",
    "editTitle"
  ];
  const capabilities = [
    "top-x-axis-position",
    "right-y-axis-position",
    "axis-label-format-strings",
    "left-legend-position",
    "chart-title-positions",
    "title-wrapping-and-measurement"
  ];
  const currentNames = new Set(index.actions.map(action => action.name));
  const plannedNames = new Set(index.plannedActions.map(action => action.name));
  const plannedIds = new Set(index.plannedCapabilities.map(capability => capability.id));

  for (const action of actions) {
    assert.equal(currentNames.has(action), true, action);
    assert.equal(plannedNames.has(action), false, action);
  }
  for (const capability of capabilities) {
    assert.equal(plannedIds.has(capability), false, capability);
  }
});

test("keeps completed Phase 6 rule and error-bar scope out of planned inventory", () => {
  const actions = [
    "createRuleMark",
    "encodeStroke",
    "encodeStrokeWidth",
    "createIntervalData",
    "createErrorBar",
    "encodeX2"
  ];
  const capabilities = [
    "error-bar-horizontal-and-explicit",
    "error-bar-cap-and-style-options"
  ];
  const currentNames = new Set(index.actions.map(action => action.name));
  const plannedNames = new Set(index.plannedActions.map(action => action.name));
  const plannedIds = new Set(index.plannedCapabilities.map(capability => capability.id));

  for (const action of actions) {
    assert.equal(currentNames.has(action), true, action);
    assert.equal(plannedNames.has(action), false, action);
  }
  for (const capability of capabilities) {
    assert.equal(plannedIds.has(capability), false, capability);
  }
});

test("keeps completed Phase 7 error-band scope out of planned inventory", () => {
  const actions = ["createErrorBand", "encodeXRange"];
  const capabilities = [
    "error-band-curve-and-advanced-boundaries",
    "regression-error-band-delegation",
    "composite-mark-ownership-and-storage"
  ];
  const currentNames = new Set(index.actions.map(action => action.name));
  const plannedNames = new Set(index.plannedActions.map(action => action.name));
  const plannedIds = new Set(index.plannedCapabilities.map(capability => capability.id));

  for (const action of actions) {
    assert.equal(currentNames.has(action), true, action);
    assert.equal(plannedNames.has(action), false, action);
  }
  for (const capability of capabilities) {
    assert.equal(plannedIds.has(capability), false, capability);
  }
});

test("keeps completed Phase 8 box-plot scope out of planned inventory", () => {
  const currentNames = new Set(index.actions.map(action => action.name));
  const plannedNames = new Set(index.plannedActions.map(action => action.name));
  const boxContract = owningSection("createBoxPlot").source;

  assert.equal(currentNames.has("createBoxPlot"), true);
  assert.equal(plannedNames.has("createBoxPlot"), false);
  assert.match(boxContract, /factor\?: PositiveFinite/);
  assert.match(boxContract, /type: "minmax"; factor\?: never/);
  assert.match(boxContract, /width\?: \{ band\?: UnitIntervalExclusive \}/);
  assert.match(boxContract, /outliers\?: boolean/);
  assert.match(boxContract, /box\?: \{/);
  assert.match(boxContract, /median\?: \{/);
  assert.match(boxContract, /outlier\?: \{/);
  assert.doesNotMatch(plannedCorpus, /createBoxPlot\(\{/);
});

test("keeps accepted planned capabilities linked and non-public", () => {
  const ids = index.plannedCapabilities.map(capability => capability.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const capability of index.plannedCapabilities) {
    assert.equal(
      index.contractSchema.plannedKinds.includes(capability.kind),
      true,
      capability.name
    );
    assert.equal(
      index.contractSchema.plannedStatuses.includes(capability.status),
      true,
      capability.name
    );
    assert.equal(
      index.contractSchema.plannedReadiness.includes(capability.readiness),
      true,
      capability.name
    );
    assertContractTarget(capability.contract);
  }

  assert.match(currentCorpus, /type PointShape =/);
  assert.match(currentCorpus, /type EditableCurrentScale =/);
  assert.match(plannedCorpus, /createRuleMark\(\{/);
  assert.match(plannedCorpus, /별도 `encodeRule`\/`editRuleMark`가 아니라/);
  assert.match(plannedCorpus, /encodeStroke\(\{ target\?: UserId; value: NonEmptyString \}\)/);
  assert.match(currentCorpus, /createIntervalData\(\{/);
  assert.match(currentCorpus, /createErrorBar\(\{/);
  assert.match(currentCorpus, /vertical or horizontal orientation/);
  assert.match(currentCorpus, /ExplicitIntervalChannel/);
  assert.doesNotMatch(plannedCorpus, /createErrorBar remaining variants/);
  assert.match(currentCorpus, /createErrorBand\(\{/);
  assert.doesNotMatch(plannedCorpus, /createErrorBand\(\{/);
  assert.match(currentCorpus, /createBoxPlot\(\{/);
  assert.match(currentCorpus, /factor\?: PositiveFinite/);
  assert.match(currentCorpus, /outliers\?: boolean/);
  assert.doesNotMatch(plannedCorpus, /createBoxPlot\(\{/);
  assert.match(currentCorpus, /wrapped `createErrorBand` explicit mode/);
  assert.doesNotMatch(plannedCorpus, /regression band delegation/);
  assert.match(currentCorpus, /No `semanticSpec\.composites` registry is introduced/);
  assert.match(currentCorpus, /"plus" \| "cross" \| "star" \| "hexagon" \| "wye"/);
  assert.match(plannedCorpus, /type CurveInterpolation =/);
  assert.match(plannedCorpus, /"step-before"[\s\S]*"step-after"/);
  assert.match(plannedCorpus, /"basis"[\s\S]*"cardinal"[\s\S]*"monotone"[\s\S]*"natural"/);
  assert.match(plannedCorpus, /type ConcretePathCommand =/);
  assert.match(plannedCorpus, /uniform cubic B-spline/);
  assert.match(plannedCorpus, /Renderers execute commands only/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /curve.*Proposed|Proposed.*curve/i);
  assert.match(currentCorpus, /stroke\?: NonEmptyString \| false/);
  assert.match(currentCorpus, /band\?: number; pixels\?: never/);
  assert.match(currentCorpus, /pixels: PositiveFinite/);
  assert.match(currentCorpus, /paddingInner\?: UnitIntervalLessThan1/);
  assert.match(currentCorpus, /type ScalarAggregateOperation =/);
  assert.match(currentCorpus, /type ParameterizedAggregateOperation =/);
  assert.match(currentCorpus, /op: "quantile"; probability: UnitInterval/);
  assert.match(currentCorpus, /op: "first" \| "last"/);
  assert.match(currentCorpus, /mean ± 1\.96 \* stderr/);
  assert.match(currentCorpus, /layout\?: "stack" \| "fill" \| "group" \| "overlay" \| "diverging"/);
  assert.match(currentCorpus, /`"center"`는 Proposed/);
  assert.match(currentCorpus, /`encodeGroup`과의 distinct ownership/);
  const paletteType = currentCorpus.match(
    /type PaletteName =([\s\S]*?);\n\ntype Palette =/
  )?.[1];
  assert.ok(paletteType);
  assert.deepEqual(
    [...paletteType.matchAll(/"([^"]+)"/g)].map(match => match[1]),
    [
      "accent",
      "category10", "category20", "category20b", "category20c",
      "observable10",
      "dark2", "paired", "pastel1", "pastel2",
      "set1", "set2", "set3",
      "tableau10", "tableau20",
      "blues", "tealblues", "teals", "greens", "browns",
      "oranges", "reds", "purples", "warmgreys", "greys",
      "viridis", "magma", "inferno", "plasma", "cividis", "turbo",
      "bluegreen", "bluepurple",
      "goldgreen", "goldorange", "goldred",
      "greenblue", "orangered",
      "purplebluegreen", "purpleblue", "purplered", "redpurple",
      "yellowgreenblue", "yellowgreen", "yelloworangebrown", "yelloworangered",
      "darkblue", "darkgold", "darkgreen", "darkmulti", "darkred",
      "lightgreyred", "lightgreyteal", "lightmulti", "lightorange", "lighttealblue",
      "blueorange", "brownbluegreen", "purplegreen", "pinkyellowgreen",
      "purpleorange", "redblue", "redgrey",
      "redyellowblue", "redyellowgreen", "spectral",
      "rainbow", "sinebow"
    ]
  );
  assert.match(plannedCorpus, /count\?: PositiveInteger/);
  assert.match(plannedCorpus, /extent\?: readonly \[UnitInterval, UnitInterval\]/);
  assert.match(plannedCorpus, /type ContinuousColorInterpolation =/);
  assert.match(plannedCorpus, /"cubehelix" \| "cubehelix-long"/);
  assert.match(plannedCorpus, /type ContinuousColorScale =/);
  assert.match(plannedCorpus, /type\?: "sequential"/);
  assert.match(plannedCorpus, /palette defaults to `"viridis"`/);
  assert.match(plannedCorpus, /## continuous color bar consumer/);
  assert.match(plannedCorpus, /contains only the continuous bar consumer/);
  assert.match(plannedCorpus, /## continuous color gradient legend/);
  assert.match(plannedCorpus, /length\?: PositiveFinite/);
  assert.match(plannedCorpus, /adjacent rect strips/);
  assert.match(currentCorpus, /DashStyle = "solid" \| "dashed" \| "dotted" \| "dashdot"/);
  assert.match(currentCorpus, /solid → \[\]/);
  assert.match(currentCorpus, /dashed → \[6, 4\]/);
  assert.match(currentCorpus, /dotted → \[1, 3\]/);
  assert.match(currentCorpus, /dashdot → \[6, 3, 1, 3\]/);
  assert.match(currentCorpus, /encodeOpacity\(\{ value, target\? \} \| \{ field/);
  assert.match(currentCorpus, /auto linear range는 `\[0\.2, 1\]`/);
  assert.match(currentCorpus, /"color" \| "strokeDash" \| "shape" \| "opacity"/);
  assert.match(currentCorpus, /gradient\?: \{ length\?: PositiveFinite; thickness\?: PositiveFinite \}/);
  assert.doesNotMatch(currentCorpus, /minArea|maxArea/);
  assert.doesNotMatch(currentCorpus, /unit\?: "radius" \| "area"/);
  assert.match(currentCorpus, /## Position field-type compatibility/);
  assert.match(currentCorpus, /Canonical owner: `src\/grammar\/positionCompatibility\.js`/);
  assert.match(currentCorpus, /Implemented values `"zero" \| "normalize" \| null`/);
  for (const heading of [
    "grouped-bar reassignment",
    "bar width",
    "color layout",
    "normalized stack",
    "offset padding"
  ]) {
    assert.doesNotMatch(
      plannedCorpus,
      new RegExp(`## Implemented ${heading} compatibility note`)
    );
  }
  assert.match(currentCorpus, /paddingOuter\?: NonNegativeFinite/);
  assert.match(currentCorpus, /## `encodeX2`/);
  assert.match(currentCorpus, /## `encodeXRange`/);
  assert.match(currentCorpus, /binBoundaries\?: readonly \[Finite, Finite, \.\.\.Finite\[\]\]/);
  assert.match(currentCorpus, /zero-anchored exact steps/);
  assert.match(plannedCorpus, /type PlannedScaleType =/);
  assert.match(plannedCorpus, /"log"[\s\S]*"pow"[\s\S]*"sqrt"[\s\S]*"symlog"/);
  assert.match(plannedCorpus, /"utc"[\s\S]*"band"[\s\S]*"point"/);
  assert.match(plannedCorpus, /"point"[\s\S]*"sequential"[\s\S]*"quantize"/);
  assert.match(plannedCorpus, /"quantize"[\s\S]*"quantile"[\s\S]*"threshold"/);
  assert.match(plannedCorpus, /type PlannedScalePolicies =/);
  assert.match(plannedCorpus, /clamp\?: boolean/);
  assert.match(plannedCorpus, /reverse\?: boolean/);
  assert.match(plannedCorpus, /unknown\?: unknown/);
  assert.match(currentCorpus, /kernel\?: "gaussian" \| "epanechnikov" \| "uniform" \| "triangular"/);
  assert.match(currentCorpus, /normalization\?: "unit" \| "count"/);
  assert.match(currentCorpus, /unit은 group density integral을 1로 맞추고 count는/);
  assert.match(currentCorpus, /FilterComparison =/);
  assert.match(currentCorpus, /oneOf.*predicate.*range.*정확히 하나/);
  assert.doesNotMatch(plannedCorpus, /filter predicate modes/);
  assert.match(plannedCorpus, /type MarkSelector =/);
  assert.match(plannedCorpus, /"eq" \| "neq" \| "gt" \| "gte" \| "lt" \| "lte"/);
  assert.match(plannedCorpus, /op: "min" \| "max"/);
  assert.match(plannedCorpus, /ties\?: "first" \| "all"/);
  assert.match(plannedCorpus, /filterMarks\(options:/);
  assert.match(plannedCorpus, /selectMarks\(options:/);
  assert.match(plannedCorpus, /highlightMarks\(\{/);
  assert.match(plannedCorpus, /editBarMark\(\{/);
  assert.doesNotMatch(plannedCorpus, /^## `selectRows`$/m);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /argmin.*Proposed|argmax.*Proposed/);
  assert.match(currentCorpus, /method\?: "linear"[\s\S]*method: "polynomial"[\s\S]*method: "loess"/);
  assert.match(currentCorpus, /interval\?: "mean" \| "prediction"/);
  assert.doesNotMatch(plannedCorpus, /regression method vocabulary|regression prediction interval/);
  assert.doesNotMatch(plannedCorpus, /ordered multi-transform pipeline/);
  assert.match(currentCorpus, /type AxisPositionX = "bottom" \| "top"/);
  assert.match(currentCorpus, /type AxisPositionY = "left" \| "right"/);
  assert.match(currentCorpus, /x bottom\/top default `0`/);
  assert.match(currentCorpus, /y right default\s+`Math\.PI \/ 2`/);
  assert.match(currentCorpus, /type AxisFormatString =/);
  assert.match(currentCorpus, /"\.0f" \| "\.1f" \| "\.2f"/);
  assert.doesNotMatch(plannedCorpus, /## mirrored Cartesian axis positions/);
  assert.doesNotMatch(plannedCorpus, /## axis label format strings/);
  assert.match(currentCorpus, /combined point-size legend는 right\/left side position을 사용/);
  assert.match(currentCorpus, /point-composite symbols in top\/bottom item grids/);
  assert.match(currentCorpus, /Composite layers share one item-local origin/);
  assert.match(currentCorpus, /type LegendPosition = "right" \| "bottom" \| "top" \| "left"/);
  assert.match(currentCorpus, /type TitlePosition = "top" \| "bottom" \| "left" \| "right"/);
  assert.match(currentCorpus, /maxWidth\?: PositiveFinite/);
  assert.match(currentCorpus, /wrap\?: TitleWrap/);
  assert.match(currentCorpus, /## `editTitle`/);
  assert.doesNotMatch(plannedCorpus, /## chart title positions|## title wrapping and measurement|## editTitle/);
  assert.match(plannedCorpus, /## graphic parent attachment/);
  assert.match(plannedCorpus, /parent\?: UserId/);
  assert.match(plannedCorpus, /같은 parent의 direct sibling/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /placement\?: "center" \| "boundary"/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /interactive\??:/i);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /coordinate-level `clip`\/transform options/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /custom (palette|scheme)|scheme registration/i);
});

test("keeps implemented and planned formal values distinct", () => {
  const data = owningSection("createData").source;
  assert.match(data, /id\?: UserId/);
  assert.match(data, /첫 unnamed source는\s+`"data"`/);

  const encodeY = owningSection("encodeY").source;
  assert.match(encodeY, /aggregate\?: AggregateOperation/);
  assert.match(encodeY, /op: "quantile"; probability: UnitInterval/);
  assert.match(encodeY, /op: "first" \| "last";[\s\S]*orderBy: FieldName/);

  const point = owningSection("createPointMark").source;
  assert.match(point, /id\?: UserId/);
  assert.match(point, /omission→`"point"`/);
  assert.match(point, /shape\?: PointShape/);
  assert.doesNotMatch(point, /shape\?: "circle" \| "square"/);
});

test("keeps maybe-future ideas outside the active proposal queue", () => {
  const entries = [...currentCorpus.matchAll(
    /^- Maybe Future \(NOT IMPLEMENTED\): (.+)$/gm
  )].map(match => match[1]);

  assert.equal(entries.length, 3);
  assert.equal(entries.some(entry => entry.includes("wildcard path")), true);
  assert.equal(entries.some(entry => entry.includes("svg | g")), true);
  assert.equal(entries.some(entry => entry.includes("multi-property dictionary")), true);
  assert.doesNotMatch(
    currentCorpus,
    /🟣 Proposed: no wildcard|🟣 Proposed: no renderer-specific|🟣 Proposed: no multi-property/
  );
});

test("keeps all executable coverage evidence paths valid", () => {
  const evidence = [...currentCorpus.matchAll(
    /`(test\/[A-Za-z0-9_./-]+\.test\.js)`/g
  )].map(match => match[1]);

  assert.equal(evidence.length > 0, true);
  for (const relative of new Set(evidence)) {
    assert.equal(
      existsSync(path.join(root, relative)),
      true,
      `Missing contract coverage evidence: ${relative}`
    );
  }
});

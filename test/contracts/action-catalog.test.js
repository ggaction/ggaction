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
    "createLegendSymbols"
  ]) {
    assert.equal(declared.has(name), false, name);
  }
});

test("keeps planned direct actions and reassignment gaps explicit", () => {
  const names = index.plannedActions.map(action => action.name);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(new Set(names), new Set([
    "createBoxPlot",
    "createErrorBand",
    "createErrorBar",
    "createIntervalData",
    "createRuleMark",
    "editAreaMark",
    "editDensity",
    "editHorizontalGrid",
    "editLegend",
    "editRegressionBand",
    "editRegressionLine",
    "editTitle",
    "editVerticalGrid",
    "encodeStroke",
    "encodeStrokeWidth",
    "encodeX2",
    "encodeXRange",
    "selectRows"
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
  assert.match(plannedCorpus, /createIntervalData\(\{/);
  assert.match(plannedCorpus, /createErrorBar\(\{/);
  assert.match(plannedCorpus, /createErrorBand\(\{/);
  assert.match(plannedCorpus, /createBoxPlot\(\{/);
  assert.match(plannedCorpus, /createRegressionBand[\s\S]*createErrorBand \(explicit interval mode\)/);
  assert.match(plannedCorpus, /No `semanticSpec\.composites` registry is introduced/);
  assert.match(currentCorpus, /"plus" \| "cross" \| "star" \| "hexagon" \| "wye"/);
  assert.match(plannedCorpus, /type CurveInterpolation =/);
  assert.match(plannedCorpus, /"step-before"[\s\S]*"step-after"/);
  assert.match(plannedCorpus, /"basis"[\s\S]*"cardinal"[\s\S]*"monotone"[\s\S]*"natural"/);
  assert.match(plannedCorpus, /type ConcretePathCommand =/);
  assert.match(plannedCorpus, /uniform cubic B-spline/);
  assert.match(plannedCorpus, /Renderers execute commands only/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /curve.*Proposed|Proposed.*curve/i);
  assert.match(plannedCorpus, /stroke\?: NonEmptyString \| false/);
  assert.match(currentCorpus, /band\?: number; pixels\?: never/);
  assert.match(currentCorpus, /pixels: PositiveFinite/);
  assert.match(currentCorpus, /paddingInner\?: UnitIntervalLessThan1/);
  assert.match(currentCorpus, /type ScalarAggregateOperation =/);
  assert.match(currentCorpus, /type ParameterizedAggregateOperation =/);
  assert.match(currentCorpus, /op: "quantile"; probability: UnitInterval/);
  assert.match(currentCorpus, /op: "first" \| "last"/);
  assert.match(currentCorpus, /mean ± 1\.96 \* stderr/);
  assert.match(plannedCorpus, /type ColorLayout =/);
  assert.match(plannedCorpus, /"stack" \| "fill" \| "group" \| "overlay" \| "diverging"/);
  assert.match(plannedCorpus, /`"center"` streamgraph layout은 Proposed/);
  assert.match(plannedCorpus, /별도 action `encodeGroup`과 다른 개념/);
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
  assert.match(plannedCorpus, /type PlannedPositionFieldType =/);
  assert.match(plannedCorpus, /type PlannedStackMode = "normalize"/);
  assert.match(currentCorpus, /paddingOuter\?: NonNegativeFinite/);
  assert.match(plannedCorpus, /encodeX2\(\{/);
  assert.match(plannedCorpus, /encodeXRange\(\{/);
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
  assert.match(plannedCorpus, /type DensityKernel =/);
  assert.match(plannedCorpus, /sum\(K\(u\)\) \/ \(n \* bandwidth\)/);
  assert.match(plannedCorpus, /type DensityNormalization = "unit" \| "count"/);
  assert.match(plannedCorpus, /`"count"` estimate는 `sum\(K\(u\)\) \/ bandwidth`/);
  assert.match(plannedCorpus, /type FilterComparison =/);
  assert.match(plannedCorpus, /oneOf.*predicate.*range.*정확히 하나/);
  assert.match(plannedCorpus, /type RowSelectionMode = "min" \| "max"/);
  assert.match(plannedCorpus, /selectRows\(\{/);
  assert.match(plannedCorpus, /Extreme value tie는 source order에서 먼저 등장한 row/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /argmin.*Proposed|argmax.*Proposed/);
  assert.match(plannedCorpus, /type RegressionMethod = "linear" \| "polynomial" \| "loess"/);
  assert.match(plannedCorpus, /tricube-weighted local-linear fit/);
  assert.match(plannedCorpus, /residualVariance \* \(1 \+ leverage\)/);
  assert.doesNotMatch(plannedCorpus, /ordered multi-transform pipeline/);
  assert.match(plannedCorpus, /top x title 기본 rotation은 `0`/);
  assert.match(plannedCorpus, /right y title 기본 rotation은/);
  assert.match(plannedCorpus, /type AxisFormatString =/);
  assert.match(plannedCorpus, /"\.0f" \| "\.1f" \| "\.2f"/);
  assert.match(plannedCorpus, /point composite와 quantitative size block을 지원/);
  assert.match(currentCorpus, /point-composite symbols in top\/bottom item grids/);
  assert.match(currentCorpus, /Composite layers share one item-local origin/);
  assert.match(plannedCorpus, /"top" \| "bottom" \| "left" \| "right"/);
  assert.match(plannedCorpus, /type PlannedTitleWrapping =/);
  assert.match(plannedCorpus, /maxWidth\?: PositiveFinite/);
  assert.match(plannedCorpus, /wrap\?: "word" \| "character"/);
  assert.match(plannedCorpus, /## graphic parent attachment/);
  assert.match(plannedCorpus, /parent\?: UserId/);
  assert.match(plannedCorpus, /같은 parent의 direct sibling/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /placement\?: "center" \| "boundary"/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /interactive\??:/i);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /coordinate-level `clip`\/transform options/);
  assert.doesNotMatch(currentCorpus + plannedCorpus, /custom (palette|scheme)|scheme registration/i);
});

test("keeps implemented and planned formal values distinct", () => {
  const encodeY = owningSection("encodeY").source;
  assert.match(encodeY, /aggregate\?: AggregateOperation/);
  assert.match(encodeY, /op: "quantile"; probability: UnitInterval/);
  assert.match(encodeY, /op: "first" \| "last";[\s\S]*orderBy: FieldName/);

  const point = owningSection("createPointMark").source;
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

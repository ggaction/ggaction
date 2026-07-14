import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/core/ChartProgram.js";
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
  assert.equal(index.version, 1);
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
  const lifecycles = new Set([
    "Immutable create-only",
    "Mutable resource",
    "Assignment",
    "Aggregate create-only",
    "Stable create-only",
    "Structural create-only",
    "Stable resource, edit gap",
    "Primitive"
  ]);
  const coverageStates = new Set([
    "complete",
    "partial",
    "missing",
    "not-applicable"
  ]);

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
    "`editScale` — Planned"
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
    "editAreaMark",
    "editDensity",
    "editHorizontalGrid",
    "editLegend",
    "editLineMark",
    "editPointMark",
    "editRegressionBand",
    "editRegressionLine",
    "editScale",
    "editTitle",
    "editVerticalGrid",
    "encodeX2",
    "encodeXRange"
  ]));

  for (const action of index.plannedActions) {
    assert.equal(action.status, "planned");
    assert.equal(
      ["accepted", "pending-parameter-review"].includes(action.readiness),
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

test("keeps accepted planned capabilities linked and non-public", () => {
  const parameterNames = index.plannedCapabilities
    .filter(capability => capability.kind === "parameter")
    .map(capability => capability.name);

  assert.deepEqual(parameterNames, [
    "Point shape vocabulary",
    "Area outline",
    "Bar width modes",
    "Offset padding controls",
    "Aggregate vocabulary",
    "Parameterized aggregate operations",
    "Color layout vocabulary",
    "Histogram bin controls",
    "Scale type vocabulary",
    "Scale mapping policies",
    "Position field-type compatibility",
    "Normalized stack mode",
    "Density kernel vocabulary",
    "Filter predicate modes",
    "Regression method vocabulary",
    "Regression prediction interval",
    "Top x axis position",
    "Right y axis position",
    "Axis label format strings",
    "Left legend position",
    "Chart title positions"
  ]);

  for (const capability of index.plannedCapabilities) {
    assert.equal(capability.status, "planned", capability.name);
    assert.equal(capability.readiness, "accepted", capability.name);
    assertContractTarget(capability.contract);
  }

  assert.match(plannedCorpus, /type PointShape =/);
  assert.match(plannedCorpus, /"plus" \| "cross" \| "star" \| "hexagon" \| "wye"/);
  assert.match(plannedCorpus, /stroke\?: NonEmptyString \| false/);
  assert.match(plannedCorpus, /band\?: UnitIntervalExclusiveZero/);
  assert.match(plannedCorpus, /pixels\?: PositiveFinite/);
  assert.match(plannedCorpus, /paddingInner\?: UnitIntervalLessThan1/);
  assert.match(plannedCorpus, /type AggregateOperation =/);
  assert.match(plannedCorpus, /type ParameterizedAggregate =/);
  assert.match(plannedCorpus, /op: "quantile"; probability: UnitInterval/);
  assert.match(plannedCorpus, /op: "first" \| "last"/);
  assert.match(plannedCorpus, /two-sided 95% normal interval endpoint/);
  assert.match(plannedCorpus, /type ColorLayout =/);
  assert.match(plannedCorpus, /"stack" \| "fill" \| "group" \| "overlay" \| "diverging"/);
  assert.match(plannedCorpus, /`"center"` streamgraph layout은 Proposed/);
  assert.match(plannedCorpus, /별도 action `encodeGroup`과 다른 개념/);
  assert.match(plannedCorpus, /type PlannedPositionFieldType =/);
  assert.match(plannedCorpus, /type PlannedStackMode = "normalize"/);
  assert.match(plannedCorpus, /paddingOuter\?: NonNegativeFinite/);
  assert.match(plannedCorpus, /encodeX2\(\{/);
  assert.match(plannedCorpus, /encodeXRange\(\{/);
  assert.match(plannedCorpus, /binBoundaries\?: readonly \[Finite, Finite, \.\.\.Finite\[\]\]/);
  assert.match(plannedCorpus, /zero를 anchor로/);
  assert.match(plannedCorpus, /type PlannedScaleType =/);
  assert.match(plannedCorpus, /"log"[\s\S]*"pow"[\s\S]*"sqrt"[\s\S]*"symlog"/);
  assert.match(plannedCorpus, /"utc"[\s\S]*"band"[\s\S]*"point"/);
  assert.match(plannedCorpus, /"quantize"[\s\S]*"quantile"[\s\S]*"threshold"/);
  assert.match(plannedCorpus, /type PlannedScalePolicies =/);
  assert.match(plannedCorpus, /clamp\?: boolean/);
  assert.match(plannedCorpus, /reverse\?: boolean/);
  assert.match(plannedCorpus, /unknown\?: unknown/);
  assert.match(plannedCorpus, /type DensityKernel =/);
  assert.match(plannedCorpus, /sum\(K\(u\)\) \/ \(n \* bandwidth\)/);
  assert.match(plannedCorpus, /type FilterComparison =/);
  assert.match(plannedCorpus, /oneOf.*predicate.*range.*정확히 하나/);
  assert.match(plannedCorpus, /type RegressionMethod = "linear" \| "polynomial" \| "loess"/);
  assert.match(plannedCorpus, /tricube-weighted local-linear fit/);
  assert.match(plannedCorpus, /residualVariance \* \(1 \+ leverage\)/);
  assert.doesNotMatch(plannedCorpus, /ordered multi-transform pipeline/);
  assert.match(plannedCorpus, /top x title 기본 rotation은 `0`/);
  assert.match(plannedCorpus, /right y title 기본 rotation은/);
  assert.match(plannedCorpus, /type AxisFormatString =/);
  assert.match(plannedCorpus, /"\.0f" \| "\.1f" \| "\.2f"/);
  assert.match(plannedCorpus, /point composite와 quantitative size block을 지원/);
  assert.match(plannedCorpus, /"top" \| "bottom" \| "left" \| "right"/);
});

test("keeps implemented and planned formal values distinct", () => {
  const encodeY = owningSection("encodeY").source;
  assert.match(encodeY, /aggregate\?: "mean" \| "count"/);
  assert.match(
    encodeY,
    /aggregate\?: "sum" \| "median" \| "min" \| "max" \| "distinct" \| "valid" \| "missing" \| "variance" \| "varianceP" \| "stdev" \| "stdevP" \| "stderr" \| "q1" \| "q3" \| "ciLower" \| "ciUpper"/
  );
  assert.match(encodeY, /op: "quantile"; probability: UnitInterval/);
  assert.match(encodeY, /op: "first" \| "last"; orderBy: FieldName/);

  const point = owningSection("createPointMark").source;
  assert.match(point, /shape\?: "circle" \| "square"/);
  assert.match(point, /shape\?: PointShape/);
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

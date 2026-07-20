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

function markdownFiles(directory) {
  return readdirSync(path.join(contractRoot, directory))
    .filter(file => file.endsWith(".md"))
    .map(file => path.join(contractRoot, directory, file));
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:js|md|d\.ts)$/.test(entry.name) ? [absolute] : [];
  });
}

const currentFiles = markdownFiles("current");
const plannedFiles = markdownFiles("planned");
const currentCorpus = currentFiles
  .map(file => readFileSync(file, "utf8"))
  .join("\n");
const plannedCorpus = plannedFiles
  .map(file => readFileSync(file, "utf8"))
  .join("\n");
const maybeFutureActions = new Set(
  [...plannedCorpus.matchAll(/^(encode(?:Theta|R)2)\(/gm)].map(match => match[1])
);

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

test("removes the singular filterMark API from every current public surface", () => {
  assert.equal(ChartProgram.prototype.filterMark, undefined);
  const corpus = ["src", "types", "docs", "examples"]
    .flatMap(directory => sourceFiles(path.join(root, directory)))
    .map(file => readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(corpus, /\bfilterMark\b/);
  assert.equal(index.actions.some(action => action.name === "filterMark"), false);
  assert.equal(index.plannedActions.some(action => action.name === "filterMarks"), false);
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
      assert.match(action.name, /^(?:encode|jitterPoints$|removeJitter$)/, action.name);
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
    "createThetaAxisLine",
    "createRadialAxisLine",
    "createThetaAxisTicks",
    "createRadialAxisTicks",
    "createThetaAxisLabels",
    "createRadialAxisLabels",
    "createThetaAxisTitle",
    "createRadialAxisTitle",
    "createCategoricalLegend",
    "createGradientLegend",
    "createIntervalLegend",
    "createOpacityLegend",
    "removeCategoricalLegend",
    "removeOpacityLegend",
    "createSizeLegend",
    "createStrokeWidthLegend"
  ]);
  assert.deepEqual(index.internal.stateTransitions, [
    "composeFacetGuides",
    "rebindLayerData",
    "rebindGradientPlotProfile",
    "releaseDerivedData",
    "replayDerivedData",
    "setQuantitativeColorScale",
    "useProgram"
  ]);
  assert.deepEqual(index.internal.aggregateComponents, [
    "createBoxMedian",
    "createBoxOutlierData",
    "createBoxOutliers",
    "createBoxSummaryData",
    "createGradientProfileData",
    "createGradientPlotCenter",
    "createGradientPlotLegend",
    "createErrorBarCap",
    "createErrorBandBoundary",
    "applyBarHighlight",
    "applyRectHighlight",
    "applyPathHighlight",
    "applyPointHighlight",
    "applyRuleHighlight",
    "dimUnselectedMarkItems",
    "placeSelectedMarkItemsLast"
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
  const current = new Set(index.actions.map(action => action.name));
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.every(name => !current.has(name)), true);
  assert.equal(names.every(name => !maybeFutureActions.has(name)), true);
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
    .filter(capability =>
      capability.kind === "behavior" && capability.action !== undefined
    )
    .map(capability => capability.action);
  assert.deepEqual(new Set(indexedReassignments), new Set(plannedReassignments));
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

  assert.equal(entries.length, 4);
  assert.equal(entries.some(entry => entry.includes("wildcard path")), true);
  assert.equal(entries.some(entry => entry.includes("svg | g")), true);
  assert.equal(entries.some(entry => entry.includes("multi-property dictionary")), true);
  assert.equal(entries.some(entry => entry.includes("identity")), true);
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

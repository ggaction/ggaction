import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chart as basicChart } from "../../src/basic.js";
import { chart as fullChart } from "../../src/index.js";

const cardFile = new URL("../../knowledge/action-cards.json", import.meta.url);
const basicDeclarationFile = new URL("../../types/basic.d.ts", import.meta.url);

const completeChartActions = [
  "createAreaPlot",
  "createBarPlot",
  "createBeeswarmPlot",
  "createBoxPlot",
  "createDensityPlot",
  "createDotPlot",
  "createDumbbellPlot",
  "createECDFPlot",
  "createGradientPlot",
  "createHeatmap",
  "createHistogram",
  "createHorizonPlot",
  "createIntervalPlot",
  "createLinePlot",
  "createLollipopPlot",
  "createParallelCoordinates",
  "createPiePlot",
  "createPolarLinePlot",
  "createPolarScatterPlot",
  "createRadarPlot",
  "createRadialBarPlot",
  "createRaincloudPlot",
  "createRegressionPlot",
  "createRosePlot",
  "createRugPlot",
  "createScatterPlot",
  "createStripPlot",
  "createViolinPlot",
  "facet",
  "facetGrid",
  "repeatCharts"
];

const compositionActions = new Set(["facet", "facetGrid", "repeatCharts"]);
const compositionEditors = [
  "editFacetSource",
  "editFacetHeaders",
  "editFacetScales",
  "editFacetGuides",
  "editCompositionLayout"
];

async function cards() {
  return JSON.parse(await readFile(cardFile, "utf8")).cards;
}

function reachableActions(card, byName) {
  const reachable = new Set();
  const pending = [...card.wraps];
  while (pending.length > 0) {
    const name = pending.pop();
    if (reachable.has(name)) continue;
    reachable.add(name);
    pending.push(...byName.get(name).wraps);
  }
  return reachable;
}

test("complete-chart discovery reaches semantic and primitive authoring layers", async () => {
  const actionCards = await cards();
  const byName = new Map(actionCards.map(card => [card.name, card]));
  assert.deepEqual(
    actionCards
      .filter(card => card.authoringRoles.includes("H0"))
      .map(card => card.name)
      .sort(),
    [...completeChartActions].sort()
  );

  for (const name of completeChartActions) {
    const card = byName.get(name);
    if (compositionActions.has(name)) {
      assert.deepEqual(card.wraps, [], name);
      assert.deepEqual(card.editableVia, compositionEditors, name);
      assert.deepEqual(card.completionRequirements.requires, [
        "complete child chart program"
      ], name);
      continue;
    }
    const descendants = [...reachableActions(card, byName)].map(child => byName.get(child));
    assert.ok(descendants.some(child => child.authoringRoles.includes("H2")), `${name} -> H2`);
    assert.ok(descendants.some(child => child.authoringRoles.includes("H4")), `${name} -> H4`);
  }
});

test("discovery separates completion from resource validity", async () => {
  const actionCards = await cards();
  const byName = new Map(actionCards.map(card => [card.name, card]));
  const byState = {};
  for (const card of actionCards) {
    const state = card.completionRequirements.state;
    (byState[state] ??= []).push(card);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(byState).map(([state, entries]) => [
    state,
    entries.length
  ])), {
    contextual: 200,
    deferred: 2,
    complete: 29,
    "not-applicable": 3
  });
  assert.deepEqual(byState.deferred.map(card => card.name), [
    "createBoxPlot",
    "createGradientPlot"
  ]);
  assert.deepEqual(byState["not-applicable"].map(card => card.name), [
    "editSemantic",
    "createGraphics",
    "editGraphics"
  ]);
  for (const card of actionCards) {
    assert.deepEqual(
      card.completionRequirements.requires,
      card.completionRequirements.state === "not-applicable"
        ? []
        : card.resources.prerequisites,
      card.name
    );
    const optionNames = new Set(card.options.map(option => option.name));
    assert.ok(card.units.every(entry => optionNames.has(entry.path)), card.name);
    assert.ok(card.inference.every(entry =>
      entry.input === "omitted optional options" || optionNames.has(entry.input)
    ), card.name);
  }
  assert.equal(byName.get("createViolinPlot").completionRequirements.state, "complete");
});

test("entry-point discovery matches declarations and runtime methods", async () => {
  const [actionCards, basicDeclaration] = await Promise.all([
    cards(),
    readFile(basicDeclarationFile, "utf8")
  ]);
  const declarationBody = basicDeclaration.match(
    /type BasicMethodKey =([\s\S]*?);\n\n/
  )?.[1];
  assert.ok(declarationBody, "BasicMethodKey declaration");
  const declaredBasic = [
    ...declarationBody.matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g)
  ].map(match => match[1]);
  declaredBasic.push("layoutSeries");

  const supportedBasic = actionCards
    .filter(card => card.supports.entryPoints.includes("basic"))
    .map(card => card.name);
  assert.deepEqual([...supportedBasic].sort(), [...declaredBasic].sort());

  const full = fullChart();
  const basic = basicChart();
  for (const card of actionCards) {
    assert.equal(typeof full[card.name], "function", `default:${card.name}`);
    if (card.supports.entryPoints.includes("basic")) {
      assert.equal(typeof basic[card.name], "function", `basic:${card.name}`);
    }
  }
});

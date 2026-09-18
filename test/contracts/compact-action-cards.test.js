import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  buildActionCards,
  validateActionCards,
  validateCallPatternOptions
} from "../../scripts/action-card-source.js";
import { chart } from "../../src/index.js";
import { buildActionRelationships } from "../../scripts/action-relationship-source.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cardFile = path.join(root, "knowledge/action-cards.json");
const schemaFile = path.join(root, "knowledge/action-card.schema.json");
const collectionSchemaFile = path.join(root, "knowledge/action-cards.schema.json");
const intentFile = path.join(root, "knowledge/action-intents.json");
const relationshipFile = path.join(root, "knowledge/action-relationships.json");
const declarationFile = path.join(root, "types/program.d.ts");
const tscFile = path.join(root, "node_modules/.bin/tsc");

test("deferred chart owner cards distinguish creation from completed geometry", async () => {
  const { cards } = JSON.parse(await readFile(cardFile, "utf8"));
  for (const name of ["createBoxPlot", "createGradientPlot"]) {
    const card = cards.find(candidate => candidate.name === name);
    assert.match(card.summary, /owner.*defers geometry and guides/);
    assert.ok(card.resources.prerequisites.includes("compatible x/y roles before materialization"));
    assert.equal(card.callPatterns.length, 2);
    assert.equal(card.completionRequirements.state, "deferred");
    assert.deepEqual(card.authoringRoles, ["H0", "H1"]);
  }
});

test("compact action cards are generated from the current action contract", async () => {
  const [{ artifact, context, stats }, currentSource] = await Promise.all([
    buildActionCards(),
    readFile(cardFile, "utf8")
  ]);
  assert.equal(currentSource, `${JSON.stringify(artifact, null, 2)}\n`);
  assert.equal(artifact.count, context.actions.length);
  assert.equal(artifact.schemaVersion, 3);
  assert.equal(artifact.packageVersion, JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8")
  ).version);
  assert.equal(artifact.typeSource, "types/program.d.ts");
  assert.match(artifact.errorPolicy, /curated error override/);
  assert.equal(stats.count, context.actions.length);
  assert.equal(stats.maxBytes <= 3360, true);
  assert.equal(stats.medianBytes <= 1856, true);
  assert.deepEqual(
    artifact.cards.map(card => card.name),
    context.actions.map(action => action.name)
  );
  assert.deepEqual(
    validateActionCards({
      cards: artifact.cards,
      actions: context.actions,
      declarations: context.declarations,
      routes: context.routes
    }),
    stats
  );
});

test("compact action cards satisfy the bounded typed public schema projection", async () => {
  const [artifact, schema, collectionSchema, intents] = await Promise.all([
    readFile(cardFile, "utf8").then(JSON.parse),
    readFile(schemaFile, "utf8").then(JSON.parse),
    readFile(collectionSchemaFile, "utf8").then(JSON.parse),
    readFile(intentFile, "utf8").then(JSON.parse)
  ]);
  assert.equal(collectionSchema.properties.schemaVersion.const, 3);
  assert.equal(collectionSchema.properties.cards.items.$ref, "action-card.schema.json");
  assert.equal(schema.properties.schemaVersion.const, 3);
  assert.deepEqual(schema.properties.options.items.required, ["name", "required", "type"]);
  const ajv = new Ajv2020({ strict: true });
  ajv.addSchema(schema);
  const validateCollection = ajv.compile(collectionSchema);
  assert.equal(
    validateCollection(artifact),
    true,
    JSON.stringify(validateCollection.errors)
  );
  const expectedKeys = [...schema.required].sort();
  for (const card of artifact.cards) {
    assert.deepEqual(Object.keys(card).sort(), expectedKeys, card.name);
    assert.equal(card.schemaVersion, 3, card.name);
    assert.equal(card.summary.length >= 20 && card.summary.length <= 420, true, card.name);
    assert.equal(card.intents.length >= 3 && card.intents.length <= 7, true, card.name);
    assert.equal(new Set(card.intents).size, card.intents.length, card.name);
    assert.equal(card.callPatterns.length >= 1 && card.callPatterns.length <= 2, true, card.name);
    assert.equal(card.errors.length <= 2, true, card.name);
    assert.equal(card.options.every(option =>
      typeof option.type === "string" && option.type.length > 0
    ), true, card.name);
    assert.match(card.route, /^\/reference\//, card.name);
    assert.equal(card.authoringRoles.length >= 1, true, card.name);
    assert.equal(new Set(card.authoringRoles).size, card.authoringRoles.length, card.name);
    assert.equal(card.supports.entryPoints.includes("default"), true, card.name);
    assert.equal(card.wraps.every(name => artifact.cards.some(candidate => candidate.name === name)), true, card.name);
    assert.equal(card.editableVia.every(name => artifact.cards.some(candidate => candidate.name === name)), true, card.name);
    assert.doesNotMatch(JSON.stringify(card), /relatedActions|typeDefinitions|documentationBody/);
  }
  assert.equal(intents.schemaVersion, 1);
  assert.equal(Object.keys(intents.summaryOverrides).length < 20, true);
  assert.equal(Object.keys(intents.errorOverrides).length < 10, true);
});

test("action-card hierarchy is generated from the executable direct-child trace", async () => {
  const [artifact, currentRelationships, generatedRelationships] = await Promise.all([
    readFile(cardFile, "utf8").then(JSON.parse),
    readFile(relationshipFile, "utf8").then(JSON.parse),
    buildActionRelationships()
  ]);
  assert.deepEqual(currentRelationships, generatedRelationships);
  assert.equal(currentRelationships.actionCount, artifact.count);
  assert.deepEqual(
    artifact.cards.map(card => ({ name: card.name, wraps: card.wraps })),
    currentRelationships.relationships
  );
  assert.deepEqual(
    artifact.cards.filter(card => card.authoringRoles.includes("H4")).map(card => card.name),
    ["editSemantic", "createGraphics", "editGraphics"]
  );
  assert.deepEqual(
    artifact.cards.find(card => card.name === "createScatterPlot").wraps,
    ["createPointMark", "encodeX", "encodeY", "encodeColor", "encodeShape", "createGuides", "encodeStroke", "editPointMark", "encodeSize", "encodePointRadius"]
  );
  assert.deepEqual(
    artifact.cards.find(card => card.name === "selectMarks").editableVia,
    ["editMarkSelection", "removeMarkSelection"]
  );
});

test("scale spacing units agree across every generic and focused editor", async () => {
  const artifact = JSON.parse(await readFile(new URL("../../knowledge/action-cards.json", import.meta.url), "utf8"));
  const editors = artifact.cards.filter(card => /^(create|edit).*Scale$/.test(card.name));
  assert.ok(editors.some(card => card.name === "editParallelScale"));
  for (const card of editors) {
    for (const option of ["padding", "paddingInner", "paddingOuter"]) {
      if (!card.options.some(entry => entry.name === option)) continue;
      assert.deepEqual(card.units.filter(entry => entry.path === option), [{ path: option, unit: "band-fraction" }], `${card.name}.${option}`);
    }
  }
});

test("action cards separate entry support, units, inference, and completion", async () => {
  const artifact = JSON.parse(await readFile(cardFile, "utf8"));
  const byName = new Map(artifact.cards.map(card => [card.name, card]));
  assert.deepEqual(byName.get("createScatterPlot").supports.entryPoints, ["default", "basic"]);
  assert.deepEqual(byName.get("createPiePlot").supports.entryPoints, ["default"]);
  assert.deepEqual(byName.get("createArcMark").units.filter(entry =>
    ["innerRadius", "padAngle"].includes(entry.path)
  ), [
    { path: "innerRadius", unit: "ratio" },
    { path: "padAngle", unit: "degree" }
  ]);
  assert.ok(byName.get("createArcMark").units.some(entry =>
    entry.path === "innerRadius.value" && entry.unit === "logical-pixel"));
  assert.ok(byName.get("createPiePlot").units.some(entry =>
    entry.path === "arc.innerRadius.value" && entry.unit === "logical-pixel"));
  assert.deepEqual(byName.get("createTimeUnitData").units, [
    { path: "unit", unit: "calendar-unit" },
    { path: "temporalUnit", unit: "temporal-input" }
  ]);
  assert.ok(byName.get("createScatterPlot").inference.some(entry =>
    entry.input === "data" && entry.strategy === "explicit-current-unique-or-error"
  ));
  assert.deepEqual(byName.get("removeMarkLabels").inference, [
    { input: "target", strategy: "explicit" },
    { input: "source", strategy: "explicit" }
  ]);
  assert.deepEqual(byName.get("removeMarkLabels").resources.prerequisites, [
    "existing source mark or attached label"
  ]);
  assert.deepEqual(byName.get("editMarkLabelSelection").inference, [
    { input: "target", strategy: "explicit" },
    { input: "selection", strategy: "explicit" }
  ]);
  assert.deepEqual(byName.get("editMarkLabelSelection").resources.prerequisites, [
    "attached label"
  ]);
  assert.deepEqual(byName.get("editMarkLabelSelection").editableVia, [
    "editMarkLabelSelection",
    "editMarkLabelPlacement",
    "removeMarkLabels"
  ]);
  assert.deepEqual(byName.get("editMarkLabelPlacement").inference, [
    { input: "target", strategy: "explicit" },
    { input: "placement", strategy: "documented-auto" }
  ]);
  assert.deepEqual(byName.get("editMarkLabelPlacement").resources.prerequisites, [
    "attached label with a supported source geometry"
  ]);
  assert.deepEqual(byName.get("editMarkLabelPlacement").editableVia, [
    "editMarkLabelPlacement",
    "removeMarkLabels"
  ]);
  assert.deepEqual(byName.get("editMarkLabelPlacement").units, [
    { path: "placement.gap", unit: "logical-pixel" },
    { path: "placement.leader.strokeWidth", unit: "logical-pixel" }
  ]);
  assert.equal(byName.get("createScatterPlot").completionRequirements.state, "complete");
  assert.equal(byName.get("editSemantic").completionRequirements.state, "not-applicable");
});

test("every compact snippet type-checks against the exact ChartProgram declaration", async () => {
  const artifact = JSON.parse(await readFile(cardFile, "utf8"));
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-action-cards-"));
  try {
    await copyFile(declarationFile, path.join(temporary, "program.d.ts"));
    const source = [
      'import type { ChartProgram } from "./program.js";',
      "declare const program: ChartProgram;",
      "declare const chart: () => ChartProgram;",
      "",
      ...artifact.cards.map(card => `${card.snippet};`),
      ""
    ].join("\n");
    const sourceFile = path.join(temporary, "snippets.ts");
    await writeFile(sourceFile, source);
    const result = spawnSync(tscFile, [
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target", "ES2022",
      "--module", "NodeNext",
      "--moduleResolution", "NodeNext",
      sourceFile
    ], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});


test("imputation call patterns preserve method-specific requirements", async () => {
  const artifact = JSON.parse(await readFile(new URL("../../knowledge/action-cards.json", import.meta.url), "utf8"));
  const card = artifact.cards.find(card => card.name === "createImputedData");
  assert.match(card.callPatterns[0], /method: "constant", value/);
  assert.match(card.callPatterns[1], /method: "forward" \| "backward" \| "linear", sortBy/);
  assert.equal(card.options.find(option => option.name === "groupBy").required, false);
});


test("call pattern validation rejects unsupported top-level keys without confusing nested keys", () => {
  const options = ["x", "y", "color", "guides"].map(name => ({ name }));
  assert.throws(() => validateCallPatternOptions("createBarPlot({ x, y, stack?, groupBy? })", options), /undeclared option "stack"/u);
  assert.doesNotThrow(() => validateCallPatternOptions('createBarPlot({ x, y, color: { field, scale: { range: ["a", "b"] } }, guides? })', options));
  assert.throws(() => validateCallPatternOptions('createBarPlot({ x, y, color: { field }, unknown? })', options), /undeclared option "unknown"/u);
});

test("advertised bar calls execute and direction-only guide branches retain their exact meaning", async () => {
  const { cards } = JSON.parse(await readFile(cardFile, "utf8"));
  const bar = cards.find(card => card.name === "createBarPlot");
  assert.ok(cards.find(card => card.name === "createMarkLabels").intents.includes("source-owned text"));
  assert.ok(cards.find(card => card.name === "createMarkLabels").resources.prerequisites.includes("existing eligible source mark"));
  assert.ok(cards.find(card => card.name === "createIntervalPlot").intents.includes("point and interval"));
  assert.ok(cards.find(card => card.name === "encodeChannels").intents.includes("multiple encodings on one mark"));
  assert.ok(bar.callPatterns.every(pattern => !/stack|groupBy/u.test(pattern)));
  const rows = [{ category: "A", x: 1, y: 2, group: "one" }, { category: "B", x: 2, y: 4, group: "two" }];
  const base = () => chart().createCanvas({ width: 500, height: 400, margin: 100 }).createData({ values: rows });
  for (const options of [
    { x: "category", y: "y", width: { pixels: 20 }, color: "group" },
    { x: "category", y: "y", color: "group", guides: false }
  ]) assert.equal(base().createBarPlot(options).graphicSpec.objects.barPlot.items.length, 2);
  const scatter = axes => base().createScatterPlot({ x: "x", y: "y", guides: { axes, grid: false, legend: false } });
  const neither = scatter({ x: false });
  const onlyY = scatter({ x: false, y: {} });
  assert.equal(neither.graphicSpec.objects.xAxisLabels, undefined);
  assert.equal(neither.graphicSpec.objects.yAxisLabels, undefined);
  assert.equal(onlyY.graphicSpec.objects.xAxisLabels, undefined);
  assert.ok(onlyY.graphicSpec.objects.yAxisLabels.items.length > 0);
  assert.equal(onlyY.graphicSpec.objects.scatterPlot.items.length, rows.length);
});

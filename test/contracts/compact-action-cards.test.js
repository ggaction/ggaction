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
  validateActionCards
} from "../../scripts/action-card-source.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cardFile = path.join(root, "knowledge/action-cards.json");
const schemaFile = path.join(root, "knowledge/action-card.schema.json");
const collectionSchemaFile = path.join(root, "knowledge/action-cards.schema.json");
const intentFile = path.join(root, "knowledge/action-intents.json");
const declarationFile = path.join(root, "types/program.d.ts");
const tscFile = path.join(root, "node_modules/.bin/tsc");

test("deferred chart owner cards distinguish creation from completed geometry", async () => {
  const { cards } = JSON.parse(await readFile(cardFile, "utf8"));
  for (const name of ["createBoxPlot", "createGradientPlot"]) {
    const card = cards.find(candidate => candidate.name === name);
    assert.match(card.summary, /owner.*defers geometry and guides/);
    assert.ok(card.resources.prerequisites.includes("compatible x/y roles before materialization"));
    assert.equal(card.callPatterns.length, 2);
  }
});

test("compact action cards are generated from the current action contract", async () => {
  const [{ artifact, context, stats }, currentSource] = await Promise.all([
    buildActionCards(),
    readFile(cardFile, "utf8")
  ]);
  assert.equal(currentSource, `${JSON.stringify(artifact, null, 2)}\n`);
  assert.equal(artifact.count, context.actions.length);
  assert.equal(artifact.schemaVersion, 2);
  assert.equal(artifact.packageVersion, JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8")
  ).version);
  assert.equal(artifact.typeSource, "types/program.d.ts");
  assert.match(artifact.errorPolicy, /curated error override/);
  assert.equal(stats.count, context.actions.length);
  assert.equal(stats.maxBytes <= 3072, true);
  assert.equal(stats.medianBytes <= 1536, true);
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
  assert.equal(collectionSchema.properties.schemaVersion.const, 2);
  assert.equal(collectionSchema.properties.cards.items.$ref, "action-card.schema.json");
  assert.equal(schema.properties.schemaVersion.const, 2);
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
    assert.equal(card.schemaVersion, 2, card.name);
    assert.equal(card.summary.length >= 20 && card.summary.length <= 420, true, card.name);
    assert.equal(card.intents.length >= 3 && card.intents.length <= 7, true, card.name);
    assert.equal(new Set(card.intents).size, card.intents.length, card.name);
    assert.equal(card.callPatterns.length >= 1 && card.callPatterns.length <= 2, true, card.name);
    assert.equal(card.errors.length <= 2, true, card.name);
    assert.equal(card.options.every(option =>
      typeof option.type === "string" && option.type.length > 0
    ), true, card.name);
    assert.match(card.route, /^\/reference\//, card.name);
    assert.doesNotMatch(JSON.stringify(card), /relatedActions|typeDefinitions|documentationBody/);
  }
  assert.equal(intents.schemaVersion, 1);
  assert.equal(Object.keys(intents.summaryOverrides).length < 20, true);
  assert.equal(Object.keys(intents.errorOverrides).length < 10, true);
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

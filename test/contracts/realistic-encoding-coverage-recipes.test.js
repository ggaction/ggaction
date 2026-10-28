import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";
import { literalValueKey } from "../support/scenarios/coverage-ledger.js";
import {
  REALISTIC_ENCODING_COVERAGE_COUNTS,
  REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS,
  REALISTIC_ENCODING_COVERAGE_RECIPES,
  realisticEncodingCoverageFactors
} from "../support/scenarios/realistic-encoding-coverage-recipes.js";

const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));
const inventoryPromise = buildPublicOptionInventory(actionCards);
const EXPECTED = Object.freeze({
  "paths": 673,
  "pathSha256": "489be20311ab31f3b85a4355dfff3fa3ff79f21ebf1bde9ced5ef353288e8acc",
  "literals": 634,
  "literalSha256": "524b246978b5f09ced277f27b45f0016bf47584106d153c53257f784f9e192fb",
  "diversity": 32,
  "diversitySha256": "545faa63709bbd91bcd85ab0b2a3f0c803fb81b11c67efafd629806799486103"
});

function digest(values) {
  return createHash("sha256")
    .update(values.map(value => value.id).sort().join("\n"))
    .digest("hex");
}

function nestedTraceValues(args, path) {
  const summarized = Object.freeze({ summarized: true });
  let values = [args];
  for (const segment of path.split(".")) {
    const array = segment.endsWith("[]");
    const name = array ? segment.slice(0, -2) : segment;
    const next = [];
    for (const value of values) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
      if (Object.hasOwn(value, name) && value[name] !== undefined) {
        if (array) {
          if (Array.isArray(value[name]) && value[name].length > 0) {
            next.push(...value[name]);
          }
        } else {
          next.push(value[name]);
        }
        continue;
      }
      const count = value[`${name}Count`];
      const type = value[`${name}Type`];
      if (!array && (
        Number.isInteger(count) && count > 0 ||
        typeof type === "string" && type.length > 0
      )) next.push(summarized);
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
}

function emptyStats() {
  return { occurrences: 0, datasets: new Set() };
}

function record(stats, dataset) {
  stats.occurrences += 1;
  stats.datasets.add(dataset);
}

function meetsMinimum(stats) {
  return stats.occurrences >= 5 && stats.datasets.size >= 3;
}

function directEntries(program, action) {
  return (program.trace.children ?? []).filter(entry => entry.op === action);
}

function targetInventory(inventory) {
  const actions = new Set(REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS);
  const options = inventory.optionPaths.filter(option =>
    // Scoped routing is exercised on real datasets in realistic-scoped-composition.test.js.
    option.required && actions.has(option.action) && !option.path.startsWith("target.")
  );
  const optionIds = new Set(options.map(option => option.id));
  return Object.freeze({
    options,
    literals: inventory.pathLiteralRequirements.filter(requirement =>
      optionIds.has(requirement.optionPath)
    ),
    diversity: inventory.pathDiversityRequirements.filter(requirement =>
      optionIds.has(requirement.optionPath)
    )
  });
}

const ATOMIC_METHODS = new Set([
  "encodeX", "encodeY", "encodeX2", "encodeY2", "encodeTheta", "encodeR",
  "encodeXOffset", "encodeYOffset", "encodeColor", "encodeStroke", "encodeSize",
  "encodeShape", "encodeOpacity", "encodeStrokeWidth", "encodeStrokeDash",
  "encodeAngle", "encodeText", "encodeDx", "encodeDy"
]);
function atomicPath(option) {
  if (!ATOMIC_METHODS.has(option.action) || ["target", "coordinate"].includes(option.path)) return undefined;
  const suffix = option.action.slice("encode".length);
  return `channels.${suffix[0].toLowerCase() + suffix.slice(1)}.${option.path}`;
}
const ATOMIC_STRUCTURAL_PATHS = Object.freeze([
  "channels.group.field", "channels.group.fields", "channels.group.fieldType",
  "channels.pathOrder.field", "channels.pathOrder.fieldType",
  "channels.pathOrder.order:ascending", "channels.pathOrder.order:descending"
]);

function assertMetadata(recipe, factors, program, metadata, label) {
  const definition = datasetDefinition(factors.dataset);
  assert.equal(definition.corpus, "tidytuesday", label);
  assert.equal(metadata.corpus, "tidytuesday", label);
  assert.deepEqual(metadata.sourceDatasetIds, [factors.dataset], label);
  assert.equal(metadata.provenance.sourceDataset, factors.dataset, label);
  assert.equal(metadata.provenance.sourceRowIndexBasis, "zero-based-data-row-in-pinned-csv");
  assert.equal(
    metadata.provenance.sourceRowIndexes.length,
    metadata.provenance.sourceRowCount,
    label
  );
  assert.equal(
    new Set(metadata.provenance.sourceRowIndexes).size,
    metadata.provenance.sourceRowIndexes.length,
    label
  );
  assert.ok(metadata.provenance.sourceRowIndexes.length > 0, label);
  assert.ok(metadata.provenance.sourceRowIndexes.length <= 160, label);
  assert.ok(metadata.provenance.minimumSourceRow >= 0, label);
  assert.ok(metadata.provenance.maximumSourceRow < definition.rows, label);
  assert.match(metadata.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u, label);
  assert.deepEqual(
    metadata.dataOperations,
    metadata.provenance.transformations.map(transformation => transformation.op),
    label
  );
  assert.ok(metadata.dataOperations.includes("direct-encoding-field-projection"), label);
  assert.ok(metadata.sourceFields.length >= 2, label);
  assert.ok(metadata.sourceFields.every(field => definition.fields[field.field] !== undefined));
  assert.equal(program.semanticSpec.title?.text, metadata.title, label);
  assert.equal(program.semanticSpec.title?.subtitle, metadata.analysisQuestion, label);
  assert.deepEqual(recipe.observe(program, factors), [], label);
  assert.deepEqual(
    recipe.observeFactors(program, factors).map(effect => effect.factor),
    ["profile"],
    label
  );
}

let projectionPromise;

async function projection() {
  if (projectionPromise !== undefined) return projectionPromise;
  projectionPromise = (async () => {
    const target = targetInventory(await inventoryPromise);
    const optionsByAction = new Map();
    for (const option of target.options) {
      const options = optionsByAction.get(option.action) ?? [];
      options.push(option);
      optionsByAction.set(option.action, options);
    }
    const literalsByOption = new Map();
    for (const requirement of target.literals) {
      const requirements = literalsByOption.get(requirement.optionPath) ?? [];
      requirements.push(requirement);
      literalsByOption.set(requirement.optionPath, requirements);
    }
    const optionStats = new Map(target.options.map(option => [option.id, emptyStats()]));
    const literalStats = new Map(target.literals.map(requirement => [
      requirement.id,
      emptyStats()
    ]));
    const valuesByOption = new Map(target.options.map(option => [option.id, new Map()]));
    const atomicOptions = target.options.filter(option => atomicPath(option) !== undefined);
    const atomicOptionIds = new Set(atomicOptions.map(option => option.id));
    const atomicOptionStats = new Map(atomicOptions.map(option => [option.id, emptyStats()]));
    const atomicLiterals = target.literals.filter(requirement => atomicOptionIds.has(requirement.optionPath));
    const atomicLiteralStats = new Map(atomicLiterals.map(requirement => [requirement.id, emptyStats()]));
    const atomicValuesByOption = new Map(atomicOptions.map(option => [option.id, new Map()]));
    const atomicStructuralStats = new Map(ATOMIC_STRUCTURAL_PATHS.map(path => [path, emptyStats()]));
    let chartCount = 0;
    const datasets = new Set();
    for (const recipe of REALISTIC_ENCODING_COVERAGE_RECIPES) {
      for (const factors of realisticEncodingCoverageFactors(recipe)) {
        const label = `${recipe.id}/${factors.dataset}`;
        try {
          const program = recipe.build(factors);
          const metadata = recipe.describe(factors);
          assertMetadata(recipe, factors, program, metadata, label);
          assert.deepEqual(
            program.graphicSpec.objects.canvas.properties,
            { width: 1_600, height: 1_000, background: "#ffffff" },
            `${label} compact readable canvas`
          );
          if (recipe.id === "realistic-direct-polar-encoding-options") {
            assert.deepEqual(
              program.semanticSpec.layers.map(layer => layer.id),
              ["theta-aggregate-count", "theta-aggregate-sum",
                "measured-area-count", "measured-area-sum",
                "measured-radius-length-count", "measured-radius-length-sum"],
              `${label} final polar-only presentation`
            );
            assert.equal(
              directEntries(program, "removeMark").length,
              12,
              `${label} transient polar point witnesses removed`
            );
          }
          assertGraphicIntegrity(program, label);
          assertAnalyticLayerIntegrity(program, label);
          assertSvgIntegrity(renderToSVG(program, {
            title: metadata.title,
            description: metadata.analysisQuestion
          }), label);
          for (const action of recipe.expectedDirectActions) {
            const entries = directEntries(program, action);
            assert.ok(entries.length > 0, `${label} ${action}`);
            for (const option of optionsByAction.get(action) ?? []) {
              const traceValues = entries.flatMap(entry =>
                nestedTraceValues(entry.args, option.path)
              );
              if (traceValues.length === 0) continue;
              record(optionStats.get(option.id), factors.dataset);
              const keys = new Set(traceValues.map(literalValueKey).filter(Boolean));
              for (const key of keys) {
                const valueStats = valuesByOption.get(option.id);
                const stats = valueStats.get(key) ?? emptyStats();
                record(stats, factors.dataset);
                valueStats.set(key, stats);
              }
              for (const requirement of literalsByOption.get(option.id) ?? []) {
                if (keys.has(requirement.valueKey)) {
                  record(literalStats.get(requirement.id), factors.dataset);
                }
              }
            }
          }
          const atomicEntries = directEntries(program, "encodeChannels");
          for (const option of atomicOptions) {
            const values = atomicEntries.flatMap(entry => nestedTraceValues(entry.args, atomicPath(option)));
            if (values.length === 0) continue;
            record(atomicOptionStats.get(option.id), factors.dataset);
            const keys = new Set(values.map(literalValueKey).filter(Boolean));
            for (const key of keys) {
              const observed = atomicValuesByOption.get(option.id);
              const stats = observed.get(key) ?? emptyStats();
              record(stats, factors.dataset);
              observed.set(key, stats);
            }
            for (const requirement of literalsByOption.get(option.id) ?? []) {
              if (keys.has(requirement.valueKey)) record(atomicLiteralStats.get(requirement.id), factors.dataset);
            }
          }
          for (const path of ATOMIC_STRUCTURAL_PATHS) {
            const [property, literal] = path.split(":");
            const values = atomicEntries.flatMap(entry => nestedTraceValues(entry.args, property));
            if (literal === undefined ? values.length > 0 : values.includes(literal)) {
              record(atomicStructuralStats.get(path), factors.dataset);
            }
          }
          chartCount += 1;
          datasets.add(factors.dataset);
        } finally {
          releaseTidyTuesdaySourceCache(factors.dataset);
        }
      }
    }
    return Object.freeze({
      target,
      optionStats,
      literalStats,
      valuesByOption,
      atomicOptions, atomicOptionStats, atomicLiterals, atomicLiteralStats,
      atomicValuesByOption, atomicStructuralStats,
      chartCount,
      datasetCount: datasets.size
    });
  })();
  return projectionPromise;
}

test("defines three direct-encoding recipes with five authentic TT witnesses each", () => {
  assert.deepEqual(REALISTIC_ENCODING_COVERAGE_COUNTS, {
    recipes: 3,
    composite: 3,
    minimumSelections: 15
  });
  assert.equal(REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS.length, 24);
  assert.equal(new Set(REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS).size, 24);
  assert.equal(new Set(REALISTIC_ENCODING_COVERAGE_RECIPES.map(recipe => recipe.id)).size, 3);
  for (const recipe of REALISTIC_ENCODING_COVERAGE_RECIPES) {
    assert.equal(recipe.suite, "realistic", recipe.id);
    assert.equal(recipe.complexity, "composite", recipe.id);
    assert.equal(recipe.enforceFactorEffects, true, recipe.id);
    assert.equal(recipe.minimumSelections, 5, recipe.id);
    assert.equal(recipe.datasets.length, 5, recipe.id);
    assert.equal(new Set(recipe.datasets).size, 5, recipe.id);
    assert.ok(recipe.datasets.every(dataset => datasetDefinition(dataset).corpus === "tidytuesday"));
    assert.deepEqual(recipe.coverageSchedule.variantRequirements, [{
      variantId: "complete-direct-encoding-contract",
      minimumOccurrences: 5,
      minimumDatasets: 3
    }]);
  }
});

test("covers every valid direct encoding option path and path literal at 5/3", async t => {
  const result = await projection();
  assert.equal(result.chartCount, 15);
  assert.equal(result.datasetCount, 5);
  assert.deepEqual({
    paths: result.target.options.length,
    pathSha256: digest(result.target.options),
    literals: result.target.literals.length,
    literalSha256: digest(result.target.literals),
    diversity: result.target.diversity.length,
    diversitySha256: digest(result.target.diversity)
  }, EXPECTED);
  assert.deepEqual(
    result.target.options.filter(option => !meetsMinimum(result.optionStats.get(option.id))),
    []
  );
  assert.deepEqual(
    result.target.literals.filter(requirement =>
      !meetsMinimum(result.literalStats.get(requirement.id))
    ),
    []
  );
  assert.deepEqual(
    result.target.diversity.filter(requirement => {
      const qualifying = [...result.valuesByOption.get(requirement.optionPath).values()]
        .filter(meetsMinimum).length;
      return qualifying < requirement.minimumDistinctValues;
    }),
    []
  );
  t.diagnostic(`${result.target.options.length} paths, ${result.target.literals.length} literals, ${result.target.diversity.length} diversity requirements; ${result.chartCount} recipes on ${result.datasetCount} pinned datasets`);
});


test("executes both restored range palette spellings with authentic 5/3 witnesses", async () => {
  const result = await projection();
  const prefix = "option-path:encodeColor.scale.range.palette";
  assert.deepEqual(
    result.target.options.filter(option => option.id.startsWith(prefix)).map(option => option.id),
    [prefix, `${prefix}.count`, `${prefix}.extent`, `${prefix}.name`]
  );
  for (const path of [prefix, `${prefix}.count`, `${prefix}.extent`, `${prefix}.name`]) {
    const stats = result.optionStats.get(path);
    assert.ok(meetsMinimum(stats), `${path} actual occurrences and dataset minimum`);
    assert.equal(stats.datasets.size, 5, `${path} all five pinned datasets`);
  }
  for (const path of [prefix, `${prefix}.name`]) {
    const values = result.valuesByOption.get(path);
    for (const palette of ["viridis", "magma"]) {
      const stats = values.get(`string:${palette}`);
      assert.ok(stats && meetsMinimum(stats), `${path} ${palette} actual 5/3 evidence`);
      assert.equal(stats.datasets.size, 5, `${path} ${palette} all five pinned datasets`);
    }
  }
});

// encodeChannels is an advanced action, so the ordinary public-action inventory
// intentionally excludes it. Its native payloads still receive actual 5/3 proof.
test("atomic channel counterparts preserve every supported focused option at 5/3", async t => {
  const result = await projection();
  assert.deepEqual({
    paths: result.atomicOptions.filter(option =>
      !meetsMinimum(result.atomicOptionStats.get(option.id))).map(atomicPath),
    literals: result.atomicLiterals.filter(requirement =>
      !meetsMinimum(result.atomicLiteralStats.get(requirement.id))).map(requirement => requirement.id),
    diversity: result.target.diversity.filter(requirement => {
      const values = result.atomicValuesByOption.get(requirement.optionPath);
      return values !== undefined && [...values.values()].filter(meetsMinimum).length < requirement.minimumDistinctValues;
    }).map(requirement => requirement.id),
    structural: [...result.atomicStructuralStats].filter(([, stats]) =>
      !meetsMinimum(stats)).map(([path]) => path)
  }, { paths: [], literals: [], diversity: [], structural: [] });
  t.diagnostic(`${result.atomicOptions.length} atomic paths, ${result.atomicLiterals.length} atomic literals, ${result.atomicValuesByOption.size} typed option ledgers; ${ATOMIC_STRUCTURAL_PATHS.length} group/path-order witnesses`);
  for (const [path, stats] of result.atomicStructuralStats) {
    assert.ok(meetsMinimum(stats), `${path}: actual grouped/path-order atomic witnesses`);
    assert.equal(stats.datasets.size, 5, `${path}: all pinned sources`);
  }
});

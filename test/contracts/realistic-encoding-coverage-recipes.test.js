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
  "paths": 310,
  "pathSha256": "2b51d84100f8f9ab20a1388c6ef63d922ec4ad7b41a8baabdeb034308514c984",
  "literals": 305,
  "literalSha256": "305a74d986f06a1d2dc91c79468753151e20635c5a3e1cfaa11e11a36f7ef54f",
  "diversity": 12,
  "diversitySha256": "842dd3215cb8191bd53940e33c4faf91cf1f2f71bda241ce4876565d8fd9df55"
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
  assert.equal(REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS.length, 18);
  assert.equal(new Set(REALISTIC_ENCODING_COVERAGE_EXPECTED_ACTIONS).size, 18);
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

test("covers every valid direct encoding option path and path literal at 5/3", async () => {
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

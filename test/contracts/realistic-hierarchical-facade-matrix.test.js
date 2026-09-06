import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildPublicOptionInventory } from
  "../support/scenarios/coverage-inventory.js";
import { literalValueKey } from "../support/scenarios/coverage-ledger.js";
import { REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES } from
  "../support/scenarios/realistic-direct-lifecycle-coverage-recipes.js";
import {
  REALISTIC_HIERARCHICAL_FACADE_ACTIONS,
  REALISTIC_HIERARCHICAL_FACADE_PROFILE_COUNT
} from "../support/scenarios/realistic-hierarchical-facade-matrix.js";

const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));
const ACTIONS = new Set(REALISTIC_HIERARCHICAL_FACADE_ACTIONS);
const DATASETS = Object.freeze([
  "tt-penguins",
  "tt-global-temperatures",
  "tt-london-marathon-winners",
  "tt-himalayan-peaks",
  "tt-us-tornadoes"
]);

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
          if (Array.isArray(value[name]) && value[name].length > 0) next.push(...value[name]);
        } else next.push(value[name]);
        continue;
      }
      if (!array && (
        Number.isInteger(value[`${name}Count`]) && value[`${name}Count`] > 0 ||
        typeof value[`${name}Type`] === "string" && value[`${name}Type`].length > 0
      )) next.push(summarized);
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
}

function actionFromOptionPath(optionPath) {
  return optionPath.slice("option-path:".length).split(".")[0];
}

function childPath(optionPath) {
  return optionPath.split(".").slice(1).join(".");
}

function emptyStats() {
  return { occurrences: 0, datasets: new Set() };
}

function record(stats, dataset, count = 1) {
  stats.occurrences += count;
  stats.datasets.add(dataset);
}

test("covers every hierarchical facade option, literal and diversity requirement", {
  timeout: 120_000
}, async () => {
  const inventory = await buildPublicOptionInventory(actionCards);
  const options = inventory.optionPaths.filter(option =>
    option.required && ACTIONS.has(option.action)
  );
  const literals = inventory.pathLiteralRequirements.filter(requirement =>
    ACTIONS.has(actionFromOptionPath(requirement.optionPath))
  );
  const diversity = inventory.pathDiversityRequirements.filter(requirement =>
    ACTIONS.has(actionFromOptionPath(requirement.optionPath))
  );
  const optionStats = new Map(options.map(option => [option.id, emptyStats()]));
  const literalStats = new Map(literals.map(requirement => [requirement.id, emptyStats()]));
  const diversityStats = new Map(diversity.map(requirement => [
    requirement.id,
    { ...emptyStats(), values: new Set() }
  ]));
  const recipe = REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES.find(candidate =>
    candidate.id === "realistic-direct-lifecycle-miscellaneous-coverage"
  );
  assert.ok(recipe);

  for (const dataset of DATASETS) {
    const program = recipe.build({ dataset, profile: { id: "maximal" } });
    const entries = new Map(REALISTIC_HIERARCHICAL_FACADE_ACTIONS.map(action => [
      action,
      program.trace.children.filter(entry => entry.op === action)
    ]));
    for (const [action, direct] of entries) {
      assert.ok(
        direct.length >= REALISTIC_HIERARCHICAL_FACADE_PROFILE_COUNT,
        `${dataset} ${action} direct profiles`
      );
    }
    for (const option of options) {
      const count = entries.get(option.action).filter(entry =>
        nestedTraceValues(entry.args, option.path).length > 0
      ).length;
      if (count > 0) record(optionStats.get(option.id), dataset, count);
    }
    for (const requirement of literals) {
      const action = actionFromOptionPath(requirement.optionPath);
      const path = childPath(requirement.optionPath);
      const count = entries.get(action).filter(entry =>
        nestedTraceValues(entry.args, path).some(value =>
          literalValueKey(value) === requirement.valueKey
        )
      ).length;
      if (count > 0) record(literalStats.get(requirement.id), dataset, count);
    }
    for (const requirement of diversity) {
      const action = actionFromOptionPath(requirement.optionPath);
      const path = childPath(requirement.optionPath);
      const stats = diversityStats.get(requirement.id);
      for (const entry of entries.get(action)) {
        for (const value of nestedTraceValues(entry.args, path)) {
          const key = literalValueKey(value);
          if (key !== undefined) stats.values.add(key);
        }
      }
      if (stats.values.size > 0) record(stats, dataset);
    }
  }

  const insufficient = [
    ...[...optionStats].filter(([, stats]) =>
      stats.occurrences < 5 || stats.datasets.size < 3
    ).map(([id, stats]) => `${id} (${stats.occurrences}/${stats.datasets.size})`),
    ...[...literalStats].filter(([, stats]) =>
      stats.occurrences < 5 || stats.datasets.size < 3
    ).map(([id, stats]) => `${id} (${stats.occurrences}/${stats.datasets.size})`),
    ...diversity.filter(requirement => {
      const stats = diversityStats.get(requirement.id);
      return stats.values.size < requirement.minimumDistinctValues || stats.datasets.size < 3;
    }).map(requirement => {
      const stats = diversityStats.get(requirement.id);
      return `${requirement.id} (${stats.values.size}/${requirement.minimumDistinctValues}; ${stats.datasets.size} datasets)`;
    })
  ];
  assert.deepEqual(insufficient, []);
});

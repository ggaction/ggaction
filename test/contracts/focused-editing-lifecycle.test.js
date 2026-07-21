import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { ChartProgram } from "../../src/ChartProgram.js";
import { visualVariants } from
  "../charts/cross-feature-integration/variants/focused-editing/manifest.js";
import {
  ACTION_INDEX,
  REPOSITORY_ROOT
} from "../support/action-contracts.js";

const root = REPOSITORY_ROOT;
const index = ACTION_INDEX;
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
const declarationIndex = readFileSync(path.join(root, "types/index.d.ts"), "utf8");
const actionReference = readFileSync(path.join(
  root, "docs/reference/actions.md"
), "utf8");

const DIRECT_ACTIONS = Object.freeze([
  "editLegendLayout",
  "editLegendLabels",
  "editLegendTitle",
  "editLegendSymbols",
  "editLegendBorder",
  "editXAxis",
  "editYAxis",
  "editGrid",
  "editErrorBar",
  "editErrorBand",
  "editErrorBandBoundary",
  "editBoxPlot",
  "editRegression",
  "removeXAxis",
  "removeYAxis",
  "removeGrid",
  "removeLegend",
  "removeTitle",
  "removeMark"
]);

const CURRENT_FOCUSED_ACTIONS = DIRECT_ACTIONS;
const REMAINING_DIRECT_ACTIONS = Object.freeze([]);

const EXTENSIONS = Object.freeze([
  "point-create-appearance",
  "bar-create-appearance",
  "line-constant-appearance",
  "scale-palette-edit"
]);

const CAPABILITIES = Object.freeze([
  "compatible-layer-inference",
  "focused-component-editing",
  "domain-removal",
  "exact-public-option-types",
  "api-layer-classification-alignment"
]);

test("promotes the approved focused guide actions and keeps later work Planned", () => {
  const planned = new Set(index.plannedActions.map(action => action.name));
  const current = new Set(index.actions.map(action => action.name));
  for (const action of CURRENT_FOCUSED_ACTIONS) {
    assert.equal(planned.has(action), false, action);
    assert.equal(current.has(action), true, action);
    assert.match(
      declarations,
      new RegExp(`^  ${action}\\(`, "m"),
      action
    );
    assert.equal(typeof ChartProgram.prototype[action], "function", action);
  }
  for (const action of REMAINING_DIRECT_ACTIONS) {
    assert.equal(planned.has(action), true, action);
    assert.equal(current.has(action), false, action);
    assert.doesNotMatch(
      declarations,
      new RegExp(`^  ${action}\\(`, "m"),
      action
    );
    assert.equal(ChartProgram.prototype[action], undefined, action);
  }
});

test("promotes the approved mark and scale parameter extensions", () => {
  const planned = new Set(index.plannedCapabilities.map(capability => capability.id));
  for (const extension of EXTENSIONS) {
    assert.equal(planned.has(extension), false, extension);
  }
  assert.match(declarations, /createPointMark\(options\?: \{[\s\S]*?fill\?: string;[\s\S]*?opacity\?: number;/);
  assert.match(declarations, /createBarMark\(options\?: \{[\s\S]*?stroke\?: string;[\s\S]*?strokeWidth\?: number;/);
  assert.match(declarations, /createLineMark\(options\?: \{[\s\S]*?stroke\?: string;[\s\S]*?opacity\?: number;/);
  assert.match(declarations, /export interface EditScaleOptions \{[\s\S]*?palette\?: Palette;/);
});

test("covers every focused-editing action in an approved visual target", () => {
  const callChains = visualVariants.map(target => target.callChain).join("\n");
  for (const action of DIRECT_ACTIONS) {
    assert.match(callChains, new RegExp(`\\.${action}\\(`), action);
  }
  for (const action of [
    "createPointMark",
    "createBarMark",
    "createLineMark",
    "editLineMark",
    "editScale"
  ]) {
    assert.match(callChains, new RegExp(`\\.${action}\\(`), action);
  }
  for (const [index, target] of visualVariants.entries()) {
    assert.deepEqual(target.artifact, {
      scope: "charts",
      capability: target.artifact.capability
    });
    assert.equal(
      typeof target.userFacing,
      index < 11 ? "function" : "undefined",
      target.variant
    );
  }
});

test("publishes exact current option types and aligns audience classifications", () => {
  for (const name of [
    "CreateGuidesOptions",
    "CreateCoordinateOptions",
    "CreateScaleOptions",
    "CreateRegressionBandOptions",
    "CreateRegressionLineOptions"
  ]) {
    assert.match(declarations, new RegExp(`export (?:interface|type) ${name}`), name);
    assert.match(declarationIndex, new RegExp(`\\b${name},`), name);
  }
  for (const method of [
    "createGuides",
    "createCoordinate",
    "createScale",
    "createRegressionBand",
    "createRegressionLine"
  ]) {
    assert.doesNotMatch(
      declarations,
      new RegExp(`^  ${method}\\([^\\n]*ActionOptions`, "m"),
      method
    );
  }
  assert.match(
    actionReference,
    /catalog layers `user-facing`, `advanced`,\s+and `primitive`, respectively/
  );
});

test("keeps every accepted focused-editing action and capability current", () => {
  const plannedActions = new Set(index.plannedActions.map(action => action.name));
  const plannedCapabilities = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );
  for (const action of DIRECT_ACTIONS) assert.equal(plannedActions.has(action), false, action);
  for (const capability of [...CAPABILITIES, ...EXTENSIONS]) {
    assert.equal(plannedCapabilities.has(capability), false, capability);
  }
});

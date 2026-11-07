import assert from "node:assert/strict";
import { chart } from "../../../../../src/index.js";
import { action } from "../../../../../src/core/action.js";
import { collectThemeAuthoredSources } from "../../../../../src/actions/theme/reconcile.js";
import { findCanvasGraphic } from "../../../../../src/materialization/graphicHierarchy.js";

// Existing public extension action only: no product B facade is implemented.
const wrapper = action({ op: "applyGraphEdgeRoutesUpdate", description: "Demonstrate native trace nesting." },
  function (args) { return this.editCanvas(args); });
const base = chart().createCanvas({ width: 400, height: 300 }).applyTheme({ theme: "dark" });
const direct = base.editCanvas({ background: "red" });
const nested = wrapper.call(base, { background: "red" });
const background = program => findCanvasGraphic(program).properties.background;
assert.equal(background(direct), "red");
assert.equal(collectThemeAuthoredSources(direct).has("g:canvas.background"), true);
assert.equal(collectThemeAuthoredSources(nested).has("g:canvas.background"), false);
const directChanged = direct.applyTheme({ theme: "light" });
const nestedChanged = nested.applyTheme({ theme: "light" });
assert.equal(background(directChanged), "red");
assert.equal(background(nestedChanged), "red");
const removeWrapper = action({ op: "applyGraphEdgeRoutesUpdate", description: "Demonstrate native completion metadata." },
  function () { return this.removeTheme(); });
const removedDirect = base.removeTheme(), removedNested = removeWrapper.call(base);
assert.equal(removedDirect.materializationConfigs.theme, undefined);
assert.notEqual(removedNested.materializationConfigs.theme, undefined);
console.log(JSON.stringify({ productBImplemented: false, expectedFailureReproduced: true,
  directBackground: background(direct), nestedBackground: background(nested),
  directAfterThemeChange: background(directChanged), nestedAfterThemeChange: background(nestedChanged),
  nativeChild: nested.trace.children.at(-1).children[0].op,
  directAuthoredSource: collectThemeAuthoredSources(direct).get("g:canvas.background"),
  nestedAuthoredSource: collectThemeAuthoredSources(nested).get("g:canvas.background") ?? null,
  appearanceDifferenceObserved: false,
  directThemeStateRemoved: removedDirect.materializationConfigs.theme === undefined,
  nestedThemeStateRemoved: removedNested.materializationConfigs.theme === undefined,
  reason: "Theme authored-source inspection loses the explicit native action; this fixture retains red appearance." }, null, 2));

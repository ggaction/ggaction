import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";

const cards = JSON.parse(readFileSync(new URL("../../knowledge/action-cards.json", import.meta.url), "utf8")).cards;

test("option inventory preserves object and named-array branches at the same property depth", async () => {
  const inventory = await buildPublicOptionInventory(cards.filter(card => ["createScatterPlot", "createAxes"].includes(card.name)));
  const paths = new Map(inventory.optionPaths.map(option => [option.id, option]));
  for (const [action, prefix] of [["createScatterPlot", "guides.axes."], ["createAxes", ""]]) {
    for (const channel of ["x", "y"]) {
      for (const leaf of ["id", "offset", "title.align", "title.baseline", "title.alongOffset",
        "ticksAndLabels.ticks.strokeDashMap", "ticksAndLabels.labels.align"]) {
        const object = paths.get(`option-path:${action}.${prefix}${channel}.${leaf}`);
        const array = paths.get(`option-path:${action}.${prefix}${channel}[].${leaf}`);
        assert.equal(object?.required, true, `${action}.${prefix}${channel}.${leaf}`);
        assert.equal(object?.evidence, "direct-trace");
        assert.equal(array?.exclusion.reason, "redacted-array");
        assert.equal(array.exclusion.replacement, `option-path:${action}.${prefix}${channel}`);
        assert.equal(array.depth, object.depth, "array indexing cannot hide deeper public properties");
        if (leaf === "title.baseline") assert.deepEqual(object.values, ["string:alphabetic", "string:bottom", "string:hanging", "string:ideographic", "string:middle", "string:top"]);
      }
    }
  }
  for (const leaf of ["palette", "palette.name", "palette.count", "palette.extent"]) {
    assert.equal(paths.get(`option-path:createScatterPlot.color.scale.range.${leaf}`)?.required, true);
  }
  assert.ok(paths.has("option-path:createScatterPlot.color.scale.range[]"));
  assert.equal(inventory.optionPaths.some(option => /\.length\.|\.charAt|__@/u.test(option.path)), false);
});

test("prepared font and metric authority remains an opaque input in public option coverage", async () => {
  const inventory = await buildPublicOptionInventory(cards.filter(card => ["createFontResource", "replaceFontResource", "applyTextMetrics"].includes(card.name)));
  for (const action of ["createFontResource", "replaceFontResource", "applyTextMetrics"]) {
    assert.ok(inventory.optionPaths.some(option => option.id === `option-path:${action}.prepared` && option.required));
    assert.ok(inventory.optionPaths.some(option => option.id === `option-path:${action}.requestToken` && option.required));
    assert.equal(inventory.optionPaths.some(option => option.action === action && option.path.startsWith("prepared.")), false);
  }
  assert.equal(inventory.optionPaths.some(option => option.path.includes("__@")), false);
});

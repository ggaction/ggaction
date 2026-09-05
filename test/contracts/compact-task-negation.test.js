import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import { searchGgaction, taskPacketBytes } from "../../knowledge/task-resolver.js";
import { docsFallbackResources, searchGgactionText } from "../../src/mcp/adapter.js";

const schema = JSON.parse(readFileSync(new URL("../../knowledge/task-packet.schema.json", import.meta.url)));
const validate = new Ajv2020({ strict: true }).compile(schema);

test("retains exclusions without proposing contradictory actions or facade defaults", () => {
  for (const query of [
    "scatter plot with color encoding and no legend as svg",
    "scatter plot without axes and without grid as svg",
    "line chart without a regression line as svg",
    "scatter plot with no color encoding",
    "scatter plot with color encoding without a legend as svg",
    "scatter plot, do not use createLegend",
    "scatter plot, don't add a legend",
    "scatter plot, don’t add a legend",
    "createScatterPlot excluding createLegend",
    "line chart, omit regression but use color encoding",
    "line chart, avoid regression as svg",
    "not a scatter plot; render svg",
    "scatter plot as svg, not png",
    "scatter plot, no unknown feature",
    "scatter plot with neither axes nor grid",
    "scatter plot without axes but with a legend",
    `scatter plot without ${"optional decoration ".repeat(23)}`,
    `scatter plot without ${"x".repeat(470)}`
  ]) {
    const packet = searchGgaction(query);
    assert.equal(validate(packet), true, JSON.stringify(validate.errors));
    assert.deepEqual(packet.actionPlan, [], query);
    assert.deepEqual(packet.exactCalls, [], query);
    assert.deepEqual(packet.authoring.steps, [], query);
    assert.deepEqual(packet.appliedOptions, [], query);
    assert.deepEqual(packet.matchedConstraints, [], query);
    const retained = query.trim().length <= 180
      ? packet.unmatchedRequirements.join("")
      : packet.unmatchedRequirements.map(part => part.replace(/^\d+\. /, "")).join("");
    assert.equal(retained, query.trim(), query);
    assert.deepEqual(packet.unresolved.map(entry => entry.constraint), ["request.negation"]);
    assert.ok(docsFallbackResources(packet).length > 0);
    assert.ok(taskPacketBytes(packet) <= 6144);
    assert.equal(searchGgactionText(query), JSON.stringify(packet));
  }
});

test("keeps positive requests actionable and quoted restriction words literal", () => {
  for (const query of [
    "scatter plot with color encoding and legend as svg",
    "scatter plot with axes and grid as svg",
    "line chart with a regression line as svg"
  ]) {
    const packet = searchGgaction(query);
    assert.ok(packet.actionPlan.length > 0, query);
    assert.deepEqual(packet.unmatchedRequirements, [], query);
    assert.deepEqual(packet.unresolved, [], query);
  }
  for (const field of ["no", "not", "without", "exclude", "no_legend", "do not use", "not only"]) {
    for (const quote of ['"', "'"]) {
      const packet = searchGgaction(`scatter plot with x ${quote}${field}${quote} and color by ${quote}${field}${quote} as svg`);
      assert.equal(validate(packet), true, JSON.stringify(validate.errors));
      assert.deepEqual(packet.unmatchedRequirements, [], field);
      assert.deepEqual(packet.unresolved, [], field);
      const options = packet.appliedOptions.filter(entry => ["x", "color"].includes(entry.option));
      assert.equal(options.length, 2, field);
      assert.ok(options.every(entry => entry.value.includes(JSON.stringify(field))), field);
    }
  }
});

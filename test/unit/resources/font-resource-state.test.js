import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { materializeTextFont, bindTextFontProperties } from "../../../src/materialization/textFont.js";
import { validateStoredResource } from "../../../src/materialization/resourceState.js";
import { concreteFontValue } from "../../../src/materialization/fontState.js";

const bytes = readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url));
const expectedHash = createHash("sha256").update(bytes).digest("hex"), family = "ggaction Metric Fixture";
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
async function fontProgram() {
  const base = chart().createCanvas();
  const prepared = await prepareFontResource(base, { kind: "create", id: "font", uri: "fixture:font", expectedHash,
    mimeType: "font/ttf", family, style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
  { requestToken: "font", load: () => ({ bytes, mimeType: "font/ttf" }), decode: identity });
  return base.createFontResource({ prepared, requestToken: "font" });
}

test("stored font envelopes reject noncanonical sources, source budgets and alternate ownership", async () => {
  const base = await fontProgram(), resource = base.semanticSpec.resources[0];
  const validate = value => validateStoredResource(value, base.constructor);
  assert.equal(validate(resource), resource);
  const { maxBytes: _limit, ...withoutDefault } = resource.options;
  for (const change of [{ options: withoutDefault }, { result: { ...resource.result, extra: true } },
    { options: { ...resource.options, maxBytes: 4 } }, { provenance: { origin: "authored", extra: true } },
    { ownership: { mode: "derived" } }, { inputs: [{ kind: "font", id: "parent", revision: 0 }] }]) {
    assert.throws(() => validate({ ...resource, ...change }));
  }
});

test("explicit text materialization binds multiline and mixed collections without touching other graphics", async () => {
  let base = await fontProgram();
  const prepared = await prepareTextMetrics(base, { id: "empty", fonts: ["font"] }, {
    requestToken: "metrics", decode: identity, measure() { throw new Error("Empty program needs no measurements"); }
  });
  base = base.applyTextMetrics({ prepared, requestToken: "metrics" });
  const measurement = { text: "AB", fontFamily: family, fontSize: 20, fontWeight: 400, fontStyle: "normal", width: 28 };
  base = base._withMaterializationConfig(["textMetrics"], { ...base.materializationConfigs.textMetrics, measurements: [measurement] });
  const properties = { x: 10, y: 20, text: "AB", lines: [{ text: "AB", x: 0, y: 0 }], fontFamily: family, fontSize: 20, fontWeight: 400 };
  const bound = bindTextFontProperties(base, properties);
  assert.deepEqual(bound.font, concreteFontValue(base.semanticSpec.resources[0]));
  const unbound = base._withoutMaterializationConfig(["textMetrics"]);
  assert.equal(bindTextFontProperties(unbound, properties), properties);
  assert.equal(Object.hasOwn(bindTextFontProperties(unbound, bound), "font"), false);
  const nodes = [{ type: "text", properties }, { type: "rect", properties: { x: 0, y: 0, width: 1, height: 1 } }];
  const graphicSpec = cloneAndFreeze({ ...base.graphicSpec, objects: { ...base.graphicSpec.objects,
    labels: { type: "group", properties: {}, items: nodes } }, order: [...base.graphicSpec.order, "labels"] });
  const mixed = base._clone({ graphicSpec }), result = materializeTextFont(mixed, "labels");
  assert.deepEqual(result.graphicSpec.objects.labels.items[0].properties.font, bound.font);
  assert.deepEqual(result.graphicSpec.objects.labels.items[1].properties, nodes[1].properties);
  assert.equal(mixed.graphicSpec.objects.labels.items[0].properties.font, undefined);
});

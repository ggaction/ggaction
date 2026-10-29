import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { chart } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { registerGeoLabelAnchorResolver, resolveSourceTextAnchors } from "../../src/materialization/textSourceAnchors.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("Basic keeps projection math outside its Text import graph after Full has loaded", async () => {
  const result = await build({ absWorkingDir: root, entryPoints: ["src/basic.js"], bundle: true, format: "esm", platform: "browser", write: false, metafile: true });
  assert.ok(Object.keys(result.metafile.inputs).every(file => !/geo\/(?:labelAnchors|projectionMath|projections|centroid)\.js|node_modules\/geographic-math/.test(file)));
  const source = { id: "geo", mark: { type: "geo" }, geoBinding: { mode: "point" } };
  assert.throws(() => resolveSourceTextAnchors(basic(), source, []), /unavailable/);
  assert.equal(resolveSourceTextAnchors(chart(), { id: "point", mark: { type: "point" } }, []), undefined);
});
test("geographic anchor assembly rejects invalid or repeated registration", () => {
  assert.throws(() => registerGeoLabelAnchorResolver({}, () => []), /constructor/);
  assert.throws(() => registerGeoLabelAnchorResolver(() => {}, () => []), /constructor/);
  assert.throws(() => registerGeoLabelAnchorResolver(class {}, undefined), /resolver/);
  assert.throws(() => registerGeoLabelAnchorResolver(chart().constructor, () => []), /already registered/);
});

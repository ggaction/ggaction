import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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


test("Basic-first module loading cannot acquire the Full geographic anchor capability", () => {
  const script = `
    import assert from 'node:assert/strict';
    const {chart:basic}=await import('./src/basic.js');
    const {resolveSourceTextAnchors}=await import('./src/materialization/textSourceAnchors.js');
    const source={id:'geo',mark:{type:'geo'},geoBinding:{mode:'point'}};
    assert.throws(()=>resolveSourceTextAnchors(basic(),source,[]),/unavailable/);
    const {chart}=await import('./src/index.js');
    const p=chart().createCanvas({width:200,height:100,margin:0})
      .createGeometryData({id:'source',format:'geojson',coordinateKind:'planar',values:{type:'Point',coordinates:[20,30]}})
      .createProjection({id:'projection',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'point'})
      .createMarkLabels({value:'Label'});
    assert.equal(p.graphicSpec.objects['point-labels'].items[0].properties.text,'Label');
    const {serializeProgram,deserializeProgram}=await import('./src/persistence.js');
    const restored=deserializeProgram(serializeProgram(p)).editProjection({translatePx:[5,10]});
    assert.equal(restored.graphicSpec.objects['point-labels'].items[0].properties.x,25);
    assert.throws(()=>resolveSourceTextAnchors(basic(),source,[]),/unavailable/);
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: root, timeout: 30000 });
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("geometry declarations preserve format, feature identity and immutable source shapes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-geometry-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type GeometrySourceResource, type GeoJoinResource, type GeoLODResource, type GeoLODLevels, type GeoJSONInput, type TopoJSONInput } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const source: GeoJSONInput = { type: "Feature", id: "a", properties: { nested: { code: 1 } }, geometry: { type: "Point", coordinates: [1, 2, 3], bbox: [0, 0, 2, 3] } };
const p = chart().createGeometryData({ id: "source", format: "geojson", values: source, coordinateKind: "geographic", featureKey: ["properties", "nested", "code"] });
p.editGeometryData({ values: null }).editGeometryData({ target: { childPath: ["left"], id: "source" }, limits: { maxFeatures: 20 } });
p.editGeometryData({ polygonWinding: "left-hand" });
chart().createGeometryData({ id: "cw", format: "geojson", values: source, coordinateKind: "geographic", polygonWinding: "left-hand" });
// @ts-expect-error No automatic or unknown ring repair.
p.editGeometryData({ polygonWinding: "auto" });
// @ts-expect-error Ring direction has no planar meaning.
chart().createGeometryData({ id: "cw", format: "geojson", values: source, coordinateKind: "planar", polygonWinding: "left-hand" });
// @ts-expect-error Explicit undefined is not a winding reset.
p.editGeometryData({ polygonWinding: undefined });
const topology: TopoJSONInput = { type: "Topology", objects: { world: { type: "LineString", arcs: [-1] } }, arcs: [[[0, 0], [1, 1]]] };
p.createGeometryData({ id: "topology", format: "topojson", values: topology, coordinateKind: "planar", topoObject: "world" });
declare const resource: GeometrySourceResource;
const key: string | undefined = resource.result.identity.rowKeys[0];
p.createGeoJoinData({id:'joined',geometry:'source',data:'table',geometryKey:['properties','nested','code'],dataKey:'code'})
 .editGeoJoinData({target:{childPath:['left'],id:'joined'},dataKey:['nested','code']});
const levels: GeoLODLevels = [{id:'state',geometry:'state'}, {id:'county',geometry:'county',parents:[{key:'a',parent:'s'}],enterZoom:4.2,exitZoom:3.8}];
p.createGeoLODData({id:'details',levels}).editGeoLODData({target:{childPath:['left'],id:'details'},zoom:4});
declare const lod: GeoLODResource;
const active:string=lod.options.activeLevel; void active;
// @ts-expect-error Every level requires an explicit source geometry.
p.createGeoLODData({id:'details',levels:[{id:'state'}]});
// @ts-expect-error Fine levels require thresholds and exact parent mappings.
p.createGeoLODData({id:'details',levels:[{id:'state',geometry:'state'},{id:'county',geometry:'county'}]});
// @ts-expect-error Zoom cannot be reset with null.
p.editGeoLODData({zoom:null});
// @ts-expect-error Geographic levels are Full only.
basic().createGeoLODData({id:'details',levels});
// @ts-expect-error Representation mappings are immutable.
lod.result.mapping[0].regions[0].representations.push('key');
declare const joined: GeoJoinResource;
const matched: number | null | undefined = joined.result.rowMap[0]; void matched;
const input: string = joined.inputs[1].logicalId; void input;
// @ts-expect-error Join keys are explicit exact field paths.
p.createGeoJoinData({id:'joined',dataKey:'code'});
// @ts-expect-error No fuzzy or aggregate join repair.
p.editGeoJoinData({dataKey:'code',fuzzy:true});
// @ts-expect-error Stored correspondence is immutable.
joined.result.rowMap[0]=1;
// @ts-expect-error Geographic joins are Full only.
basic().createGeoJoinData({id:'joined',geometryKey:'id',dataKey:'code'});
// @ts-expect-error Read-only feature identity.
resource.result.identity.rowKeys.push("other");
// @ts-expect-error No topology object option on GeoJSON.
chart().createGeometryData({ id: "x", format: "geojson", values: null, coordinateKind: "planar", topoObject: "world" });
// @ts-expect-error Coordinates require at least two numeric dimensions.
chart().createGeometryData({ id: "x", format: "geojson", values: { type: "Point", coordinates: [1] }, coordinateKind: "planar" });
// @ts-expect-error Explicit coordinate interpretation is required.
chart().createGeometryData({ id: "x", format: "geojson", values: null });
// @ts-expect-error The key policy cannot change during edits.
p.editGeometryData({ featureKey: "id" });
// @ts-expect-error Geographic source authoring is Full only.
basic().createGeometryData({ id: "x", format: "geojson", values: null, coordinateKind: "planar" });
void key;
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

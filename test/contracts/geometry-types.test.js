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
import { chart, type GeometrySourceResource, type GeoJoinResource, type GeoJSONInput, type TopoJSONInput } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const source: GeoJSONInput = { type: "Feature", id: "a", properties: { nested: { code: 1 } }, geometry: { type: "Point", coordinates: [1, 2, 3], bbox: [0, 0, 2, 3] } };
const p = chart().createGeometryData({ id: "source", format: "geojson", values: source, coordinateKind: "geographic", featureKey: ["properties", "nested", "code"] });
p.editGeometryData({ values: null }).editGeometryData({ target: { childPath: ["left"], id: "source" }, limits: { maxFeatures: 20 } });
const topology: TopoJSONInput = { type: "Topology", objects: { world: { type: "LineString", arcs: [-1] } }, arcs: [[[0, 0], [1, 1]]] };
p.createGeometryData({ id: "topology", format: "topojson", values: topology, coordinateKind: "planar", topoObject: "world" });
declare const resource: GeometrySourceResource;
const key: string | undefined = resource.result.identity.rowKeys[0];
p.createGeoJoinData({id:'joined',geometry:'source',data:'table',geometryKey:['properties','nested','code'],dataKey:'code'})
 .editGeoJoinData({target:{childPath:['left'],id:'joined'},dataKey:['nested','code']});
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

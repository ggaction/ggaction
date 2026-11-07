import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart } from "../../../src/index.js";
import { projectGeometry } from "../../../src/grammar/geo/stream.js";
import { geometryCentroid } from "../../../src/grammar/geo/centroid.js";
import { pathFillContains } from "../../../src/grammar/pathGeometry.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { geographicPolygonWinding } from "../../../src/materialization/geo/features.js";
import { getMarkItems } from "../../../src/inspection.js";

const ring = [[-20,-20],[20,-20],[20,20],[-20,20],[-20,-20]];
const hole = [[-5,-5],[-5,5],[5,5],[5,-5],[-5,-5]];
const polygon = coordinates => ({ type: "Polygon", coordinates });
const feature = (id, geometry) => ({ type: "Feature", id, properties: { code: id }, geometry });
const source = values => ({ id: "source", format: "geojson", coordinateKind: "geographic", featureKey: "id", values });
const projection = { type: "equirectangular", scalePx: 100 };
const inside = (parts, lon, lat = 0) => parts.some(part => pathFillContains(part.commands,
  { x: lon * Math.PI / 180 * 100, y: -lat * Math.PI / 180 * 100 }, { fillRule: part.fillRule }));
const resource = (p, id) => p.semanticSpec.resources.find(value => value.id === id);
const properties = (p, id) => p.graphicSpec.objects[id].items[0].properties;
function close(actual, expected, tolerance = 1e-8) { actual.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < tolerance, `${actual} != ${expected}`)); }

test("declared ring direction preserves holes, source coordinates and deliberate spherical complements", () => {
  const ccw = polygon([ring, hole]), cw = polygon([ring, hole].map(points => [...points].reverse())), before = structuredClone(cw);
  const right = projectGeometry(ccw, projection, { coordinateKind: "geographic" });
  const left = projectGeometry(cw, projection, { coordinateKind: "geographic", polygonWinding: "left-hand" });
  assert.deepEqual(left.parts, right.parts);
  for (const result of [left, right]) {
    assert.equal(inside(result.parts, 0), false);
    assert.equal(inside(result.parts, 10), true);
    assert.equal(inside(result.parts, 100), false);
  }
  close(geometryCentroid(cw, { coordinateKind: "geographic", polygonWinding: "left-hand" }), [0, 0]);
  const complement = projectGeometry(polygon([[...ring].reverse()]), projection, { coordinateKind: "geographic" });
  assert.equal(inside(complement.parts, 0), false); assert.equal(inside(complement.parts, 100), true);
  const leftComplement = projectGeometry(polygon([ring]), projection, { coordinateKind: "geographic", polygonWinding: "left-hand" });
  assert.equal(inside(leftComplement.parts, 0), false); assert.equal(inside(leftComplement.parts, 100), true);
  assert.deepEqual(cw, before);
});

test("clockwise antimeridian holes and polar caps retain their intended surface", () => {
  const seam = polygon([[[170,-20],[-170,-20],[-170,20],[170,20],[170,-20]], [[175,-5],[175,5],[-175,5],[-175,-5],[175,-5]]].map(points => [...points].reverse()));
  const result = projectGeometry(seam, projection, { coordinateKind: "geographic", polygonWinding: "left-hand" });
  for (const [lon, expected] of [[179,false],[172,true],[0,false],[-179,false],[-172,true]]) assert.equal(inside(result.parts, lon), expected);
  const cap = polygon([[[-180,80],[-90,80],[0,80],[90,80],[180,80],[-180,80]].reverse()]);
  const out = projectGeometry(cap, { type: "orthographic", rotateDeg: [0,-90,0], scalePx: 100 }, { coordinateKind: "geographic", polygonWinding: "left-hand", interpolation: "great-circle" });
  assert.equal(pathFillContains(out.parts[0].commands, {x:0,y:0}, {fillRule:"evenodd"}), true);
  assert.equal(pathFillContains(out.parts[0].commands, {x:90,y:0}, {fillRule:"evenodd"}), false);
});

test("real land source retains every coordinate while explicit clockwise input separates land and ocean", () => {
  const bytes = readFileSync(new URL("../../../scripts/chart-gallery/data/land-110m.geojson", import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL("../../../scripts/chart-gallery/data/manifest.json", import.meta.url)));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest["land-110m.geojson"].sha256);
  const values = JSON.parse(bytes), before = structuredClone(values);
  assert.equal(values.features.length, 127);
  const p = chart().createCanvas({ width: 720, height: 360, margin: 0 })
    .createGeometryData({ id: "land", format: "geojson", coordinateKind: "geographic", polygonWinding: "left-hand", values })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [360,180] })
    .createCoordinate({ type: "geo" }).createGeoShapeMark({ id: "land", fill: "#dbe4ee", strokeWidth: 0 });
  const paths = p.graphicSpec.objects.land.items.map(item => item.properties);
  const hit = (lon, lat) => paths.some(props => pathFillContains(props.commands, { x:360+lon*Math.PI/180*100, y:180-lat*Math.PI/180*100 }, {fillRule:props.fillRule}));
  for (const [lon, lat, expected] of [[-140,0,false],[-30,0,false],[80,-30,false],[-100,40,true],[20,0,true],[100,40,true],[135,-25,true],[0,-85,true]]) assert.equal(hit(lon,lat),expected,`${lon},${lat}`);
  assert.deepEqual(resource(p,"land").result.source.values,values);
  assert.deepEqual(resource(p,"land").result.features.map(f=>f.geometry),values.features.map(f=>f.geometry));
  assert.deepEqual(values,before);
});

test("winding revisions refresh joined fitted shapes, labels and annotations once without changing source identity", () => {
  const values = feature("region",polygon([[...ring].reverse()]));
  const p = chart().createCanvas({width:200,height:200,margin:0}).createGeometryData(source(values))
    .createData({id:"table",values:[{code:"region",value:3}],keyField:"code"})
    .createGeoJoinData({id:"joined",geometry:"source",data:"table",geometryKey:"id",dataKey:"code"})
    .createProjection({id:"map",type:"equirectangular",fit:{geometry:"joined",width:200,height:200,padding:10}})
    .createCoordinate({type:"geo"}).createGeoShapeMark({id:"shape",geometry:"joined",fill:"orange"})
    .createMarkLabels({source:"shape",id:"labels",field:"value"})
    .createGeoAnnotation({id:"note",anchor:{type:"feature",geometry:"joined",key:"region"},text:"Region"});
  const before=serializeProgram(p), q=p.editGeometryData({target:"source",polygonWinding:"left-hand"});
  for(const id of ["source","joined","map"])assert.equal(resource(q,id).revision,1);
  assert.deepEqual(resource(q,"source").result.source,resource(p,"source").result.source);
  assert.deepEqual(resource(q,"source").result.identity.rowKeys,resource(p,"source").result.identity.rowKeys);
  assert(resource(q,"map").result.scalePx>resource(p,"map").result.scalePx);
  close([properties(q,"note").x,properties(q,"note").y],[100,100]);
  close([properties(q,"labels").x,properties(q,"labels").y],[100,100]);
  assert.equal(getMarkItems(q,{target:"shape"})[0].key,getMarkItems(p,{target:"shape"})[0].key);
  assert.equal(serializeProgram(p),before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  const revised=q.reviseData({source:"table",id:"next-table",values:[{code:"region",value:5}]});
  assert.equal(resource(revised,"map").revision,2);
  close([properties(revised,"note").x,properties(revised,"note").y],[100,100]);
});

test("LOD uses its active source convention while an inactive feature anchor retains its own direction", () => {
  const p=chart().createCanvas({width:200,height:200,margin:0})
    .createGeometryData({...source(feature("state",polygon([ring]))),id:"states"})
    .createGeometryData({...source(feature("county",polygon([[...ring].reverse()]))),id:"counties",polygonWinding:"left-hand"})
    .createGeoLODData({id:"lod",levels:[{id:"coarse",geometry:"states"},{id:"fine",geometry:"counties",parents:[{key:"county",parent:"state"}],enterZoom:2,exitZoom:1}],zoom:0})
    .createProjection({id:"map",type:"equirectangular",fit:{geometry:"lod",width:200,height:200,padding:10}})
    .createCoordinate({type:"geo"}).createGeoShapeMark({id:"shape",geometry:"lod"})
    .createGeoAnnotation({id:"note",anchor:{type:"feature",geometry:"lod",level:"fine",key:"county"},text:"County"});
  const q=p.editGeoLODData({target:"lod",zoom:3});
  close([properties(p,"note").x,properties(p,"note").y],[100,100]);
  close([properties(q,"note").x,properties(q,"note").y],[100,100]);
  assert.deepEqual(resource(q,"map").result,resource(p,"map").result);
  assert.deepEqual(properties(q,"shape").commands,properties(p,"shape").commands);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});

test("generated disks larger than a hemisphere do not inherit point-source ring direction", () => {
  const base=chart().createCanvas({width:720,height:360,margin:0})
    .createGeometryData({...source(feature("center",{type:"Point",coordinates:[0,0]})),polygonWinding:"left-hand"})
    .createProjection({id:"map",...projection,translatePx:[360,180]}).createCoordinate({type:"geo"});
  const p=base.createGeoPointMark({id:"disk",radiusDeg:120,fill:"orange",strokeWidth:0});
  const paths=p.graphicSpec.objects.disk.items.map(item=>item.properties);
  for(const [lon, expected] of [[0,true],[100,true],[150,false]])assert.equal(paths.some(props=>pathFillContains(props.commands,{x:360+lon*Math.PI/180*100,y:180},{fillRule:props.fillRule})),expected);
});

test("invalid direction and forged stored fit reject atomically while omitted old state remains readable", () => {
  const p=chart().createGeometryData(source(feature("region",polygon([ring]))));
  const before=serializeProgram(p);
  for(const polygonWinding of [null,undefined,"auto",true]) {
    assert.throws(()=>p.editGeometryData({target:"source",polygonWinding}),/winding|Winding|undefined/);
    assert.equal(serializeProgram(p),before);
  }
  assert.throws(()=>chart().createGeometryData({...source(polygon([ring])),coordinateKind:"planar",polygonWinding:"left-hand"}),/polygonWinding/);
  assert.throws(()=>projectGeometry(polygon([ring]),{type:"identity"},{coordinateKind:"planar",polygonWinding:"right-hand"}),/polygonWinding/);
  assert.throws(()=>geometryCentroid(polygon([ring]),{coordinateKind:"geographic",polygonWinding:"auto"}),/polygonWinding/);
  assert.doesNotThrow(()=>deserializeProgram(before));
  const fitted=p.createProjection({id:"map",type:"equirectangular",fit:{width:200,height:200}});
  const envelope=JSON.parse(serializeProgram(fitted)), state=decodeValue(envelope.payload);
  resource(state,"source").options.polygonWinding="left-hand";
  envelope.payload=encodeValue(state);assert.throws(()=>deserializeProgram(JSON.stringify(envelope)),/fit|geometry|projection/i);
});


test("source direction rejects descriptor reads and cycles and resets only on an explicit planar transition", () => {
  let reads=0;
  assert.throws(()=>chart().createGeometryData({...source(feature("region",polygon([ring]))),get polygonWinding(){reads++;return "left-hand";}}));
  assert.equal(reads,0);
  const p=chart().createGeometryData({...source(feature("region",polygon([ring]))),polygonWinding:"left-hand"});
  const q=p.editGeometryData({coordinateKind:"planar"});
  assert.equal(Object.hasOwn(resource(q,"source").options,"polygonWinding"),false);
  assert.equal(resource(p,"source").options.polygonWinding,"left-hand");
  assert.equal(Object.hasOwn(resource(q.editGeometryData({coordinateKind:"geographic"}),"source").options,"polygonWinding"),false);
  assert.throws(()=>geographicPolygonWinding({kind:"layout",options:{method:"geo"}},()=>{}),/source resource/);
  const cycle={kind:"geometry",id:"cycle",options:{method:"geo-join"},inputs:[{kind:"geometry",id:"cycle",revision:0}]};
  assert.throws(()=>geographicPolygonWinding(cycle,()=>cycle),/acyclic/);
  assert.throws(()=>geographicPolygonWinding(cycle,()=>({kind:"layout",id:"x",options:{method:"other"}})),/acyclic/);
});

test("clockwise shared topology keeps original arc references and source hashes through options-only edits", () => {
  const values={type:"Topology",arcs:[[[0,0],[0,10],[10,10]],[[10,10],[10,0],[0,0]]],objects:{region:{type:"Polygon",id:"region",arcs:[[0,1]]}}};
  const p=chart().createCanvas({width:100,height:100,margin:0}).createGeometryData({id:"source",format:"topojson",coordinateKind:"geographic",polygonWinding:"left-hand",featureKey:"id",values})
    .createProjection({id:"map",type:"equirectangular",fit:{geometry:"source",width:100,height:100,padding:10}})
    .createCoordinate({type:"geo"}).createGeoShapeMark({id:"shape",fill:"orange",strokeWidth:0});
  const initial=resource(p,"source"),q=p.editGeometryData({polygonWinding:"right-hand"});
  assert.equal(pathFillContains(properties(p,"shape").commands,{x:50,y:50},{fillRule:"evenodd"}),true);
  assert.deepEqual(resource(q,"source").result.topology,initial.result.topology);
  assert.equal(resource(q,"source").result.source.contentHash,initial.result.source.contentHash);
  assert.deepEqual(resource(q,"source").result.source.values,values);
  assert.deepEqual(resource(q,"source").result.identity.rowKeys,initial.result.identity.rowKeys);
  assert.equal(initial.options.topoObject,"region");
  assert.deepEqual(deserializeProgram(serializeProgram(q)).semanticSpec,q.semanticSpec);
});

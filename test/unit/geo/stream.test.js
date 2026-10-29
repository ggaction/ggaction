import test from "node:test";
import assert from "node:assert/strict";
import { projectGeometry } from "../../../src/grammar/geo/stream.js";
import { fitGeometryProjection } from "../../../src/grammar/geo/fit.js";
import { createProjectionKernel } from "../../../src/grammar/geo/projections.js";
import { pathFillContains, pathStrokeDistance } from "../../../src/grammar/pathGeometry.js";
import { normalizeGeometryData } from "../../../src/grammar/geo/normalize.js";

const geographic = { coordinateKind: "geographic" };
const planar = { coordinateKind: "planar" };
const square = [[-20,-20],[20,-20],[20,20],[-20,20],[-20,-20]];
const hole = [[-5,-5],[-5,5],[5,5],[5,-5],[-5,-5]];
const point = coordinates => ({ type: "Point", coordinates });
const line = coordinates => ({ type: "LineString", coordinates });
const polygon = coordinates => ({ type: "Polygon", coordinates });
function close(actual, expected, tolerance = 1e-8) { assert.equal(actual.length, expected.length); actual.forEach((v,i) => assert.ok(Math.abs(v-expected[i]) < tolerance, `${v} != ${expected[i]}`)); }

test("date-line edges split without a world-spanning segment and retain one source path", () => {
  const source = line([[179,0],[-179,0]]), saved = structuredClone(source);
  const result = projectGeometry(source, { type: "equirectangular", scalePx: 100 }, geographic);
  assert.equal(result.parts.length, 2);
  for (const part of result.parts) {
    assert.equal(part.kind, "line");
    assert.ok(Math.abs(part.commands[1].x-part.commands[0].x)<2);
    assert.deepEqual(part.sourcePath, []);
  }
  assert.notDeepEqual(result.parts[0].key, result.parts[1].key);
  assert.deepEqual(source, saved);
  assert.ok(Object.isFrozen(result.parts[0].commands[0]));
});

test("horizon clipping preserves a visible middle when both endpoints are hidden", () => {
  const projection = { type: "orthographic", scalePx: 100, clipAngleDeg: 30 };
  const kernel = createProjectionKernel(projection);
  assert.equal(kernel.forward([-80,0]).point, null); assert.equal(kernel.forward([80,0]).point, null);
  const result = projectGeometry(line([[-80,0],[80,0]]), projection, { ...geographic, interpolation: "great-circle" });
  assert.equal(result.parts.length, 1);
  close(result.bounds, [-50,0,50,0]);
  assert.equal(pathStrokeDistance(result.parts[0].commands,{x:0,y:0}), 0);
  const hidden = projectGeometry(line([[120,0],[160,0]]), projection, geographic);
  assert.deepEqual(hidden.parts, []); assert.equal(hidden.bounds, null);
});

test("polygon holes remain unpainted while outer winding and polar caps remain intact", () => {
  const projection = { type: "equirectangular", scalePx: 100 }, source = polygon([square,hole]);
  const result = projectGeometry(source, projection, geographic), part = result.parts[0];
  assert.equal(part.commands.filter(c=>c.op==='Z').length, 2);
  assert.equal(pathFillContains(part.commands,{x:0,y:0},{fillRule:part.fillRule}),false);
  assert.equal(pathFillContains(part.commands,{x:20,y:0},{fillRule:part.fillRule}),true);
  assert.equal(pathFillContains(part.commands,{x:100,y:0},{fillRule:part.fillRule}),false);
  const cap = projectGeometry(polygon([[[-180,80],[-90,80],[0,80],[90,80],[180,80],[-180,80]]]), {type:'orthographic',rotateDeg:[0,-90,0],scalePx:100}, {...geographic,interpolation:'great-circle'});
  assert.equal(cap.parts.length,1);
  assert.equal(pathFillContains(cap.parts[0].commands,{x:0,y:0},{fillRule:'evenodd'}),true);
  assert.equal(pathFillContains(cap.parts[0].commands,{x:90,y:0},{fillRule:'evenodd'}),false);
  // Reversing the exterior explicitly selects the complementary spherical interior.
  const complement = projectGeometry(polygon([[...square].reverse()]), projection, {...geographic,interpolation:'great-circle'});
  assert.equal(pathFillContains(complement.parts[0].commands,{x:0,y:0},{fillRule:'evenodd'}),false);
  assert.equal(pathFillContains(complement.parts[0].commands,{x:100,y:0},{fillRule:'evenodd'}),true);
});

test("planar polygons use affine units, retain holes and honor rectangular clipping", () => {
  const source = polygon([square,hole]);
  const result = projectGeometry(source, {type:'identity',scalePx:2,clipExtentPx:[[-30,-30],[30,30]]}, planar);
  close(result.bounds,[-30,-30,30,30]);
  const part=result.parts[0];assert.equal(pathFillContains(part.commands,{x:0,y:0},{fillRule:part.fillRule}),false);
  assert.equal(pathFillContains(part.commands,{x:20,y:0},{fillRule:part.fillRule}),true);
});

test("date-line polygon splitting preserves holes on both sides of the seam", () => {
  const source=polygon([[[170,-20],[-170,-20],[-170,20],[170,20],[170,-20]],[[175,-5],[175,5],[-175,5],[-175,-5],[175,-5]]]);
  const result=projectGeometry(source,{type:'equirectangular',scalePx:100},geographic);
  const commands=result.parts[0].commands;
  for(const [longitude,inside] of [[179,false],[172,true],[0,false],[-179,false],[-172,true]]) {
    assert.equal(pathFillContains(commands,{x:longitude*Math.PI/180*100,y:0},{fillRule:'evenodd'}),inside);
  }
  assert.ok(commands.filter(c=>c.op==='M').length>=2);
});

test("collections preserve stable member paths, null members and extra coordinate source dimensions", () => {
  const source={type:'GeometryCollection',geometries:[null,{type:'MultiPoint',coordinates:[[0,0,10],[10,10,20]]},{type:'MultiLineString',coordinates:[[[0,0],[10,0]],[]]},{type:'MultiPolygon',coordinates:[[square],[square.map(([x,y])=>[x+50,y])]]}]};
  const before=structuredClone(source), result=projectGeometry(source,{type:'identity'},planar);
  assert.deepEqual(result.parts.map(p=>p.kind),['point','point','line','polygon','polygon']);
  assert.deepEqual(result.parts[1].sourcePath,['geometries',1,'coordinates',1]);
  assert.equal(new Set(result.parts.map(p=>JSON.stringify(p.key))).size,5);
  assert.deepEqual(source,before);
  assert.deepEqual(projectGeometry(null,{type:'identity'},planar).parts,[]);
  assert.equal(projectGeometry({type:'GeometryCollection',geometries:[]},{type:'identity'},planar).bounds,null);
});

test("source segments and great circles remain distinct at high latitude", () => {
  const source=line([[-60,60],[60,60]]), projection={type:'equirectangular',scalePx:100};
  const straight=projectGeometry(source,projection,geographic), curved=projectGeometry(source,projection,{...geographic,interpolation:'great-circle'});
  close(straight.bounds,[-Math.PI/3*100,-Math.PI/3*100,Math.PI/3*100,-Math.PI/3*100]);
  assert.ok(curved.bounds[1] < -125);
  const reversed=projectGeometry(line([[60,60],[-60,60]]),projection,geographic);
  close(reversed.bounds,straight.bounds);
});

test("antipodal great circles require an explicit non-antipodal route hint", () => {
  const source=line([[0,0],[180,0]]),projection={type:'equirectangular',scalePx:100};
  assert.throws(()=>projectGeometry(source,projection,{...geographic,interpolation:'great-circle'}),/Antipodal/);
  assert.throws(()=>projectGeometry(source,projection,{...geographic,interpolation:'great-circle',routeHint:[0,0]}),/Antipodal/);
  const result=projectGeometry(source,projection,{...geographic,interpolation:'great-circle',routeHint:[0,90]});
  assert.ok(result.parts.length);assert.ok(result.bounds[1]<-150);
  assert.ok(projectGeometry(source,projection,geographic).parts.length);
});

test("adaptive spherical resampling increases detail under a tighter pixel tolerance", () => {
  const source=line([[-70,10],[70,60]]), options={...geographic,interpolation:'great-circle'};
  const loose=projectGeometry(source,{type:'orthographic',scalePx:500,precisionPx:5},options);
  const tight=projectGeometry(source,{type:'orthographic',scalePx:500,precisionPx:.01},options);
  assert.ok(tight.diagnostics.outputPoints > loose.diagnostics.outputPoints);
  const kernel=createProjectionKernel({type:'orthographic',scalePx:500});
  close([tight.parts[0].commands[0].x,tight.parts[0].commands[0].y],kernel.forward([-70,10]).point);
  assert.ok(tight.parts.every(part=>part.commands.every(c=>c.op==='Z'||Number.isFinite(c.x)&&Number.isFinite(c.y))));
});

test("composite streams tag explicit inset components and exclude geometry outside them", () => {
  const source={type:'MultiPoint',coordinates:[[-100,40],[-150,64],[-157,20],[0,0]]};
  const result=projectGeometry(source,{type:'albers-usa'},geographic);
  assert.deepEqual(result.parts.map(p=>p.component),['lower48','alaska','hawaii']);
  const lines=projectGeometry(line([[-151,63],[-149,65]]),{type:'albers-usa'},geographic);
  assert.ok(lines.parts.length);assert.ok(lines.parts.every(p=>p.component==='alaska'));
});

test("shared topology boundaries project to the same geographic endpoints", () => {
  const input={type:'Topology',arcs:[[[0,0],[10,0],[10,10]],[[10,10],[0,10],[0,0]]],objects:{area:{type:'Polygon',arcs:[[0,1]]},edge:{type:'LineString',arcs:[0]}}};
  const area=normalizeGeometryData(input,{format:'topojson',coordinateKind:'geographic',topoObject:'area'});
  const edge=normalizeGeometryData(input,{format:'topojson',coordinateKind:'geographic',topoObject:'edge'});
  const p={type:'equirectangular'},a=projectGeometry(area.features[0].geometry,p,geographic),e=projectGeometry(edge.features[0].geometry,p,geographic);
  for(const c of e.parts[0].commands)assert.ok(a.parts[0].commands.some(v=>v.x===c.x&&v.y===c.y));
});

test("stream bounds fit planar, collapsed, point-only and clipped spherical geometry", () => {
  const fit=fitGeometryProjection(line([[0,0],[10,20]]),{type:'identity'},{width:100,height:100},planar);
  assert.equal(fit.parameters.scalePx,5);close(fit.parameters.translatePx,[25,0]);close(fit.bounds,[25,0,75,100]);
  const single=fitGeometryProjection(point([2,3]),{type:'identity',scalePx:4},{width:100,height:100},planar);
  assert.equal(single.parameters.scalePx,4);close(single.parameters.translatePx,[42,38]);
  const explicit=fitGeometryProjection(point([2,3]),{type:'identity'},{width:100,height:100,pointScale:2},planar);
  assert.equal(explicit.parameters.scalePx,2);
  const globe=fitGeometryProjection(polygon([square]),{type:'orthographic',clipExtentPx:[[0,0],[300,200]]},{width:300,height:200,padding:10},geographic);
  assert.ok(globe.bounds[0]>=10-.5&&globe.bounds[1]>=10-.5&&globe.bounds[2]<=290+.5&&globe.bounds[3]<=190+.5);
  assert.throws(()=>fitGeometryProjection(null,{type:'identity'},{width:100,height:100},planar),/empty/);
  assert.throws(()=>fitGeometryProjection(point([180,0]),{type:'orthographic'},{width:100,height:100},geographic),/empty|clipped/);
  let reads=0;
  assert.throws(()=>fitGeometryProjection(point([0,0]),{type:'identity'},{get width(){reads++;return 100;},height:100},planar),/accessors/);
  assert.equal(reads,0);
  assert.throws(()=>fitGeometryProjection(point([0,0]),{type:'identity'},{width:100,height:100,scalePx:3},planar),/Unknown|unknown/);
});

test("stream rejects malformed inputs, incompatible modes and work expansion atomically", () => {
  const source=polygon([square,hole]),before=structuredClone(source);
  for(const options of [{}, {coordinateKind:'planar'}, {...geographic,interpolation:'unknown'}, {...geographic,routeHint:[0,0]}, {...geographic,interpolation:'great-circle',routeHint:[0,91]}, {...geographic,maxPoints:0}, {...geographic,maxPoints:30001}, {...geographic,other:true}])assert.throws(()=>projectGeometry(source,{type:'equirectangular'},options));
  assert.throws(()=>projectGeometry(source,{type:'identity'},{...planar,interpolation:'great-circle'}));
  assert.throws(()=>projectGeometry(polygon([[[0,0],[1,0],[1,1]]]),{type:'identity'},planar),/four|closed/);
  assert.throws(()=>projectGeometry(source,{type:'equirectangular'},{...geographic,maxPoints:3}),/exceed/);
  assert.throws(()=>projectGeometry(line([[-80,0],[80,0]]),{type:'orthographic',precisionPx:.01},{...geographic,interpolation:'great-circle',maxPoints:2}),/exceed/);
  assert.throws(()=>projectGeometry(point([1e308,1e308]),{type:'identity',scalePx:1e308},planar),/overflow/);
  assert.throws(()=>projectGeometry(line([[1e308,1e308],[1e307,1e307]]),{type:'identity',scalePx:1e308},planar),/non-finite/);
  let reads=0;assert.throws(()=>projectGeometry({get type(){reads++;return 'Point';},coordinates:[0,0]},{type:'identity'},planar),/accessors/);assert.equal(reads,0);
  assert.deepEqual(source,before);
});

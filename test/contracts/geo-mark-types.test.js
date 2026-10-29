import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("Geo mark declarations preserve coordinate ownership, role options and the Basic boundary", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-geo-marks-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import {chart, type GeoPointMarkOptions, type GeoMarkBinding, type SemanticCoordinate} from ${JSON.stringify(path.join(root, "types/index.js"))};
import {chart as basic} from ${JSON.stringify(path.join(root, "types/basic.js"))};
const p=chart().createCoordinate({type:'geo',projection:'map'}).createGeoPointMark({geometry:'cities',radiusDeg:3})
 .editGeoPointMark({target:{childPath:['left'],id:'cities'},radiusPx:5}).createGeoShapeMark({fill:'orange',blend:'multiply',outline:{color:'white',width:2}})
 .editGeoShapeMark({strokeWidth:0}).createGeoLineMark({interpolation:'great-circle',routeHint:[0,30]}).editGeoLineMark({routeHint:false,interpolation:'source-segment'})
 .createGraticule({stepDeg:[10,20],extentDeg:[[-180,-80],[180,80]],precisionDeg:2.5}).editGraticule({opacity:0}).editCoordinate({target:'main',projection:'other'});
p.encodeColor({target:'districts',field:'category',scale:{id:'categories',unknown:'gray'}})
 .encodeColor({target:'routes',field:'value',fieldType:'quantitative',scale:{id:'traffic',type:'threshold',domain:[10],range:['blue','red']}})
 .encodeSize({target:'places',field:'population',scale:{id:'areas',range:[0,900]}})
 .createLegend({target:'places',channels:['color','size']})
 .encodeSize({target:{childPath:['left'],id:'places'},value:100});
p.encodeColor({target:'places',conditions:[{when:{version:2,registry:'standard@1',root:{type:'literal',value:true}},value:{field:'category',scale:{id:'categories'}}}],otherwise:{value:'gray'}})
 .encodeSize({target:'places',conditions:[{when:{selection:'chosen'},value:{value:0}}],otherwise:{field:'population',scale:{id:'areas'}}});
basic().createCoordinate({type:'polar'});
declare const coordinate:SemanticCoordinate;
if(coordinate.type==='geo') { const id:string=coordinate.projection.id; void id; }
declare const binding:GeoMarkBinding;
if(binding.mode==='graticule') { const step:number=binding.graticule.stepDeg[0]; void step; }
const circle:GeoPointMarkOptions={radiusPx:4}; void circle;
p.createGeoAnnotation({anchor:{type:'position',position:[10,20]},text:'Here',rotation:20,fill:'red'})
 .editGeoAnnotation({target:{childPath:['left'],id:'note'},anchor:{type:'feature',geometry:'world',key:['county',1],level:'county'},text:'Moved'});
if(binding.mode==='annotation' && binding.anchor.type==='feature') { const key = binding.anchor.key; void key; }
// @ts-expect-error Text content is a required semantic string.
p.createGeoAnnotation({anchor:{type:'position',position:[0,0]},text:1});
// @ts-expect-error Feature anchors use a key, not an explicit position.
p.createGeoAnnotation({anchor:{type:'feature',position:[0,0]},text:'Bad'});
// @ts-expect-error Position anchors cannot bind an unrelated geometry.
p.createGeoAnnotation({anchor:{type:'position',position:[0,0],geometry:'world'},text:'Bad'});
// @ts-expect-error Geographic annotation is not a data text encoding.
p.createGeoAnnotation({anchor:{type:'position',position:[0,0]},text:'Bad',data:'data'});
// @ts-expect-error Geographic annotation is Full only.
basic().createGeoAnnotation({anchor:{type:'position',position:[0,0]},text:'Bad'});

// @ts-expect-error Pixel and geographic radii are exclusive.
p.editGeoPointMark({radiusDeg:3,radiusPx:5});
// @ts-expect-error Line marks do not draw point radii.
p.createGeoLineMark({radiusPx:3});
// @ts-expect-error Line fill is fixed to none.
p.createGeoLineMark({fill:'red'});
// @ts-expect-error Graticules have geographic parameters, not a source resource.
p.createGraticule({geometry:'world'});
// @ts-expect-error Projection edits cannot mix native coordinate constraints.
p.editCoordinate({target:'main',projection:'map',aspect:'auto'});
// @ts-expect-error Geo coordinates require the geo discriminant.
p.createCoordinate({type:'cartesian',projection:'map'});
// @ts-expect-error Geo is Full only.
basic().createCoordinate({type:'geo',projection:'map'});
// @ts-expect-error Geo marks are Full only.
basic().createGeoShapeMark();
// @ts-expect-error Stored bindings are immutable.
binding.mode='line';
`);
    const result=compileTypeScript(["--noEmit","--strict","--exactOptionalPropertyTypes","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",file],{cwd:root});
    assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

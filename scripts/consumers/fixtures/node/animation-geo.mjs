import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chart,render} from 'ggaction';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames,createAnimationPlayer} from 'ggaction/animation';
import {renderToSVG} from 'ggaction/svg';
import {renderToPNGBuffer} from 'ggaction/png';
import {renderToPDFBuffer} from 'ggaction/pdf';
import {createCanvas} from '@napi-rs/canvas';
import {createInteractionSession} from 'ggaction/interaction';

const options={durationMs:100,easing:'linear'};
const hash=value=>createHash('sha256').update(value).digest('hex');
function endpoints(numeric=false){
 const from=chart().createCanvas({width:400,height:300,margin:0})
  .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{},geometry:{type:'Point',coordinates:[0,0]}}]}})
  .createProjection({id:'map',type:'orthographic',scalePx:100,translatePx:[-200,150],clipExtentPx:[[0,0],[400,300]]})
  .createCoordinate({type:'geo'}).createGeoPointMark({id:'places',radiusPx:12,fill:'red',strokeWidth:0,...(numeric?{capacity:{maxProjectedPoints:200000,maxPathCommands:200000}}:{})});
 return {from,to:from.editProjection({translatePx:[600,150]})};
}
function indexedPathHits() {
 const pathGeometry={maxParts:400000,maxWork:2000000,maxIndexWork:16000000},hitPreparation={maxWork:128000000,pathGeometry};
 const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
  .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:1000},(_,i)=>[-30+60*i/999,(i%2?1:-1)*5])}}]}})
  .createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'})
  .createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
 const native=createInteractionSession({program:from,bindings:[],hitPreparation}),scalar=createInteractionSession({program:from,bindings:[]});
 const host={addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})};
 native.mount(host);scalar.mount(host);
 for(const i of[0,499,998]){
  const point={x:200+100*(-30+60*(i+.5)/999)*Math.PI/180,y:200};
  for(const session of[native,scalar])session.dispatch({type:'inspect',point,slop:0});
  assert.deepEqual(native.getState().hit.candidates,scalar.getState().hit.candidates);
  assert.equal(native.getState().hit.target.ownerId,'coast');assert.ok(native.getState().hit.statistics.work<scalar.getState().hit.statistics.work);
 }
 const plan=planTransition({from,to:from.editProjection({scalePx:200}),options:{...options,formatVersion:5}}),frame=sampleTransition(plan,50);
 native.dispatch({type:'frame',frame,version:native.getState().frameVersion+1,generation:native.getState().generation});
 const before=native.getState(),offline=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);
 assert.throws(()=>native.dispatch({type:'frame',frame:offline,version:before.frameVersion+1,generation:before.generation}),/native/);
 assert.equal(native.getState().animationFrame,frame);
 assert.throws(()=>createInteractionSession({program:from,bindings:[],hitPreparation:{...hitPreparation,pathGeometry:{...pathGeometry,maxParts:1}}}),/parts/);
 assert.throws(()=>createInteractionSession({program:from,bindings:[],hitPreparation:{pathGeometry:{maxIndexWork:16000001}}}),/maxIndexWork/);
 scalar.destroy();native.destroy();
}
export const cases=[
 {id:'animation-geo/indexed-native-path-hit-policy',run(){indexedPathHits();}},
 {id:'animation-geo/offline-four-renderers',async run(){
  for(const formatVersion of [undefined,5]){
  const options={durationMs:100,easing:'linear',...(formatVersion===5?{formatVersion}:{})};
  const {from,to}=endpoints(options.formatVersion===5),plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
  assert.ok(frame.decisions.some(value=>value.kernel==='native-geo'));
  assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);
  assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
  const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
  assert.deepEqual([...canvas.getContext('2d').getImageData(200,150,1,1).data],[255,0,0,255]);
  assert.deepEqual([...canvas.getContext('2d').getImageData(350,250,1,1).data],[255,255,255,255]);
  const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);
  assert.deepEqual(png.buffer,await canvas.encode('png'));
  const expected={scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash(png.buffer),canvas:hash(await canvas.encode('png')),pdf:Buffer.from(pdf.buffer).subarray(0,4).toString(),network:0};
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
   import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import {syncBuiltinESMExports} from 'node:module';
   let network=0;const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;
   for(const value of [http,https]){value.get=deny;value.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
   const {createHash}=await import('node:crypto'),{render}=await import('ggaction'),{createCanvas}=await import('@napi-rs/canvas');
   const {deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png'),{renderToPDFBuffer}=await import('ggaction/pdf');
   let saved='';for await(const chunk of process.stdin)saved+=chunk;
   const frame=sampleTransition(deserializeAnimation(saved).plan,50),hash=value=>createHash('sha256').update(value).digest('hex'),canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
   const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);
   console.log(JSON.stringify({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash(png.buffer),canvas:hash(await canvas.encode('png')),pdf:Buffer.from(pdf.buffer).subarray(0,4).toString(),network}));
  `],{input:serializeAnimation(plan),encoding:'utf8',timeout:30000});
  assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),expected);
  }
 }},
 {id:'animation-geo/current-frame-interruption',async run(){
  const {from,to}=endpoints(),plan=planTransition({from,to,options}),clock={now:()=>0,requestFrame(){throw Error('Paused player scheduled a callback');},cancelFrame(){}};
  const player=createAnimationPlayer({plan,clock,render(){}});player.seek(50);
  const captured=player.getFrame();assert.equal(captured.scene.nodes.find(node=>node.type==='circle').properties.x,200);
  player.interrupt({to:from,options});assert.equal(player.getFrame(),captured);player.seek(25);
  assert.equal(player.getFrame().scene.nodes.find(node=>node.type==='circle').properties.x,100);
  const rebase=planTransition({from:player.getFrame(),to,options}),[timed]=exportAnimationFrames(rebase,{timesMs:[0]});
  const reverse=planTransition({from:to,to:timed,options}),restored=deserializeAnimation(serializeAnimation(reverse)).plan;
  for(const t of [0,50,100])assert.deepEqual(sampleTransition(restored,t).scene,sampleTransition(reverse,t).scene);
  player.dispose();assert.equal(player.getFrame(),undefined);
 }},
 {id:'animation-geo/immutable-failure',run(){
  const {from,to}=endpoints(),snapshot=JSON.stringify(from),plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
  const broken=JSON.parse(serializeAnimation(plan));broken.digest='0'.repeat(64);
  assert.throws(()=>deserializeAnimation(JSON.stringify(broken)),/digest/);
  assert.throws(()=>planTransition({from:structuredClone(frame),to,options}),/ChartProgram/);
  assert.deepEqual(sampleTransition(plan,50),frame);assert.equal(JSON.stringify(from),snapshot);
  assert.equal(frame.decisions.find(decision=>decision.kind==='geographic').targetIndex,undefined);
 }},
 {id:'animation-geo/numeric-capacity-path-four-renderers',async run(){
  const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
   .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:1000},(_,i)=>[-30+60*i/999,(i%2?1:-1)*5])}}]}})
   .createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'})
   .createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
  const plan=planTransition({from,to:from.editProjection({scalePx:200}),options:{...options,formatVersion:5}}),native=sampleTransition(plan,50),offline=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);
  assert.equal(offline.scene.nodes[1].properties.commands.length,1999);assert.equal(offline.scene.nodes[1].properties.maxCommands,200000);
  assert.deepEqual(offline,native);assert.equal(renderToSVG(offline),renderToSVG(native));
  const canvases=[native,offline].map(frame=>{const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));return canvas;});
  assert.deepEqual(await canvases[0].encode('png'),await canvases[1].encode('png'));
  const png=await renderToPNGBuffer(offline),pdf=await renderToPDFBuffer(offline);
  assert.deepEqual(png.buffer,await canvases[1].encode('png'));assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');assert.doesNotMatch(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image/);
 }}
];

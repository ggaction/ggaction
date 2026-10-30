import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chart,render} from 'ggaction';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames,createAnimationPlayer} from 'ggaction/animation';
import {renderToSVG} from 'ggaction/svg';
import {renderToPNGBuffer} from 'ggaction/png';
import {renderToPDFBuffer} from 'ggaction/pdf';
import {createCanvas} from '@napi-rs/canvas';

const options={durationMs:100,easing:'linear'};
const hash=value=>createHash('sha256').update(value).digest('hex');
function endpoints(){
 const from=chart().createCanvas({width:400,height:300,margin:0})
  .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{},geometry:{type:'Point',coordinates:[0,0]}}]}})
  .createProjection({id:'map',type:'orthographic',scalePx:100,translatePx:[-200,150],clipExtentPx:[[0,0],[400,300]]})
  .createCoordinate({type:'geo'}).createGeoPointMark({id:'places',radiusPx:12,fill:'red',strokeWidth:0});
 return {from,to:from.editProjection({translatePx:[600,150]})};
}
export const cases=[
 {id:'animation-geo/offline-four-renderers',async run(){
  const {from,to}=endpoints(),plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
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
 }}
];

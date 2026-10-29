import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chart,render,prepareImageRendering} from 'ggaction';
import {planTransition,sampleTransition,createAnimationPlayer} from 'ggaction/animation';
import {createInteractionSession} from 'ggaction/interaction';
import {getMarkItems} from 'ggaction/inspection';
import {serializeProgram} from 'ggaction/persistence';
import {renderToSVG} from 'ggaction/svg';
import {renderToPNGBuffer} from 'ggaction/png';
import {renderToPDFBuffer} from 'ggaction/pdf';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const source=()=>chart().createCanvas({width:240,height:180,margin:20}).createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:1}]}).createPointMark({id:'points'}).encodeX({field:'x',scale:{domain:[0,10],nice:false}}).encodeY({field:'y',scale:{domain:[0,10],nice:false}}).selectMarks({id:'picked',items:[],empty:'none'});
const target=p=>p.reviseData({source:'rows',id:'next',values:[{id:'a',x:9,y:9}]});
const binding={type:'keyboard',targets:[{target:'points',activation:{type:'select',selection:'picked'}}]};
const options={durationMs:100,easing:'linear'};
export const cases=[
 {id:'interaction-animation/native-frame-four-formats',async run(){
  assert.match(import.meta.resolve('ggaction/interaction'),/\/node_modules\/ggaction\//);
  const p=source(),frame=sampleTransition(planTransition({from:p,to:target(p),options}),50),s=createInteractionSession({program:p,bindings:[binding]});
  s.dispatch({type:'frame',frame,version:1,generation:0});s.dispatch({type:'focus',move:'first'});assert.deepEqual(s.getState().focus.screenPoint,{x:120,y:90});
  s.dispatch({type:'inspect',point:s.getState().focus.screenPoint,slop:0});assert.equal(s.getState().hit.target.itemKey,getMarkItems(p)[0].key);
  const canvas=createCanvas(240,180);render(s.getState().animationFrame,canvas.getContext('2d'));assert.deepEqual([...canvas.getContext('2d').getImageData(120,90,1,1).data],[76,120,168,255]);
  const png=await loadImage((await renderToPNGBuffer(frame)).buffer);canvas.getContext('2d').clearRect(0,0,240,180);canvas.getContext('2d').drawImage(png,0,0);assert.deepEqual([...canvas.getContext('2d').getImageData(120,90,1,1).data],[76,120,168,255]);
  assert.match(renderToSVG(frame),/<circle[^>]*cx="120"/);assert.equal(Buffer.from((await renderToPDFBuffer(frame)).buffer).subarray(0,4).toString(),'%PDF');
  s.dispatch({type:'activate'});assert.equal(s.getState().history.undoCount,1);assert.equal(s.getState().animationFrame,null);s.destroy();
 }},
 {id:'interaction-animation/player-frame-leases',async run(){
  const p=source();let version=0,prepared=0,released=0;
  const s=createInteractionSession({program:p,bindings:[binding],async assetResolver({program,frame,signal}){const images=await prepareImageRendering(frame??program,{signal,decode(){throw Error('Unexpected image');}});prepared++;return{images,dispose(){released++;}};}});
  await s.whenSettled();s.dispatch({type:'focus',move:'first'});
  const player=createAnimationPlayer({plan:planTransition({from:target(p),to:p,options}),clock:{now:()=>0,requestFrame(){throw Error('Paused player');},cancelFrame(){}},render(frame){s.dispatch({type:'frame',frame,version:++version,generation:0});}});
  player.seek(50);await s.whenSettled();
  for(let i=0;i<100;i++){const current=player.getFrame();player.interrupt({to:p,options});assert.equal(player.getFrame(),current);player.seek(50);await s.whenSettled();assert.equal(s.getState().animationFrame,player.getFrame());assert.equal(prepared-released,2);assert.ok(s.getState().focus.screenPoint);}
  const state=s.getState();assert.equal(state.program,p);assert.equal(state.history.undoCount,0);assert.ok(state.frameAssets.images);
  assert.throws(()=>s.dispatch({type:'frame',frame:structuredClone(player.getFrame()),version:++version,generation:0}),/authentic/);assert.equal(s.getState(),state);
  player.dispose();s.destroy();assert.equal(prepared,released);
 }},
 {id:'interaction-animation/fresh-offline-native-scope',run(){
  const child=spawnSync(process.execPath,['--input-type=module','-e',`
   import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import{syncBuiltinESMExports}from'node:module';
   let network=0;const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;for(const m of[http,https]){m.get=deny;m.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
   const{deserializeProgram}=await import('ggaction/persistence'),{planTransition,sampleTransition,serializeAnimation,deserializeAnimation}=await import('ggaction/animation'),{createInteractionSession}=await import('ggaction/interaction');
   let text='';for await(const chunk of process.stdin)text+=chunk;const p=deserializeProgram(text),to=p.reviseData({source:'rows',id:'next',values:[{id:'a',x:9,y:9}]}),plan=planTransition({from:p,to,options:{durationMs:100,easing:'linear'}}),frame=sampleTransition(plan,50),s=createInteractionSession({program:p});
   const offline=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);
   s.dispatch({type:'frame',frame,version:1,generation:0});s.dispatch({type:'inspect',point:{x:120,y:90},slop:0});let rejected=false;try{s.dispatch({type:'frame',frame:offline,version:2,generation:0});}catch(e){rejected=/native endpoint metadata/.test(e.message);}
   console.log(JSON.stringify({network,rejected,sameScene:JSON.stringify(frame.scene)===JSON.stringify(offline.scene),hit:!!s.getState().hit.target,version:s.getState().frameVersion}));s.destroy();
  `],{input:serializeProgram(source()),encoding:'utf8',timeout:30000});
  assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{network:0,rejected:true,sameScene:true,hit:true,version:1});
 }}
];

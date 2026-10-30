import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {inflateSync} from 'node:zlib';
import {chart,render,prepareImageRendering} from 'ggaction';
import {planTransition,sampleTransition,createAnimationPlayer} from 'ggaction/animation';
import {createInteractionSession} from 'ggaction/interaction';
import {getMarkItems} from 'ggaction/inspection';
import {serializeProgram,deserializeProgram} from 'ggaction/persistence';
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
 }},
 {id:'interaction-animation/geographic-projection-membership',run(){
  const data=codes=>({type:'FeatureCollection',features:codes.map(code=>({type:'Feature',properties:{code},geometry:{type:'Point',coordinates:code==='front'?[0,0]:[180,0]}}))});
  const p=chart().createCanvas({width:240,height:180,margin:0})
   .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:['properties','code'],values:data(['front','back'])})
   .createProjection({id:'map',type:'orthographic',scalePx:70,translatePx:[120,90]}).createCoordinate({id:'geo',type:'geo'}).createGeoPointMark({id:'places',radiusPx:10});
  const key=getMarkItems(p.editProjection({rotateDeg:[180,0]}))[0].key,chosen=p.selectMarks({id:'picked',target:'places',items:[key],empty:'none'});
  const intent=value=>value.semanticSpec.resources.find(resource=>resource.id==='picked').options.itemKeys;
  const s=createInteractionSession({program:chosen,selectionPolicy:'drop'}),events=[];s.subscribe(event=>events.push(event));
  s.dispatch({type:'setViewport',target:'map',payload:{rotateDeg:[90,0]}});
  assert.deepEqual(intent(s.getState().program),[key]);assert.deepEqual(events.at(-1).selectionChanges,[]);assert.equal(s.getState().history.undoCount,1);
  const restored=deserializeProgram(serializeProgram(s.getState().program));assert.deepEqual(intent(restored),[key]);
  assert.deepEqual(getMarkItems(restored.editProjection({rotateDeg:[180,0]})).map(item=>item.key),[key]);
  s.updateProgram(restored.editGeometryData({target:'world',values:data(['front'])}));
  assert.deepEqual(intent(s.getState().program),[]);assert.deepEqual(events.at(-1).selectionChanges[0].droppedKeys,[key]);
  assert.deepEqual(intent(chosen),[key]);s.destroy();
 }},
 {id:'interaction-animation/current-graph-drag-four-formats',async run(){
  const p=chart().createCanvas({width:300,height:200,margin:0})
   .createData({id:'nodes',keyField:'id',values:[{id:'a'},{id:'b'}]})
   .createData({id:'edges',values:[{id:'ab',from:'a',to:'b'}]})
   .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'from',target:'to',directed:true})
   .layoutGraph({id:'layout',method:'fixed',options:{positions:[{key:'a',x:40,y:60},{key:'b',x:200,y:60}]}})
   .createGraphPlot({id:'plot',origin:[0,0],nodes:{radius:10,fill:'red',stroke:'none',strokeWidth:0},edges:{stroke:'black',strokeWidth:4}})
   .bundleGraphEdges({id:'routes',method:'edge-path'}).editGraphPlot({routes:'routes'});
  const to=p.editLayout({options:{positions:[{key:'a',x:60,y:100},{key:'b',x:220,y:100}]}}),frame=sampleTransition(planTransition({from:p,to,options}),50);
  const s=createInteractionSession({program:p,bindings:[{type:'moveNode',target:'plot'}]}),listeners=new Map(),pending=new Map(),captures=new Set();let seq=0;
  const host={getBoundingClientRect:()=>({left:0,top:0,width:300,height:200}),addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),
   setPointerCapture:k=>captures.add(k),releasePointerCapture:k=>captures.delete(k),hasPointerCapture:k=>captures.has(k),requestAnimationFrame:f=>(pending.set(++seq,f),seq),cancelAnimationFrame:k=>pending.delete(k)};
  const fire=(type,x,y)=>listeners.get(type)({pointerId:1,pointerType:'mouse',clientX:x,clientY:y});s.mount(host);
  s.dispatch({type:'frame',frame,version:s.getState().frameVersion+1,generation:0});fire('pointerdown',50,80);fire('pointermove',80,120);for(const fn of pending.values())fn();pending.clear();
  const preview=s.getState().previewFrame,expected=p.editLayout({options:{positions:[{key:'a',x:80,y:120},{key:'b',x:210,y:80}]}});
  assert.equal(s.getState().program,p);assert.equal(s.getState().animationFrame,frame);assert.equal(s.getState().history.undoCount,0);
  const canvas=createCanvas(1,1);render(preview,canvas.getContext('2d'));assert.deepEqual([...canvas.getContext('2d').getImageData(80,120,1,1).data],[255,0,0,255]);
  const png=await renderToPNGBuffer(preview),nativePNG=await renderToPNGBuffer(expected);assert.deepEqual(png.buffer,nativePNG.buffer);
  const image=await loadImage(png.buffer),copy=createCanvas(300,200);copy.getContext('2d').drawImage(image,0,0);assert.deepEqual(copy.getContext('2d').getImageData(0,0,300,200).data,canvas.getContext('2d').getImageData(0,0,300,200).data);
  const svg=renderToSVG(preview);assert.match(svg,/<circle[^>]*cx="80"[^>]*cy="120"/);assert.match(svg,/<circle[^>]*cx="210"[^>]*cy="80"/);
  const streams=buffer=>[...buffer.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match=>{const bytes=Buffer.from(match[1],'latin1');try{return inflateSync(bytes).toString('latin1');}catch{return bytes.toString('latin1');}});
  const pdf=await renderToPDFBuffer(preview),nativePDF=await renderToPDFBuffer(expected);assert.ok(streams(pdf.buffer).length);assert.deepEqual(streams(pdf.buffer),streams(nativePDF.buffer));assert.doesNotMatch(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image/);
  fire('pointerup',80,120);assert.deepEqual(s.getState().program.graphicSpec,expected.graphicSpec);assert.equal(s.getState().history.undoCount,1);
  s.dispatch({type:'undo'});assert.equal(s.getState().program,p);s.dispatch({type:'redo'});assert.deepEqual(deserializeProgram(serializeProgram(s.getState().program)).graphicSpec,expected.graphicSpec);
  assert.equal(sampleTransition(planTransition({from:preview,to:s.getState().program,options}),0),preview);s.destroy();assert.equal(captures.size,0);assert.equal(listeners.size,0);
 }}
];

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {inflateSync} from 'node:zlib';
import {chart,render,prepareImageRendering} from 'ggaction';
import {planTransition,sampleTransition,createAnimationPlayer} from 'ggaction/animation';
import {createInteractionSession} from 'ggaction/interaction';
import {getMarkItems} from 'ggaction/inspection';
import {createTransitionScene} from 'ggaction/scene';
import {serializeProgram,deserializeProgram} from 'ggaction/persistence';
import {renderToSVG} from 'ggaction/svg';
import {renderToPNGBuffer} from 'ggaction/png';
import {renderToPDFBuffer} from 'ggaction/pdf';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const source=()=>chart().createCanvas({width:240,height:180,margin:20}).createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:1}]}).createPointMark({id:'points'}).encodeX({field:'x',scale:{domain:[0,10],nice:false}}).encodeY({field:'y',scale:{domain:[0,10],nice:false}}).selectMarks({id:'picked',items:[],empty:'none'});
const target=p=>p.reviseData({source:'rows',id:'next',values:[{id:'a',x:9,y:9}]});
const binding={type:'keyboard',targets:[{target:'points',activation:{type:'select',selection:'picked'}}]};
const options={durationMs:100,easing:'linear'};

function bundledPair(method){
 let p=chart().createCanvas({width:400,height:300,margin:0});
 if(method==='hierarchical')p=p.createData({id:'tree',values:[{key:'root',parent:null,value:0},{key:'a',parent:'root',value:1},{key:'b',parent:'root',value:1}]})
  .createHierarchyData({id:'hierarchy',data:'tree',key:'key',parent:'parent',value:'value'})
  .layoutHierarchy({id:'tree-layout',method:'tree',options:{nodeSize:[10,10],siblingGap:20,depthGap:50,orientation:'vertical'}});
 const positions=method==='hierarchical'?[{key:'a',x:-15,y:60},{key:'b',x:15,y:60}]:[{key:'a',x:40,y:60},{key:'b',x:240,y:60}];
 const origin=method==='hierarchical'?[140,50]:[0,0];
 p=p.createData({id:'nodes',keyField:'id',values:[{id:'a'},{id:'b'}]})
  .createData({id:'edges',keyField:'id',values:[{id:'one',from:'a',to:'b'},{id:'two',from:'a',to:'b'}]})
  .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'from',target:'to',directed:true})
  .layoutGraph({id:'layout',graph:'graph',method:'fixed',options:{positions}})
  .bundleGraphEdges({id:'routes',graph:'graph',layout:'layout',method,...(method==='hierarchical'?{options:{hierarchy:'hierarchy',hierarchyLayout:'tree-layout',mapping:[{nodeKey:'a',hierarchyKey:'a'},{nodeKey:'b',hierarchyKey:'b'}]}}:{})})
  .createGraphPlot({id:'plot',layout:'layout',routes:'routes',origin,nodes:{radius:2},edges:{stroke:'black',strokeWidth:3}})
  .selectMarks({id:'picked',target:'plot',items:[],empty:'none'});
 return {from:p,to:p.editGraphPlot({origin:[origin[0]+40,origin[1]+20]}),origin};
}
const routeResource=p=>p.semanticSpec.resources.find(resource=>resource.kind==='edge-route');
const closedClock={now:()=>0,requestFrame(){throw Error('Paused route player requested a callback');},cancelFrame(){}};

export const cases=[
 {id:'interaction-animation/four-route-player-lifecycle',async run(){
  for(const method of ['hierarchical','force-directed','density','edge-path']){
   const {from,to,origin}=bundledPair(method),saved=serializeProgram(from),keys=getMarkItems(from,{target:'plot'}).filter(item=>item.fields.kind==='edge').map(item=>item.key);
   const s=createInteractionSession({program:from,bindings:[{type:'keyboard',targets:[{target:'plot',activation:{type:'select',selection:'picked'}}]}]});
   const player=createAnimationPlayer({plan:planTransition({from,to,options}),clock:closedClock,render(frame){s.dispatch({type:'frame',frame,version:s.getState().frameVersion+1,generation:s.getState().generation});}});
   for(const time of [25,50,75]){
    player.seek(time);const frame=player.getFrame(),expected=from.editGraphPlot({origin:[origin[0]+40*time/100,origin[1]+20*time/100]});
    assert.deepEqual(frame.scene,createTransitionScene(expected,{format:'canvas'}),method);
    s.dispatch({type:'focus',target:'plot',itemKey:keys[0]});s.dispatch({type:'inspect',point:s.getState().focus.screenPoint,slop:0});
    assert.ok(s.getState().hit.candidates.some(item=>item.itemKey===keys[0]),method);assert.equal(new Set(s.getState().hit.candidates.map(item=>item.itemKey)).size,s.getState().hit.candidates.length);
   }
   const current=player.getFrame(),finished=player.finished;player.interrupt({to:from,options});assert.equal(player.getFrame(),current);assert.equal((await finished).reason,'interrupted');
   player.seek(50);assert.deepEqual(player.getFrame().scene,createTransitionScene(from.editGraphPlot({origin:[origin[0]+15,origin[1]+7.5]}),{format:'canvas'}),method);
   s.dispatch({type:'focus',target:'plot',itemKey:keys[0]});s.dispatch({type:'unbundleEdge',target:'plot',itemKey:keys[0]});assert.ok(s.getState().previewFrame);assert.equal(s.getState().history.undoCount,0);
   player.seek(75);assert.equal(s.getState().previewFrame,null);assert.equal(s.getState().animationFrame,player.getFrame());
   s.dispatch({type:'focus',target:'plot',itemKey:keys[0]});s.dispatch({type:'activate'});const chosen=s.getState().program;assert.equal(s.getState().history.undoCount,1);
   const revised=chosen.reviseData({source:'edges',id:'edges-next',values:[{id:'two',from:'a',to:'b'},{id:'one',from:'a',to:'b'}]});
   assert.equal(routeResource(revised).revision,1);assert.deepEqual(new Set(getMarkItems(revised,{target:'plot'}).filter(item=>item.fields.kind==='edge').map(item=>item.key)),new Set(keys));
   const generation=s.getState().generation;s.updateProgram(revised);const stable=s.getState();let reads=0;
   assert.equal(s.dispatch({type:'frame',frame:new Proxy({},{get(){reads++;throw Error('Stale payload read');}}),version:stable.frameVersion+1,generation}).status,'stale');assert.equal(reads,0);assert.equal(s.getState(),stable);
   const fresh=sampleTransition(planTransition({from:revised,to:revised.editGraphPlot({origin:[origin[0]+20,origin[1]+10]}),options}),50);
   s.dispatch({type:'frame',frame:fresh,version:stable.frameVersion+1,generation:stable.generation});s.dispatch({type:'focus',target:'plot',itemKey:keys[0]});
   s.dispatch({type:'inspect',point:s.getState().focus.screenPoint,slop:0});assert.ok(s.getState().hit.candidates.some(item=>item.itemKey===keys[0]&&item.resourceRefs.some(ref=>ref.kind==='edge-route'&&ref.revision===1)));
   assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec,revised.graphicSpec);assert.equal(serializeProgram(from),saved);
   player.dispose();s.destroy();
  }
 }},
 {id:'interaction-animation/geographic-route-seam-current-hit',async run(){
  const make=(type,rotateDeg,clipExtentPx,coordinates=[[170,0],[-170,0]],interpolation='source-segment')=>chart().createCanvas({width:400,height:300,margin:0})
   .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:['properties','id'],values:{type:'FeatureCollection',features:[{type:'Feature',properties:{id:'route'},geometry:{type:'LineString',coordinates}}]}})
   .createProjection({id:'map',type,rotateDeg,scalePx:50,translatePx:[200,150],clipExtentPx})
   .createCoordinate({type:'geo'}).createGeoLineMark({id:'route',strokeWidth:4,interpolation}).selectMarks({id:'picked',target:'route',items:[],empty:'none'});
  for(const clipped of [false,true]){
   const from=make('equirectangular',[-20,0,0],clipped?[[200,0],[400,300]]:[[0,0],[400,300]]),to=from.editProjection({rotateDeg:[20,0,0]}),key=getMarkItems(from,{target:'route'})[0].key;
   const s=createInteractionSession({program:from,bindings:[{type:'keyboard',targets:[{target:'route',activation:{type:'select',selection:'picked'}}]}]});
   const player=createAnimationPlayer({plan:planTransition({from,to,options}),clock:closedClock,render(frame){s.dispatch({type:'frame',frame,version:s.getState().frameVersion+1,generation:s.getState().generation});}});player.seek(50);
   assert.deepEqual(player.getFrame().scene,createTransitionScene(from.editProjection({rotateDeg:[0,0,0]}),{format:'canvas'}));
   for(const [x,count] of [[353,1],[47,clipped?0:1],[200,0]]){s.dispatch({type:'inspect',point:{x,y:150},slop:0});assert.equal(s.getState().hit.candidates.length,count);if(count)assert.equal(s.getState().hit.target.itemKey,key);}
   s.dispatch({type:'focus',target:'route',itemKey:key});const current=player.getFrame();player.interrupt({to:from,options});assert.equal(player.getFrame(),current);player.seek(25);
   assert.deepEqual(player.getFrame().scene,createTransitionScene(from.editProjection({rotateDeg:[-5,0,0]}),{format:'canvas'}));
   s.dispatch({type:'activate'});assert.equal(s.getState().history.undoCount,1);s.dispatch({type:'undo'});assert.equal(s.getState().program,from);player.dispose();s.destroy();
  }
  const hidden=make('orthographic',[0,0,0],[[0,0],[400,300]]),visible=hidden.editProjection({rotateDeg:[180,0,0]}),s=createInteractionSession({program:hidden});
  const plan=planTransition({from:hidden,to:visible,options});
  s.dispatch({type:'frame',frame:sampleTransition(plan,0),version:1,generation:0});s.dispatch({type:'inspect',point:{x:200,y:150},slop:0});assert.equal(s.getState().hit.candidates.length,0);
  s.dispatch({type:'frame',frame:sampleTransition(plan,100),version:2,generation:0});s.dispatch({type:'inspect',point:{x:200,y:150},slop:0});assert.equal(s.getState().hit.candidates.length,1);s.destroy();
  for(const interpolation of ['source-segment','great-circle']){
   const arc=make('equirectangular',[-10,0,0],[[0,0],[400,300]],[[-45,45],[45,45]],interpolation),arcSession=createInteractionSession({program:arc});
   const arcFrame=sampleTransition(planTransition({from:arc,to:arc.editProjection({rotateDeg:[10,0,0]}),options}),50);arcSession.dispatch({type:'frame',frame:arcFrame,version:1,generation:0});
   // The great-circle midpoint is atan(sqrt(2)) north; source-segment preserves latitude pi/4.
   for(const [latitude,kind] of [[Math.atan(Math.SQRT2),'great-circle'],[Math.PI/4,'source-segment']]){arcSession.dispatch({type:'inspect',point:{x:200,y:150-50*latitude},slop:0});assert.equal(arcSession.getState().hit.candidates.length,interpolation===kind?1:0);}
   arcSession.destroy();
  }
 }},

 {id:'interaction-animation/overlapping-edge-four-formats',async run(){
  const plain=chart().createCanvas({width:300,height:200,margin:0})
   .createData({id:'nodes',keyField:'id',values:[{id:'a'},{id:'b'}]})
   .createData({id:'edges',values:[{id:'one',from:'a',to:'b'},{id:'two',from:'a',to:'b'}]})
   .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'from',target:'to',directed:true})
   .layoutGraph({id:'layout',method:'fixed',options:{positions:[{key:'a',x:40,y:80},{key:'b',x:240,y:80}]}})
   .createGraphPlot({id:'plot',origin:[0,0],nodes:{radius:10},edges:{stroke:'black',strokeWidth:4,parallelGap:24}});
  const p=plain.bundleGraphEdges({id:'routes',method:'edge-path'}).editGraphPlot({routes:'routes'}).selectMarks({id:'picked',items:[],empty:'none'});
  const before=serializeProgram(p),keys=getMarkItems(p).filter(item=>item.fields.kind==='edge').map(item=>item.key);
  const streams=buffer=>[...buffer.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match=>{const bytes=Buffer.from(match[1],'latin1');try{return inflateSync(bytes).toString('latin1');}catch{return bytes.toString('latin1');}});
  for(const animated of [false,true]){
   const s=createInteractionSession({program:p,bindings:[{type:'keyboard',targets:[{target:'plot',activation:{type:'select',selection:'picked'}}]}]});
   const positions=[{key:'a',x:50,y:100},{key:'b',x:250,y:100}];
   if(animated){const to=p.editLayout({options:{positions:[{key:'a',x:60,y:120},{key:'b',x:260,y:120}]}});const frame=sampleTransition(planTransition({from:p,to,options}),50);s.dispatch({type:'frame',frame,version:1,generation:0});}
   const baseline=s.getState().scene;s.dispatch({type:'inspect',point:{x:animated?150:140,y:animated?100:80},slop:0});
   const order=s.getState().hit.candidates.map(item=>item.itemKey);assert.deepEqual(new Set(order),new Set(keys));
   s.dispatch({type:'focus',move:'nextCandidate'});assert.equal(s.getState().focus.itemKey,order[0]);
   s.dispatch({type:'unbundleEdge',target:'plot',itemKey:order[0]});const preview=s.getState().previewFrame;assert.ok(preview);
   const native=animated?plain.editLayout({options:{positions}}):plain,routed=animated?p.editLayout({options:{positions}}):p;
   const expected={graphicSpec:structuredClone(routed.graphicSpec)};
   const actualItems=expected.graphicSpec.objects.plot.items;
   for(const item of actualItems)if(item.identity.key===order[0])item.properties.commands=native.graphicSpec.objects.plot.items.find(n=>n.identity.key===order[0]&&n.identity.role===item.identity.role).properties.commands;
   assert.equal(actualItems.filter(item=>item.identity.key===order[0]).length,2);
   const canvas=createCanvas(1,1);render(preview,canvas.getContext('2d'));const png=await renderToPNGBuffer(preview),expectedPNG=await renderToPNGBuffer(expected);assert.deepEqual(png.buffer,expectedPNG.buffer);
   const image=await loadImage(png.buffer),copy=createCanvas(300,200);copy.getContext('2d').drawImage(image,0,0);assert.deepEqual(copy.getContext('2d').getImageData(0,0,300,200).data,canvas.getContext('2d').getImageData(0,0,300,200).data);
   const paths=svg=>[...svg.matchAll(/<path[^>]*\sd="([^"]*)"/g)].map(match=>match[1]);assert.deepEqual(paths(renderToSVG(preview)),paths(renderToSVG(expected)));assert.equal(paths(renderToSVG(preview)).length,4);
   const pdf=await renderToPDFBuffer(preview),expectedPDF=await renderToPDFBuffer(expected);assert.deepEqual(streams(pdf.buffer),streams(expectedPDF.buffer));assert.doesNotMatch(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image/);
   assert.equal(s.getState().program,p);assert.equal(s.getState().history.undoCount,0);assert.equal(serializeProgram(p),before);
   s.dispatch({type:'focus',move:'nextCandidate'});assert.equal(s.getState().previewFrame,null);assert.deepEqual(s.getState().scene,baseline);assert.equal(s.getState().focus.itemKey,order[1]);
   s.dispatch({type:'activate'});assert.equal(s.getState().history.undoCount,1);assert.deepEqual(s.getState().program.semanticSpec.resources.find(r=>r.id==='picked').options.itemKeys,[order[1]]);
   s.dispatch({type:'undo'});assert.equal(s.getState().program,p);s.destroy();
  }
 }},

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
 {id:'interaction-animation/geographic-label-source-lifecycle',run(){
  const data=codes=>({type:'FeatureCollection',features:codes.map(code=>({type:'Feature',properties:{code},geometry:{type:'Point',coordinates:code==='front'?[0,0]:[180,0]}}))});
  const p=chart().createCanvas({width:240,height:180,margin:0})
   .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:['properties','code'],values:data(['front','back'])})
   .createProjection({id:'map',type:'orthographic',scalePx:70,translatePx:[120,90]}).createCoordinate({id:'geo',type:'geo'}).createGeoPointMark({id:'places',radiusPx:10})
   .createMarkLabels({source:'places',id:'names',field:'code'});
  const key=getMarkItems(p.editProjection({rotateDeg:[180,0]}),{target:'names'})[0].key;
  const chosen=p.selectMarks({id:'picked',target:'names',items:[key],empty:'none'}),intent=value=>value.semanticSpec.resources.find(resource=>resource.id==='picked').options.itemKeys;
  const s=createInteractionSession({program:chosen,selectionPolicy:'drop'}),events=[];s.subscribe(event=>events.push(event));
  s.dispatch({type:'setViewport',target:'map',payload:{rotateDeg:[90,0]}});
  assert.deepEqual(intent(s.getState().program),[key]);assert.deepEqual(events.at(-1).selectionChanges,[]);assert.equal(s.getState().history.undoCount,1);
  const restored=deserializeProgram(serializeProgram(s.getState().program));assert.deepEqual(intent(restored),[key]);
  assert.deepEqual(getMarkItems(restored.editProjection({rotateDeg:[180,0]}),{target:'names'}).map(item=>item.key),[key]);
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

import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { chart, prepareImageRendering, prepareFontResource, prepareTextMetrics, prepareFontRendering, prepareShadowRendering, render } from "../../src/index.js";
import { getProjectionView } from "../../src/inspection.js";
import { createInteractionSession } from "../../src/interaction.js";
import { nativeFontRegistrar } from "../../src/renderers/nativeBackend.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";

const tick = () => new Promise(resolve => setImmediate(resolve));
function program() {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#008000"/></svg>');
  const image = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml", byteLength: bytes.length,
    width: 2, height: 2, payload: { encoding: "base64", data: bytes.toString("base64") } };
  let p = chart().createCanvas({width:200,height:160,margin:0})
    .createGeometryData({id:"places",format:"geojson",coordinateKind:"planar",featureKey:"id",values:{type:"Feature",id:"a",properties:{},geometry:{type:"Point",coordinates:[80,90]}}})
    .createProjection({id:"map",type:"identity"}).createCoordinate({type:"geo"}).createGeoPointMark({id:"places"})
    .createGraphics({id:"picture",type:"image",parent:"plot-main"});
  for (const [property,value] of Object.entries({image,x:2,y:2,width:12,height:12})) p=p.editGraphics({target:"picture",property,value});
  return p;
}
function host() {
  const listeners=new Map(),frames=new Map(),captures=new Set(); let next=0;
  return {listeners,frames,captures,addEventListener(type,fn){const set=listeners.get(type)??new Set();set.add(fn);listeners.set(type,set);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    getBoundingClientRect:()=>({left:0,top:0,width:200,height:160}),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id),
    requestAnimationFrame:fn=>(frames.set(++next,fn),next),cancelAnimationFrame:id=>frames.delete(id),flush(){const work=[...frames.values()];frames.clear();for(const fn of work)fn();},
    fire(type,x=80,y=90,extra={}){for(const fn of [...listeners.get(type)??[]])fn({clientX:x,clientY:y,pointerId:1,pointerType:"mouse",button:0,preventDefault(){},...extra});}};
}
function session(p,assetResolver) { const s=createInteractionSession({program:p,assetResolver,bindings:[{type:"navigate",target:"map",mode:"pan",scaleExtent:[0.5,8],initial:getProjectionView(p,{target:"map"}).parameters}]}),h=host();s.mount(h);return {s,h}; }
const decode = async ({bytes}) => { const image=await loadImage(bytes);return {image,width:image.width,height:image.height,originClean:true}; };
const xy = s => {const p=s.getState().scene.nodes.find(n=>n.type==="circle").properties;return [p.x,p.y];};

test("authentic image previews publish exact handles with their frame and preserve committed handles",async()=>{
  const p=program(),calls=[],disposed=[],{s,h}=session(p,async request=>{
    calls.push(request);const images=await prepareImageRendering(request.program,{decode,signal:request.signal});
    return {images,dispose(){disposed.push(request.program);}};
  });
  await s.whenSettled();const committed=s.getState().assets;
  h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();
  assert.equal(s.getState().previewProgram,null);assert.deepEqual(xy(s),[80,90]);
  await s.whenSettled();const state=s.getState();
  assert.notEqual(state.previewAssets,null);assert.notEqual(state.previewProgram,null);assert.equal(state.program,p);assert.equal(state.assets,committed);assert.deepEqual(xy(s),[100,90]);
  const canvas=createCanvas(1,1),context=canvas.getContext("2d");
  assert.throws(()=>render(state.previewProgram,context,committed),/different|changed/);
  render(state.previewProgram,context,state.previewAssets);assert.deepEqual([...context.getImageData(5,5,1,1).data],[0,128,0,255]);
  h.fire("keydown",0,0,{key:"Escape"});assert.equal(s.getState().previewProgram,null);assert.equal(s.getState().previewAssets,null);assert.deepEqual(xy(s),[80,90]);assert.equal(calls[1].signal.aborted,true);
  render(p,context,s.getState().assets);assert.deepEqual([...context.getImageData(5,5,1,1).data],[0,128,0,255]);
  assert.equal(disposed.length,1);s.destroy();assert.equal(disposed.length,2);
});

function controlled() {
  const calls=[],events=[],disposed=[],p=program();
  const {s,h}=session(p,request=>new Promise((resolve,reject)=>calls.push({request,resolve,reject})));
  s.subscribe(e=>events.push(e));
  const lease=name=>({dispose(){disposed.push(name);}});
  return {s,h,p,calls,events,disposed,lease};
}
async function initial(c) {await tick();c.calls[0].resolve(c.lease("initial"));await c.s.whenSettled();}

test("initial preparation remains active until a reversible committed baseline is ready",async()=>{
  const c=controlled();c.h.fire("pointerdown");assert.equal(c.h.captures.size,0);await tick();assert.equal(c.calls[0].request.signal.aborted,false);
  c.calls[0].resolve(c.lease("initial"));await c.s.whenSettled();c.h.fire("pointerdown");assert.equal(c.h.captures.size,1);c.s.destroy();
});

test("new preview results atomically replace accepted frames and stale leases cannot overwrite them",async()=>{
  const c=controlled(),{s,h}=c;await initial(c);h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();const first=s.whenSettled();await tick();
  c.calls[1].resolve(c.lease("first"));await first;const accepted=s.getState();assert.deepEqual(xy(s),[100,90]);
  h.fire("pointermove",110,90);h.flush();const stale=s.whenSettled();await tick();assert.equal(s.getState().previewProgram,accepted.previewProgram);assert.equal(s.getState().previewAssets,accepted.previewAssets);
  h.fire("pointermove",120,90);h.flush();const latest=s.whenSettled();await tick();assert.equal((await stale).status,"cancelled");assert.equal(c.calls[2].request.signal.aborted,true);
  c.calls[3].resolve(c.lease("latest"));await latest;assert.deepEqual(xy(s),[120,90]);assert.deepEqual(c.disposed,["first"]);
  const state=s.getState();c.calls[2].resolve(c.lease("late"));await tick();assert.equal(s.getState(),state);assert.deepEqual(c.disposed,["first","late"]);assert.equal(s.getState().revision,0);
  assert.deepEqual(c.events.filter(e=>e.phase).map(e=>e.phase),["preview","preview"]);s.destroy();assert.deepEqual(c.disposed,["first","late","latest","initial"]);
});

test("final up disposes a pending preview and only the separately prepared final candidate enters history",async()=>{
  const c=controlled(),{s,h,p}=c;await initial(c);h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();const old=s.whenSettled();await tick();
  h.fire("pointerup",130,90);const final=s.whenSettled();await tick();assert.equal((await old).status,"cancelled");assert.deepEqual(xy(s),[80,90]);assert.equal(s.getState().program,p);assert.equal(s.getState().previewAssets,null);
  assert.equal(c.calls.length,3);c.calls[1].resolve(c.lease("late"));await tick();assert.equal(s.getState().program,p);
  c.calls[2].resolve(c.lease("final"));assert.equal((await final).status,"settled");assert.deepEqual(xy(s),[130,90]);assert.equal(s.getState().history.undoCount,1);
  assert.deepEqual(c.events.filter(e=>e.phase).map(e=>e.phase),["commit","settled"]);assert.deepEqual(c.disposed,["late","initial"]);s.destroy();
});

test("failed preview preparation releases capture and reports one terminal error without committing",async()=>{
  for(const invalid of [false,true]){
    const c=controlled(),{s,h,p}=c;await initial(c);h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();await tick();
    if(invalid)c.calls[1].resolve({images:{},dispose(){c.disposed.push("invalid");}});else c.calls[1].reject(new Error("offline"));
    assert.equal((await s.whenSettled()).status,"error");assert.equal(s.getState().program,p);assert.equal(s.getState().previewAssets,null);assert.deepEqual(xy(s),[80,90]);assert.equal(h.captures.size,0);
    assert.deepEqual(c.events.filter(e=>e.phase).map(e=>e.phase),["error"]);s.destroy();
  }
});

test("every teardown path cancels preview preparation and releases a successful late lease once",async()=>{
  for(const reason of ["Escape","pointercancel","blur","remount","unmount","frame","update","destroy"]){
    const c=controlled(),{s,h,p}=c;await initial(c);const base=s.getState();h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();const pending=s.whenSettled();await tick();
    if(reason==="remount")s.mount(host());else if(reason==="unmount")s.mount(host())();else if(reason==="frame")s.dispatch({type:"frame",scene:base.scene,generation:base.generation,version:s.getState().frameVersion+1});else if(reason==="update")s.updateProgram(p);else if(reason==="destroy")s.destroy();else h.fire(reason==="Escape"?"keydown":reason,0,0,{key:"Escape"});
    assert.equal((await pending).status,"cancelled",reason);assert.equal(c.calls[1].request.signal.aborted,true);assert.equal(h.captures.size,0);assert.equal(h.frames.size,0);
    c.calls[1].resolve(c.lease("late"));await tick();assert.equal(c.disposed.filter(x=>x==="late").length,1);assert.equal(s.getState().previewProgram,null);assert.equal(s.getState().previewAssets,null);
    assert.equal(s.getState().program,p);assert.equal(s.getState().history.undoCount,0);s.destroy();
  }
});

test("throwing preview disposers preserve one cancellation and final cleanup",async()=>{
  const c=controlled(),{s,h}=c;await initial(c);h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();await tick();
  let count=0;c.calls[1].resolve({dispose(){count++;throw new Error("release failed");}});await s.whenSettled();
  assert.throws(()=>h.fire("keydown",0,0,{key:"Escape"}),/release failed/);assert.equal(count,1);assert.equal(h.captures.size,0);assert.equal(s.getState().previewAssets,null);assert.deepEqual(xy(s),[80,90]);
  assert.deepEqual(c.events.filter(e=>e.phase).map(e=>e.phase),["preview","cancel"]);s.destroy();assert.equal(count,1);
});

async function styledProgram() {
  const family="ggaction Metric Fixture",bytes=new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf",import.meta.url)));
  let p=program().createAnnotation({id:"note",space:"screen",x:40,y:40,text:"AB",fontFamily:family,fontSize:20,fill:"red",align:"left",baseline:"alphabetic",shadow:{color:"blue",offsetX:3,offsetY:2}});
  const provider={requestToken:"current",load:()=>({bytes,mimeType:"font/ttf"}),decode:q=>Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(k=>[k,q[k]])),
    measure:({asset,queries})=>({contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>[...text].reduce((sum,c)=>sum+({A:600,B:800}[c]??0),0)*fontSize/1000)})};
  const prepared=await prepareFontResource(p,{kind:"create",id:"font",uri:"fixture:font",expectedHash:createHash("sha256").update(bytes).digest("hex"),mimeType:"font/ttf",family,style:"normal",weight:400,metricsProviderVersion:"preview-fixture@1"},provider);
  p=p.createFontResource({prepared,requestToken:"current"});const {load,...metrics}=provider;void load;
  return p.applyTextMetrics({prepared:await prepareTextMetrics(p,{id:"exact",fonts:["font"]},metrics),requestToken:"current"});
}

test("exact font, shadow and image leases render prepared previews and restore original native pixels",async()=>{
  const p=await styledProgram(),leases=[];
  const {s,h}=session(p,async request=>{
    const fonts=await prepareFontRendering(request.program,{register:nativeFontRegistrar(GlobalFonts),signal:request.signal});let shadows;
    try {
      const images=await prepareImageRendering(request.program,{decode,signal:request.signal});shadows=await prepareShadowRendering(request.program,{createCanvas,decode,fonts,signal:request.signal});
      const lease={fonts,images,shadows,dispose(){shadows.dispose();fonts.dispose();}};leases.push({request,lease});return lease;
    } catch(error){shadows?.dispose();fonts.dispose();throw error;}
  });
  await s.whenSettled();const canvas=createCanvas(1,1),context=canvas.getContext("2d");render(p,context,s.getState().assets);const original=await canvas.encode("png"),glyph=context.getImageData(38,18,36,27).data.slice();
  assert.deepEqual([...context.getImageData(43,32,1,1).data],[255,0,0,255]);assert.ok(glyph.some((_,i)=>i%4===2&&glyph[i]===255&&glyph[i-2]===0));
  h.fire("pointerdown");h.fire("pointermove",110,90);h.flush();await s.whenSettled();const state=s.getState();
  render(state.previewProgram,context,state.previewAssets);assert.deepEqual(context.getImageData(38,18,36,27).data,glyph);assert.deepEqual(await canvas.encode("png"),(await renderToPNGBuffer(state.previewProgram)).buffer);
  assert.match(renderToSVG(state.previewProgram,{shadows:state.previewAssets.shadows}),/data:image\/png;base64/);
  assert.throws(()=>render(state.previewProgram,context,state.assets),/different|changed/);
  let abortState;leases[1].request.signal.addEventListener("abort",()=>{abortState=s.getState();});
  h.fire("keydown",0,0,{key:"Escape"});assert.equal(abortState.previewProgram,null);assert.equal(abortState.previewAssets,null);assert.equal(abortState.program,p);
  assert.throws(()=>render(state.previewProgram,context,state.previewAssets),/abort|disposed/i);render(p,context,s.getState().assets);assert.deepEqual(await canvas.encode("png"),original);
  s.destroy();assert.throws(()=>render(p,context,state.assets),/abort|disposed/i);
});

test("preview subscriber reentry cancels before a late callback can write after destroy",async()=>{
  const c=controlled(),{s,h}=c;await initial(c);let previews=0;
  s.subscribe(event=>{if(event.phase==="preview"){previews++;s.destroy();}});
  h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();await tick();c.calls[1].resolve(c.lease("preview"));await s.whenSettled();
  assert.equal(previews,1);assert.equal(s.getState().destroyed,true);assert.equal(s.getState().previewAssets,null);assert.equal(h.captures.size,0);assert.equal(h.frames.size,0);
  assert.ok([...h.listeners.values()].every(set=>set.size===0));assert.deepEqual(c.events.filter(e=>e.phase).map(e=>e.phase),["preview","cancel"]);assert.deepEqual(c.disposed,["preview","initial"]);
});

test("a preview subscriber exception with queued destroy remains terminal and releases both leases",async()=>{
  const c=controlled(),{s,h}=c;await initial(c);
  s.subscribe(event=>{if(event.phase==="preview"){s.destroy();throw new Error("preview observer failed");}});
  h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();await tick();c.calls[1].resolve(c.lease("preview"));
  await assert.rejects(s.whenSettled(),/preview observer failed/);assert.equal(s.getState().destroyed,true);assert.equal(h.captures.size,0);assert.equal(s.getState().previewAssets,null);assert.deepEqual(c.disposed,["preview","initial"]);
});

test("100 prepared gesture lifetimes release transient jobs and never publish late previews",async()=>{
  const p=program();let late=0,previews=0;
  for(let i=0;i<100;i++){
    const calls=[],{s,h}=session(p,q=>new Promise(resolve=>calls.push({q,resolve})));await tick();calls[0].resolve({dispose(){}});await s.whenSettled();
    s.subscribe(e=>{if(e.phase==="preview")previews++;});h.fire("pointerdown");h.fire("pointermove",100,90);h.flush();const pending=s.whenSettled();await tick();s.destroy();
    assert.equal((await pending).status,"cancelled");assert.equal(calls[1].q.signal.aborted,true);calls[1].resolve({dispose(){late++;}});await tick();
    assert.equal(s.getState().previewAssets,null);assert.equal(h.captures.size,0);assert.equal(h.frames.size,0);assert.ok([...h.listeners.values()].every(set=>set.size===0));assert.equal(s.destroy(),false);
  }
  assert.equal(late,100);assert.equal(previews,0);
});

test("annotation and region previews reuse the same exact image preparation and cancellation owner",async()=>{
  for(const kind of ["annotate","brush"]){
    let p=program();
    if(kind==="annotate")p=p.createAnnotation({id:"note",space:"screen",x:40,y:60,text:"Move",fontSize:20,align:"center",baseline:"middle"});
    else p=p.createData({id:"rows",values:[{x:50,y:60},{x:120,y:100}]}).createCoordinate({id:"cart",type:"cartesian"}).createPointMark({id:"points"}).encodeX({field:"x",scale:{domain:[0,200],range:[0,200]}}).encodeY({field:"y",scale:{domain:[0,160],range:[0,160]}}).selectMarks({id:"picked",items:[]});
    const binding=kind==="annotate"?{type:kind,target:"note"}:{type:kind,target:"points",selection:"picked"};let disposed=0;
    const s=createInteractionSession({program:p,bindings:[binding],async assetResolver(q){const images=await prepareImageRendering(q.program,{decode,signal:q.signal});return{images,dispose(){disposed++;}};}}),h=host();s.mount(h);await s.whenSettled();
    const start=kind==="annotate"?[40,60]:[40,50],end=kind==="annotate"?[60,70]:[65,75];h.fire("pointerdown",...start);h.fire("pointermove",...end);h.flush();await s.whenSettled();
    const state=s.getState();assert.notEqual(state.previewProgram,null);assert.notEqual(state.previewAssets,null);assert.equal(state.program,p);
    render(state.previewProgram,createCanvas(1,1).getContext("2d"),state.previewAssets);
    h.fire("keydown",0,0,{key:"Escape"});assert.equal(s.getState().previewProgram,null);assert.equal(s.getState().history.undoCount,0);assert.equal(disposed,1);s.destroy();assert.equal(disposed,2);
  }
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createCanvas,GlobalFonts } from "@napi-rs/canvas";
import { chart,prepareFontResource,prepareTextMetrics,prepareFontRendering,render } from "ggaction";
import { planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames } from "ggaction/animation";
import { createInteractionSession } from "ggaction/interaction";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

const bytes = Buffer.from("AAEAAAAKAIAAAwAgT1MvMkVARxsAAAEoAAAAYGNtYXAAVwOLAAABnAAAAERnbHlmD/fnfQAAAewAAABmaGVhZFmHpRQAAACsAAAANmhoZWEFegLCAAAA5AAAACRobXR4CGb/zgAAAYgAAAAUbG9jYQA0AFoAAAHgAAAADG1heHAABwAGAAABCAAAACBuYW1lpua8ewAAAlQAAAIQcG9zdOtXyAoAAARkAAAANgABAAAAAQAABrXagV8PPPUAAwPoAAAAAHwlsIAAAAAAfCWwgP84AAAC7gM0AAAAAwACAAAAAAAAAAEAAANS/2oAAAMg/zgAMgLuAAEAAAAAAAAAAAAAAAAAAAAFAAEAAAAFAAQAAQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwIaAZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAAAAAAAAAAAAAAAAPz8/PwAAACADAQNS/2oAAANSAJYAAAAAAAAAAAAAAAAAAAAgAAAB9AAyAPoAAAJYADIDIAAyAAD/OAAAAAIAAAADAAAAFAADAAEAAAAUAAQAMAAAAAgACAACAAAAIABCAwH//wAAACAAQQMB////4f/B/QMAAQAAAAAAAAAAAAAADQANABoAJwAzAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAACJgK8AAMAADMhESEyAfT+DAK8AAABADIAAALuArwAAwAAMyERITICvP1EArwAAAH/OALk/5wDNAADAAADMzUjyGRkAuRQAAAAAAAMAJYAAQAAAAAAAQAXAAAAAQAAAAAAAgAHABcAAQAAAAAAAwAZAB4AAQAAAAAABAAfADcAAQAAAAAABQALAFYAAQAAAAAABgAdAGEAAwABBAkAAQAuAH4AAwABBAkAAgAOAKwAAwABBAkAAwAyALoAAwABBAkABAA+AOwAAwABBAkABQAWASoAAwABBAkABgA6AUBnZ2FjdGlvbiBNZXRyaWMgRml4dHVyZVJlZ3VsYXJnZ2FjdGlvbi1tZXRyaWMtZml4dHVyZS0xZ2dhY3Rpb24gTWV0cmljIEZpeHR1cmUgUmVndWxhclZlcnNpb24gMS4wZ2dhY3Rpb25NZXRyaWNGaXh0dXJlLVJlZ3VsYXIAZwBnAGEAYwB0AGkAbwBuACAATQBlAHQAcgBpAGMAIABGAGkAeAB0AHUAcgBlAFIAZQBnAHUAbABhAHIAZwBnAGEAYwB0AGkAbwBuAC0AbQBlAHQAcgBpAGMALQBmAGkAeAB0AHUAcgBlAC0AMQBnAGcAYQBjAHQAaQBvAG4AIABNAGUAdAByAGkAYwAgAEYAaQB4AHQAdQByAGUAIABSAGUAZwB1AGwAYQByAFYAZQByAHMAaQBvAG4AIAAxAC4AMABnAGcAYQBjAHQAaQBvAG4ATQBlAHQAcgBpAGMARgBpAHgAdAB1AHIAZQAtAFIAZQBnAHUAbABhAHIAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAwAkACUBAglhY3V0ZWNvbWIAAA==", "base64");
const family="ggaction Metric Fixture",identity=value=>Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(key=>[key,value[key]]));
const hash=value=>createHash("sha256").update(value).digest("hex"),options={durationMs:100,easing:"linear"};
const register=request=>{const key=GlobalFonts.register(request.bytes,request.family);assert.ok(key);return{...identity(request),dispose(){assert.ok(GlobalFonts.remove(key));}};};
function picture(width=240,label="AB AB"){
  return chart().createCanvas({width,height:300,background:"transparent",margin:80,responsive:{minPlotSize:{width:40,height:40}}})
    .createData({id:"rows",keyField:"id",values:[{id:"a",x:0,y:0},{id:"b",x:2,y:2}]}).createPointMark({id:"points",opacity:0})
    .encodeX({field:"x",scale:{domain:[0,2],nice:false}}).encodeY({field:"y"})
    .createXAxis({line:false,title:false,ticksAndLabels:{values:[0,1,2],labels:{fontFamily:family,fontSize:20,fontWeight:400,color:"red",labelMap:[0,1,2].map(value=>({value,label})),responsive:{maxLines:2}}}});
}
async function prepared(){
  const p=picture(),requestToken="axis",font=await prepareFontResource(p,{kind:"create",id:"font",uri:"fixture:axis",expectedHash:hash(bytes),mimeType:"font/ttf",family,style:"normal",weight:400,metricsProviderVersion:"installed-axis@1"},{requestToken,load:()=>({bytes,mimeType:"font/ttf"}),decode:identity});
  const withFont=p.createFontResource({prepared:font,requestToken}),metrics=await prepareTextMetrics(withFont,{id:"metrics",fonts:["font"],axisLabelReflow:true},{requestToken,decode:identity,measure:({asset,queries})=>{
    const lease=register({...asset,bytes:Buffer.from(asset.payload.data,"base64")});try{const ctx=createCanvas(1,1).getContext("2d");return{contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>{ctx.font=`${asset.weight} ${fontSize}px "${asset.family}"`;return ctx.measureText(text).width;})};}finally{lease.dispose();}
  }});
  const from=withFont.applyTextMetrics({prepared:metrics,requestToken}),to=from.editCanvas({width:420}),plan=planTransition({from,to,options});
  return{from,to,plan,frame:sampleTransition(plan,50),native:from.editCanvas({width:330})};
}
export const cases=[
  {id:"animation-axis-reflow/current-native-fonts-four-renderers",async run(){
    const {from,to,plan,frame,native}=await prepared(),fonts=await prepareFontRendering(frame,{register});
    try{
      assert.equal(from.graphicSpec.objects.xAxisLabels.items.length,6);assert.equal(to.graphicSpec.objects.xAxisLabels.items.length,3);
      const lines=frame.scene.nodes.filter((node,index)=>frame.decisions[index]?.kernel==="native-axis-label");
      assert.deepEqual(lines.map(node=>[node.properties.text,node.properties.x,node.properties.y]),[["AB AB",80,238],["AB AB",165,238],["AB AB",250,238]]);
      const canvas=createCanvas(1,1);render(frame,canvas.getContext("2d"),{fonts});const png=(await renderToPNGBuffer(frame)).buffer;
      assert.deepEqual(png,await canvas.encode("png"));assert.deepEqual(png,(await renderToPNGBuffer(native)).buffer);
      assert.match(renderToSVG(frame),/@font-face/);assert.match((await renderToPDFBuffer(frame)).buffer.toString("latin1"),/\/ToUnicode/);
      assert.strictEqual(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.strictEqual(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
    }finally{fonts.dispose();}
  }},
  {id:"animation-axis-reflow/offline-fonts-network-free",async run(){
    const {plan,frame}=await prepared(),saved=serializeAnimation(plan),expected={scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash((await renderToPNGBuffer(frame)).buffer)};
    const child=spawnSync(process.execPath,["--input-type=module","-e",`
      import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import{syncBuiltinESMExports}from'node:module';
      let network=0;const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;for(const m of[http,https]){m.get=deny;m.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
      const{createHash}=await import('node:crypto'),{createCanvas,GlobalFonts}=await import('@napi-rs/canvas'),{prepareFontRendering,render}=await import('ggaction'),{deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png');
      let input='';for await(const chunk of process.stdin)input+=chunk;const frame=sampleTransition(deserializeAnimation(input).plan,50),hash=v=>createHash('sha256').update(v).digest('hex');let registered=0,removed=0;
      const fonts=await prepareFontRendering(frame,{register:r=>{const key=GlobalFonts.register(r.bytes,r.family);if(!key)throw Error('font');registered++;return{...Object.fromEntries(['contentHash','family','style','weight','metricsProviderVersion'].map(k=>[k,r[k]])),dispose(){if(!GlobalFonts.remove(key))throw Error('release');removed++;}};}});
      try{const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'),{fonts});const result={scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash((await renderToPNGBuffer(frame)).buffer),canvas:hash(await canvas.encode('png'))};fonts.dispose();console.log(JSON.stringify({result,network,registered,removed}));}finally{fonts.dispose();}
    `],{input:saved,encoding:"utf8",timeout:30000,maxBuffer:1024*1024});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{result:{...expected,canvas:expected.png},network:0,registered:1,removed:1});
    assert.deepEqual(sampleTransition(deserializeAnimation(saved).plan,50),frame);
  }},
  {id:"animation-axis-reflow/raw-current-hit-retime-rebase",async run(){
    const {from,to,plan,frame}=await prepared(),session=createInteractionSession({program:from});
    try{
      session.dispatch({type:"frame",frame,version:1,generation:session.getState().generation});session.dispatch({type:"inspect",point:{x:80,y:248},slop:0});
      assert.equal(session.getState().hit.target.role,"axis-tick");assert.equal(session.getState().hit.target.ownerId,"x");
      let current=frame;for(let i=0;i<12;i++){const next=planTransition({from:current,to:i%2?to:from,options});assert.strictEqual(sampleTransition(next,0),current);current=sampleTransition(next,35);}
      const next=planTransition({from:current,to,options});assert.deepEqual(exportAnimationFrames(deserializeAnimation(serializeAnimation(next)).plan,{timesMs:[0,25,50,100]}),exportAnimationFrames(next,{timesMs:[0,25,50,100]}));
      const empty=picture(240,""),emptyTo=empty.editCanvas({width:420}),track={target:{ownerKey:JSON.stringify([[],"x"])},property:"geometry",kernel:"native-progress",keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}]};
      const hidden=planTransition({from:empty,to:emptyTo,options:{...options,tracks:[track]}});assert.equal(sampleTransition(hidden,50).scene.nodes.filter(node=>node.type==="text").length,0);
      assert.deepEqual(exportAnimationFrames(deserializeAnimation(serializeAnimation(hidden)).plan,{timesMs:[25,50,75]}),exportAnimationFrames(hidden,{timesMs:[25,50,75]}));
      assert.throws(()=>planTransition({from:empty,to:emptyTo,options:{...options,tracks:[{...track,target:{ownerKey:JSON.stringify([[],"missing"])}}]}}),/no exact native owner/);
    }finally{session.destroy();}
  }}
];

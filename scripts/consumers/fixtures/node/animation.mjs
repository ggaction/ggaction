import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ChartProgram } from 'ggaction/extension';
import { chart, render } from 'ggaction';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames, createAnimationPlayer } from 'ggaction/animation';
import { renderToSVG } from 'ggaction/svg';
import { renderToPNGBuffer } from 'ggaction/png';
import { renderToPDFBuffer } from 'ggaction/pdf';
import { createCanvas } from '@napi-rs/canvas';

const offlineNetworkGuard=`
import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';
import {syncBuiltinESMExports} from 'node:module';
let network=0;const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;
for(const module of [http,https]){module.get=deny;module.request=deny;}
net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
`;

const points=()=>chart().createCanvas({width:300,height:200,margin:20})
  .createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:50}]})
  .createPointMark({id:'points',fill:'red'})
  .encodeX({field:'x',scale:{type:'log',domain:[1,1000],nice:false}})
  .encodeY({field:'y',scale:{domain:[0,100],nice:false,zero:false}});
const prepare=()=>{
  const from=points(),to=from.reviseData({source:'rows',id:'next',values:[{id:'a',x:100,y:50}]});
  return planTransition({from,to,options:{durationMs:100,easing:'linear'}});
};

export const cases=[
  {id:'animation/axis-label-layout-offline-native',async run(){
    const base=chart().createCanvas({width:500,height:400,margin:80})
      .createData({values:[{x:0,y:0},{x:10,y:10}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'});
    for(const options of [{flush:true},{rotation:.5},{flush:true,align:'right',overlap:'allow'}]){
      const from=base.createXAxis({ticksAndLabels:{values:[0,5,10],labels:options},title:false});
      const to=from.editCanvas({width:640}).editXAxisLabels({offset:12});
      const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),frame=sampleTransition(plan,50);
      assert.equal(frame.decisions.filter(d=>d.kernel==='guide-geometry'&&d.role==='guide-labels').length,3);
      const child=spawnSync(process.execPath,['--input-type=module','-e',`
        ${offlineNetworkGuard}
        const {deserializeAnimation,exportAnimationFrames}=await import('ggaction/animation');
        let text='';for await(const chunk of process.stdin)text+=chunk;
        console.log(JSON.stringify({frames:exportAnimationFrames(deserializeAnimation(text).plan,{timesMs:[0,25,50,75,100]}),network}));
      `],{input:serializeAnimation(plan),encoding:'utf8',timeout:30000});
      assert.equal(child.status,0,child.stderr);
      assert.deepEqual(JSON.parse(child.stdout),{frames:JSON.parse(JSON.stringify(exportAnimationFrames(plan,{timesMs:[0,25,50,75,100]}))),network:0});
      const rebased=planTransition({from:frame,to,options:{durationMs:100,easing:'linear'}});
      assert.strictEqual(sampleTransition(rebased,0),frame);
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
      const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
      assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
      assert.match(renderToSVG(frame),/<svg/);assert.equal((await renderToPDFBuffer(frame)).buffer.subarray(0,4).toString(),'%PDF');
    }
  }},
  {id:'animation/legend-offline-native',async run(){
    const base=chart().createCanvas({width:700,height:450,margin:{top:120,bottom:120,right:220,left:150}})
      .createData({values:[{x:1,y:1},{x:100,y:2}]}).createPointMark()
      .encodeX({field:'x'}).encodeY({field:'y'});
    for(const channel of ['color','stroke']){
      const encoded=channel==='color'?base.encodeColor({field:'x',fieldType:'quantitative',scale:{type:'log',domain:[1,100],range:['red','blue']}})
        :base.encodeStroke({field:'x',fieldType:'quantitative',scale:{type:'log',domain:[1,100],range:['red','blue']}});
      const from=encoded.createLegend({channels:[channel],values:[1,10,100],offset:20,title:'Amount'});
      const to=from.editCanvas({width:900}).editScale({id:channel,domain:[1,10000]}).editLegend({gradient:{length:200,thickness:20}});
      const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),frame=sampleTransition(plan,50);
      const ticks=frame.decisions.flatMap((d,i)=>d.kernel==='guide-geometry'&&d.role==='guide-legend-tick'?[i]:[]);
      assert.equal(ticks.length,3);
      assert.ok(Math.abs(frame.scene.nodes[ticks[1]].properties.y1-(152.5+160*2/3))<1e-9);
      const child=spawnSync(process.execPath,['--input-type=module','-e',`
        ${offlineNetworkGuard}
        const {deserializeAnimation,exportAnimationFrames}=await import('ggaction/animation');
        let text='';for await(const chunk of process.stdin)text+=chunk;
        console.log(JSON.stringify({frames:exportAnimationFrames(deserializeAnimation(text).plan,{timesMs:[0,25,50,75,100]}),network}));
      `],{input:serializeAnimation(plan),encoding:'utf8',timeout:30000});
      assert.equal(child.status,0,child.stderr);
      assert.deepEqual(JSON.parse(child.stdout),{frames:JSON.parse(JSON.stringify(exportAnimationFrames(plan,{timesMs:[0,25,50,75,100]}))),network:0});
      const rebased=planTransition({from:frame,to,options:{durationMs:100,easing:'linear'}});
      assert.strictEqual(sampleTransition(rebased,0),frame);
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
      const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
      assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
      assert.match(renderToSVG(frame),/<svg/);assert.equal((await renderToPDFBuffer(frame)).buffer.subarray(0,4).toString(),'%PDF');
    }
  }},
  {id:'animation/guide-anchors-offline-native',async run(){
    const source=chart().createCanvas({width:600,height:420,margin:90})
      .createData({values:[{a:1,b:10,c:'A'},{a:100,b:20,c:'B'}]});
    const title=source.createPointMark().encodeX({field:'a',scale:{type:'log',domain:[1,1000],nice:false}}).encodeY({field:'b'})
      .createXAxis({line:false,ticksAndLabels:false,title:{text:'Amount',at:10,offset:35}});
    const boundary=source.createBarMark().encodeX({field:'c',fieldType:'nominal',scale:{type:'band',paddingInner:0,paddingOuter:0}})
      .encodeY({field:'b'}).createVerticalGrid({bandPosition:'boundary'});
    const parallel=source.createParallelCoordinates({id:'lines',dimensions:['a','b'],guides:{legend:false}});
    const pairs=[[title,title.editXAxisTitle({at:100}),'title'],[boundary,boundary.editCanvas({width:800}),'boundary'],
      [parallel,parallel.encodeParallelCoordinates({target:'lines',dimensions:['b','a']}),'parallel-title']];
    for(const [from,to,role] of pairs){
      const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),saved=serializeAnimation(plan),frame=sampleTransition(plan,50);
      const indices=frame.decisions.flatMap((d,i)=>d.kernel==='guide-geometry'&&JSON.parse(d.guideKey)[3]===role?[i]:[]);
      assert.ok(indices.length>0);
      if(role==='title')assert.ok(Math.abs(frame.scene.nodes[indices[0]].properties.x-(90+140*Math.log10(55)))<1e-10);
      if(role==='boundary')assert.equal(indices.length,3);
      const child=spawnSync(process.execPath,['--input-type=module','-e',`
        ${offlineNetworkGuard}
        const {deserializeAnimation,exportAnimationFrames}=await import('ggaction/animation');
        let text='';for await(const chunk of process.stdin)text+=chunk;
        console.log(JSON.stringify({frames:exportAnimationFrames(deserializeAnimation(text).plan,{timesMs:[0,25,50,75,100]}),network}));
      `],{input:saved,encoding:'utf8',timeout:30000});
      assert.equal(child.status,0,child.stderr);
      assert.deepEqual(JSON.parse(child.stdout),{frames:JSON.parse(JSON.stringify(exportAnimationFrames(plan,{timesMs:[0,25,50,75,100]}))),network:0});
      const rebased=planTransition({from:frame,to,options:{durationMs:100,easing:'linear'}});
      assert.strictEqual(sampleTransition(rebased,0),frame);
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
      const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
      assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
      assert.match(renderToSVG(frame),/<svg/);assert.equal((await renderToPDFBuffer(frame)).buffer.subarray(0,4).toString(),'%PDF');
    }
  }},
  {id:'animation/guides-offline-native',async run(){
    const from=chart().createCanvas({width:400,height:240,margin:40})
      .createData({values:[{x:0,y:0},{x:10,y:10}]}).createPointMark()
      .encodeX({field:'x',scale:{domain:[0,10],nice:false}}).encodeY({field:'y'})
      .createXAxis({ticksAndLabels:{values:[0,5,10]},title:false}).createVerticalGrid({values:[5]});
    const to=from.editScale({id:'x',domain:[0,20]});
    const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),saved=serializeAnimation(plan),frame=sampleTransition(plan,50);
    const tick=frame.decisions.findIndex(d=>d.kernel==='guide-geometry'&&JSON.parse(d.guideKey)[3]==='ticks'&&JSON.parse(d.guideKey)[4]===5);
    assert.ok(tick>=0);assert.ok(Math.abs(frame.scene.nodes[tick].properties.x1-(40+320/3))<1e-10);
    const child=spawnSync(process.execPath,['--input-type=module','-e',`
      ${offlineNetworkGuard}
      const {deserializeAnimation,sampleTransition}=await import('ggaction/animation');
      let text='';for await(const chunk of process.stdin)text+=chunk;
      console.log(JSON.stringify({frame:sampleTransition(deserializeAnimation(text).plan,50),network}));
    `],{input:saved,encoding:'utf8',timeout:30000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{frame:JSON.parse(JSON.stringify(frame)),network:0});
    const rebased=planTransition({from:frame,to:from,options:{durationMs:100,easing:'linear'}});
    assert.equal(sampleTransition(rebased,0),frame);assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
    const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
    assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
    assert.match(renderToSVG(frame),/<svg/);assert.equal((await renderToPDFBuffer(frame)).buffer.subarray(0,4).toString(),'%PDF');
  }},
  {id:'animation/polar-offline-native',async run(){
    const base=()=>chart().createCanvas({width:200,height:200,margin:20}).createData({id:'rows',keyField:'id',values:[{id:1,t:350,r:50,c:'A'},{id:'1',t:80,r:70,c:'B'}]});
    const theta={field:'t',scale:{domain:[0,360],nice:false}},radius={field:'r',scale:{domain:[0,100],nice:false}};
    const programs=[base().createPointMark({id:'mark',fill:'red'}).encodeSize({value:Math.PI*64}).encodeTheta(theta).encodeR(radius),
      base().createLineMark({id:'mark'}).encodeTheta({field:'c',fieldType:'nominal'}).encodeR(radius),
      base().createArcMark({id:'mark',innerRadius:.25}).encodeTheta({field:'r'})];
    for(const from of programs){
      const to=from.reviseData({source:'rows',id:'next',values:[{id:1,t:10,r:100,c:'A'},{id:'1',t:90,r:50,c:'B'}]});
      const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),saved=serializeAnimation(plan),frame=sampleTransition(plan,50);
      assert.ok(frame.decisions.some(d=>d.kernel==='polar-geometry'));
      const child=spawnSync(process.execPath,['--input-type=module','-e',`
        ${offlineNetworkGuard}
        const {deserializeAnimation,sampleTransition}=await import('ggaction/animation');
        let text='';for await(const chunk of process.stdin)text+=chunk;
        console.log(JSON.stringify({frame:sampleTransition(deserializeAnimation(text).plan,50),network}));
      `],{input:saved,encoding:'utf8',timeout:30000});
      assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{frame:JSON.parse(JSON.stringify(frame)),network:0});
      const rebased=planTransition({from:frame,to:from,options:{durationMs:100,easing:'linear'}});
      assert.equal(sampleTransition(rebased,0),frame);assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
      const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
      assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
      assert.match(renderToSVG(frame),/<svg/);assert.equal((await renderToPDFBuffer(frame)).buffer.subarray(0,4).toString(),'%PDF');
    }
  }},
  {id:'animation/bounded-repeated-interruption',async run(){
    const plan=prepare(),left=sampleTransition(plan,0),right=sampleTransition(plan,100);
    let draws=0;
    const player=createAnimationPlayer({plan,clock:{now:()=>0,requestFrame(){throw Error('Paused player scheduled a callback');},cancelFrame(){}},render(){draws++;}});
    player.seek(50);
    for(let i=0;i<1000;i++){
      const captured=player.getFrame(),finished=player.finished;
      player.interrupt({to:i%2?left:right,options:{durationMs:100,easing:'linear'}});
      assert.equal(player.getFrame(),captured);assert.equal((await finished).reason,'interrupted');
      player.seek(50);
      const node=player.getFrame().scene.nodes.find(node=>node.type==='circle');
      assert.ok(node&&Number.isFinite(node.properties.x)&&Number.isFinite(node.properties.y));
      assert.equal(player.getFrame().scene.nodes.length,2);
    }
    const last=player.getFrame(),saved=serializeAnimation(planTransition({from:last,to:left,options:{durationMs:100}}));
    assert.deepEqual(sampleTransition(deserializeAnimation(saved).plan,0),last);
    player.dispose();assert.equal(player.getFrame(),undefined);const before=draws;
    assert.throws(()=>player.seek(50),/disposed/);assert.equal(draws,before);
  }},
  {id:'animation/public-player-interruption',async run(){
    const plan=prepare();let now=0,sequence=0;const pending=new Map(),frames=[],commits=[];
    const clock={now:()=>now,requestFrame:fn=>{const id=++sequence;pending.set(id,fn);return id;},cancelFrame:id=>pending.delete(id)};
    const player=createAnimationPlayer({plan,clock,render:frame=>frames.push(frame),commit:frame=>commits.push(frame)});
    assert.equal(player.play(),player);now=50;const callback=pending.values().next().value;pending.clear();callback();
    const captured=player.getFrame(),first=player.finished,target=sampleTransition(plan,100);
    player.interrupt({to:target,options:{durationMs:100},rate:-1});
    assert.equal(player.getFrame(),captured);assert.equal((await first).reason,'interrupted');
    const state=player.getState();assert.throws(()=>player.interrupt({to:{},options:{durationMs:50}}));assert.deepEqual(player.getState(),state);
    now=150;const end=pending.values().next().value;pending.clear();end();
    assert.equal((await player.finished).reason,'completed');assert.equal(commits.length,1);
    assert.equal(player.getFrame(),target);
    player.dispose();assert.equal(pending.size,0);assert.equal(player.getFrame(),undefined);
    const reduced=createAnimationPlayer({plan,clock,render:()=>{},reducedMotion:true});reduced.play();
    assert.equal((await reduced.finished).reason,'completed');assert.equal(pending.size,0);reduced.dispose();
  }},
  {id:'animation/offline-fresh-process',async run(){
    const plan=prepare(),saved=serializeAnimation(plan,{rate:-1,repeat:Infinity,reducedMotion:true});
    const expected=exportAnimationFrames(plan,{timesMs:[0,50,100]}).map(frame=>frame.scene);
    const child=spawnSync(process.execPath,['--input-type=module','-e',`
      ${offlineNetworkGuard}
      const {deserializeAnimation,exportAnimationFrames}=await import('ggaction/animation');
      let text='';for await(const chunk of process.stdin)text+=chunk;
      const {plan,playback}=deserializeAnimation(text);
      console.log(JSON.stringify({scenes:exportAnimationFrames(plan,{timesMs:[0,50,100]}).map(f=>f.scene),network,
        playback:{...playback,repeat:playback.repeat===Infinity?'infinite':playback.repeat}}));
    `],{input:saved,encoding:'utf8',timeout:30000});
    assert.equal(child.status,0,child.stderr);const actual=JSON.parse(child.stdout);
    assert.deepEqual(actual.scenes,expected);assert.equal(actual.network,0);
    assert.deepEqual(actual.playback,{rate:-1,repeat:'infinite',reducedMotion:true});
  }},
  {id:'animation/four-public-renderers',async run(){
    const plan=deserializeAnimation(serializeAnimation(prepare())).plan;
    const [frame]=exportAnimationFrames(plan,{timesMs:[50]});
    const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
    assert.deepEqual([...canvas.getContext('2d').getImageData(168,100,1,1).data],[255,0,0,255]);
    assert.deepEqual([...canvas.getContext('2d').getImageData(106,100,1,1).data],[255,255,255,255]);
    const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame),svg=renderToSVG(frame);
    assert.deepEqual(png.buffer,await canvas.encode('png'));
    assert.equal(Buffer.from(pdf.buffer).subarray(0,4).toString(),'%PDF');assert.match(svg,/<svg/);
    assert.equal(png.width,300);assert.equal(png.height,200);
  }},
  {id:'animation/embedded-assets-fresh-process',async run(){
    // Original MIT rectangle glyph fixture, copied as actual payload bytes.
    const fontBytes=Buffer.from('AAEAAAAKAIAAAwAgT1MvMkVARxsAAAEoAAAAYGNtYXAAVwOLAAABnAAAAERnbHlmD/fnfQAAAewAAABmaGVhZFmHpRQAAACsAAAANmhoZWEFegLCAAAA5AAAACRobXR4CGb/zgAAAYgAAAAUbG9jYQA0AFoAAAHgAAAADG1heHAABwAGAAABCAAAACBuYW1lpua8ewAAAlQAAAIQcG9zdOtXyAoAAARkAAAANgABAAAAAQAABrXagV8PPPUAAwPoAAAAAHwlsIAAAAAAfCWwgP84AAAC7gM0AAAAAwACAAAAAAAAAAEAAANS/2oAAAMg/zgAMgLuAAEAAAAAAAAAAAAAAAAAAAAFAAEAAAAFAAQAAQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwIaAZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAAAAAAAAAAAAAAAAPz8/PwAAACADAQNS/2oAAANSAJYAAAAAAAAAAAAAAAAAAAAgAAAB9AAyAPoAAAJYADIDIAAyAAD/OAAAAAIAAAADAAAAFAADAAEAAAAUAAQAMAAAAAgACAACAAAAIABCAwH//wAAACAAQQMB////4f/B/QMAAQAAAAAAAAAAAAAADQANABoAJwAzAAEAMgAAAcICvAADAAAzIREhMgGQ/nACvAAAAQAyAAACJgK8AAMAADMhESEyAfT+DAK8AAABADIAAALuArwAAwAAMyERITICvP1EArwAAAH/OALk/5wDNAADAAADMzUjyGRkAuRQAAAAAAAMAJYAAQAAAAAAAQAXAAAAAQAAAAAAAgAHABcAAQAAAAAAAwAZAB4AAQAAAAAABAAfADcAAQAAAAAABQALAFYAAQAAAAAABgAdAGEAAwABBAkAAQAuAH4AAwABBAkAAgAOAKwAAwABBAkAAwAyALoAAwABBAkABAA+AOwAAwABBAkABQAWASoAAwABBAkABgA6AUBnZ2FjdGlvbiBNZXRyaWMgRml4dHVyZVJlZ3VsYXJnZ2FjdGlvbi1tZXRyaWMtZml4dHVyZS0xZ2dhY3Rpb24gTWV0cmljIEZpeHR1cmUgUmVndWxhclZlcnNpb24gMS4wZ2dhY3Rpb25NZXRyaWNGaXh0dXJlLVJlZ3VsYXIAZwBnAGEAYwB0AGkAbwBuACAATQBlAHQAcgBpAGMAIABGAGkAeAB0AHUAcgBlAFIAZQBnAHUAbABhAHIAZwBnAGEAYwB0AGkAbwBuAC0AbQBlAHQAcgBpAGMALQBmAGkAeAB0AHUAcgBlAC0AMQBnAGcAYQBjAHQAaQBvAG4AIABNAGUAdAByAGkAYwAgAEYAaQB4AHQAdQByAGUAIABSAGUAZwB1AGwAYQByAFYAZQByAHMAaQBvAG4AIAAxAC4AMABnAGcAYQBjAHQAaQBvAG4ATQBlAHQAcgBpAGMARgBpAHgAdAB1AHIAZQAtAFIAZQBnAHUAbABhAHIAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAwAkACUBAglhY3V0ZWNvbWIAAA==','base64');
    const imageBytes=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>');
    const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
    const font={contentHash:hash(fontBytes),mimeType:'font/ttf',byteLength:fontBytes.length,family:'ggaction Metric Fixture',style:'normal',weight:400,metricsProviderVersion:'fixture@1',payload:{encoding:'base64',data:fontBytes.toString('base64')}};
    const image={contentHash:hash(imageBytes),mimeType:'image/svg+xml',byteLength:imageBytes.length,width:20,height:10,payload:{encoding:'base64',data:imageBytes.toString('base64')}};
    const from=new ChartProgram({graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:100,height:80,background:'white'}},
      image:{type:'image',properties:{image,x:10,y:10,width:40,height:20}},
      text:{type:'text',properties:{font,text:'AB',x:20,y:60,fontFamily:font.family,fontSize:20,fontWeight:400,textAlign:'left',textBaseline:'alphabetic',fill:'green'}}},order:['canvas','image','text']}});
    const plan=planTransition({from,to:from,options:{durationMs:100}}),saved=serializeAnimation(plan);
    assert.ok(saved.includes(font.payload.data));assert.ok(saved.includes(image.payload.data));
    const expected=hash((await renderToPNGBuffer(sampleTransition(plan,0))).buffer);
    const child=spawnSync(process.execPath,['--input-type=module','-e',`
      ${offlineNetworkGuard}
      const {createHash}=await import('node:crypto');const {deserializeAnimation,sampleTransition}=await import('ggaction/animation');const {renderToPNGBuffer}=await import('ggaction/png');
      let text='';for await(const chunk of process.stdin)text+=chunk;
      const {plan}=deserializeAnimation(text),png=await renderToPNGBuffer(sampleTransition(plan,0));
      console.log(JSON.stringify({hash:createHash('sha256').update(png.buffer).digest('hex'),network}));
    `],{input:saved,encoding:'utf8',timeout:30000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{hash:expected,network:0});
  }},
  {id:'animation/immutable-schedules-and-corruption',run(){
    const plan=prepare(),saved=serializeAnimation(plan),before=sampleTransition(plan,50);
    const frames=exportAnimationFrames(plan,{fps:25});
    assert.deepEqual(frames.map(frame=>frame.timeMs),[0,40,80]);assert.ok(Object.isFrozen(frames));
    assert.throws(()=>exportAnimationFrames(plan,{timesMs:[0,101]}));
    assert.throws(()=>exportAnimationFrames(plan,{timesMs:[50,50]}));
    const broken=JSON.parse(saved);broken.digest='0'.repeat(64);
    assert.throws(()=>deserializeAnimation(JSON.stringify(broken)),/digest/);
    assert.throws(()=>serializeAnimation(structuredClone(plan)),/authentic/);
    assert.deepEqual(sampleTransition(plan,50),before);
  }},
  {id:'animation/cartesian-native-families',async run(){
    const values=[{id:1,x:1,y:20,high:50,category:'A'},{id:'1',x:3,y:40,high:70,category:'B'}];
    const base=()=>chart().createCanvas({width:300,height:200}).createData({id:'rows',values,keyField:'id'});
    const programs=[
      base().createRuleMark({id:'mark'}).encodeX({field:'x',fieldType:'quantitative'}),
      base().createRectMark({id:'mark'}).encodeXRange({lower:'x',upper:{datum:4},fieldType:'quantitative'}).encodeYRange({lower:'y',upper:'high',fieldType:'quantitative'}),
      base().createBarMark({id:'mark'}).encodeX({field:'category',fieldType:'nominal'}).encodeY({field:'y',aggregate:'sum'}),
      base().createLineMark({id:'mark',curve:'step'}).encodeX({field:'x'}).encodeY({field:'y'}),
      base().createAreaMark({id:'mark'}).encodeX({field:'x'}).encodeYRange({lower:'y',upper:'high'}),
      base().createHistogram({id:'mark',field:'x',binBoundaries:[0,2,4],guides:false})
    ];
    for(const from of programs){
      const to=from.editCanvas({width:500,height:300});
      const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),frame=sampleTransition(plan,50);
      assert.ok(frame.decisions.some(decision=>decision.kernel==='cartesian-geometry'));
      const restored=deserializeAnimation(serializeAnimation(plan)).plan;
      assert.deepEqual(sampleTransition(restored,50),frame);
      const rebase=planTransition({from:frame,to:from,options:{durationMs:100}});
      assert.equal(sampleTransition(rebase,0),frame);
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebase)).plan,50),sampleTransition(rebase,50));
    }
  }},
  {id:'animation/cartesian-offline-renderers',async run(){
    const from=chart().createCanvas({width:300,height:200,margin:20})
      .createData({id:'rows',values:[{id:'a',x:1}],keyField:'id'}).createRectMark({id:'mark',fill:'red'})
      .encodeXRange({lower:'x',upper:{datum:1000},fieldType:'quantitative',scale:{type:'log',domain:[1,1000],nice:false}})
      .encodeYRange({lower:{datum:20},upper:{datum:80},fieldType:'quantitative',scale:{domain:[0,100],nice:false,zero:false}});
    const to=from.reviseData({source:'rows',id:'next',values:[{id:'a',x:100}]});
    const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),saved=serializeAnimation(plan),frame=sampleTransition(plan,50);
    const child=spawnSync(process.execPath,['--input-type=module','-e',`
      import {deserializeAnimation,sampleTransition} from 'ggaction/animation';
      globalThis.fetch=()=>{throw Error('network forbidden');};let text='';for await(const c of process.stdin)text+=c;
      console.log(JSON.stringify(sampleTransition(deserializeAnimation(text).plan,50)));
    `],{input:saved,encoding:'utf8',timeout:30000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),JSON.parse(JSON.stringify(frame)));
    const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
    assert.deepEqual([...canvas.getContext('2d').getImageData(200,100,1,1).data],[255,0,0,255]);
    assert.deepEqual([...canvas.getContext('2d').getImageData(106,100,1,1).data],[255,255,255,255]);
    assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
    assert.match(renderToSVG(frame),/<rect/);assert.equal((await renderToPDFBuffer(frame)).buffer.subarray(0,4).toString(),'%PDF');
  }}
];

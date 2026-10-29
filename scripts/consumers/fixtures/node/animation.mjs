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
      import {deserializeAnimation,exportAnimationFrames} from 'ggaction/animation';
      let network=0;globalThis.fetch=()=>{network++;throw Error('offline');};
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
      import {createHash} from 'node:crypto';import {deserializeAnimation,sampleTransition} from 'ggaction/animation';import {renderToPNGBuffer} from 'ggaction/png';
      let text='';for await(const chunk of process.stdin)text+=chunk;let network=0;globalThis.fetch=()=>{network++;throw Error('offline');};
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
  }}
];

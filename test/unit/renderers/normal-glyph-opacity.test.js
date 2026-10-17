import assert from 'node:assert/strict';
import test from 'node:test';
import {createCanvas}from'@napi-rs/canvas';
import {render}from'../../../src/index.js';
import{sourceOverStraight}from'../../oracles/compositing.js';
import{createMockCanvasContext}from'../../support/canvas.js';
import {normalGlyphScene,independentGlyphReference}from'../../oracles/glyph-opacity.js';
test('normal glyph opacity composites the independent complete fill-stroke source once',()=>{
 for(const type of ['circle','rect','path'])for(const opacity of [0,.2,.7,1])
 for(const background of ['white','#556677','transparent'])for(const intrinsic of [false,true])
 for(const pixelRatio of [1,1.5,2])for(const nested of [false,true]){
  const fill=intrinsic?'rgba(255,0,0,0.4)':'red',stroke=intrinsic?'rgba(0,0,255,0.6)':'blue';
  const target=createCanvas(80*pixelRatio,80*pixelRatio),actual=target.getContext('2d');
  const scene=normalGlyphScene(type,opacity,fill,stroke,nested);scene.graphicSpec.objects.canvas.properties.background=background;
  render(scene,actual,{pixelRatio});
  const expected=independentGlyphReference(createCanvas,{type,opacity,fill,stroke,background,pixelRatio,nested});
  const ap=actual.getImageData(0,0,target.width,target.height).data,bp=expected.getContext('2d').getImageData(0,0,target.width,target.height).data;
  assert.equal(ap.every((v,i)=>v===bp[i]),true,JSON.stringify({type,opacity,background,intrinsic,pixelRatio,nested}));
  if(!intrinsic&&opacity===.7&&background==='white'&&pixelRatio===1&&!nested)assert.deepEqual([...actual.getImageData(58,40,1,1).data],[77,77,255,255]);
  if(!intrinsic&&pixelRatio===1&&!nested&&background==='transparent'){
    const probe=createCanvas(1,1).getContext('2d');probe.globalAlpha=opacity;probe.fillStyle='blue';probe.fillRect(0,0,1,1);
    const alpha=probe.getImageData(0,0,1,1).data[3],pixel=[...actual.getImageData(58,40,1,1).data];
    assert.deepEqual(pixel,alpha===0?[0,0,0,0]:[0,0,255,alpha]);
    assert.equal(pixel[2]*pixel[3]/255,alpha,'premultiplied blue equals source alpha exactly');
  }
 }
});
test('unsupported concrete normal contexts reject before destination paint',()=>{
 const canvas=createCanvas(80,80),ctx=canvas.getContext('2d');ctx.fillStyle='lime';ctx.fillRect(0,0,80,80);const before=ctx.getImageData(0,0,80,80).data;
 for(const glyph of [normalGlyphScene('circle',.7,'red','blue').graphicSpec.objects.glyph,{type:'line',properties:{x1:0,y1:0,x2:20,y2:20,stroke:'blue',strokeWidth:2,blend:'normal'}}]){
  if(glyph.type==='circle')glyph.properties.blend='difference';
  assert.throws(()=>render({graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:80,height:80,background:'white'},children:['glyph']},glyph},order:['canvas']}},ctx));
  assert.deepEqual(ctx.getImageData(0,0,80,80).data,before);
 }
});

test('normal arc, transform and source-mask capability failures preserve the destination',()=>{
 for(const missing of ['arc','setTransform','destination-in']){
  const canvas=createCanvas(9,9),ctx=canvas.getContext('2d');ctx.fillStyle='lime';ctx.fillRect(0,0,9,9);const old=ctx.getImageData(0,0,9,9).data;
  const surface=createCanvas(1,1),source=surface.getContext('2d');
  if(missing==='destination-in')Object.defineProperty(source,'globalCompositeOperation',{get:()=> 'source-over',set:()=>{}});
  else Object.defineProperty(source,missing,{value:undefined});
  canvas.ownerDocument={createElement:()=>surface};
  assert.throws(()=>render(normalGlyphScene('circle',.7,'red','blue'),ctx),/compatible Canvas surface/);
  assert.equal(canvas.width,9);assert.equal(canvas.height,9);assert.deepEqual(ctx.getImageData(0,0,9,9).data,old);
 }
});

test('transparent intrinsic paints retain normal glyph geometry without producing ink',()=>{
 for(const type of ['circle','rect','path'])for(const background of ['white','transparent']){
  const scene=normalGlyphScene(type,.7,'transparent','transparent'),before=JSON.stringify(scene);
  scene.graphicSpec.objects.canvas.properties.background=background;
  const actual=createCanvas(80,80),ctx=actual.getContext('2d');render(scene,ctx);
  const expected=independentGlyphReference(createCanvas,{type,opacity:.7,fill:'transparent',stroke:'transparent',background});
  assert.deepEqual(ctx.getImageData(0,0,80,80).data,expected.getContext('2d').getImageData(0,0,80,80).data);
  assert.equal(scene.graphicSpec.objects.glyph.properties.strokeWidth,10);assert.ok(before.includes('"blend":"normal"'));
 }
});

test('unsupported target source-over compositing fails before clear and resize',()=>{
 const ctx=createMockCanvasContext();ctx.drawImage=()=>{};ctx.canvas.ownerDocument={createElement:()=>createCanvas(1,1)};
 Object.defineProperty(ctx,'globalCompositeOperation',{get:()=> 'difference',set:()=>{}});
 const dimensions={width:ctx.canvas.width,height:ctx.canvas.height};
 assert.throws(()=>render(normalGlyphScene('circle',.7,'red','blue'),ctx),/does not support source-over/);
 assert.deepEqual(ctx.calls.map(call=>call.op),['save','restore']);
 assert.deepEqual({width:ctx.canvas.width,height:ctx.canvas.height},dimensions);
});

test('normal stroke intersection obeys the independent straight-alpha source-over equation',()=>{
 assert.deepEqual(sourceOverStraight([0,0,1,178/255],[1,1,1,1]).map(value=>Math.round(value*255)),[77,77,255,255]);
 for(const opacity of [0,.2,.7,1])for(const [background,rgb,alpha]of[['white',[255,255,255],1],['#556677',[85,102,119],1],['transparent',[0,0,0],0]]){
  const scene=normalGlyphScene('circle',opacity,'red','blue');scene.graphicSpec.objects.canvas.properties.background=background;
  const c=createCanvas(80,80),ctx=c.getContext('2d');render(scene,ctx);
  const expected=sourceOverStraight([0,0,1,Math.floor(opacity*255)/255],rgb.map(v=>v/255).concat(alpha)).map(v=>Math.round(v*255));
  assert.deepEqual([...ctx.getImageData(58,40,1,1).data],expected,JSON.stringify({background,opacity}));
 }
});

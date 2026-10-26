import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {resolveConcreteGraphicBounds} from '../../../src/grammar/schemas/graphicBounds.js';
import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import {chart,render} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';
import {deserializeGraphic,serializeGraphic} from '../../../src/persistence.js';
import {clippingControl,clippingPrimitive,clippingFrame} from '../../support/plot-clipping.js';
import {inspectProgram} from '../../../src/inspection.js';
import {validateGraphicClip} from '../../../src/grammar/schemas/graphicClip.js';
import {prepareIsolatedGlyphs} from '../../../src/renderers/canvas/isolated.js';
import {nativeFontResolver} from '../../../src/renderers/nativeBackend.js';
import {renderCanvasProgram,resolveGraphicRenderTarget} from '../../../src/renderers/canvas/index.js';

function rgba(p,ratio=1,nativeFonts=false){const canvas=createCanvas(1,1);
  if(nativeFonts)renderCanvasProgram(p,canvas.getContext('2d'),{pixelRatio:ratio},createCanvas,{resolveFontFamily:nativeFontResolver(GlobalFonts)});
  else render(p,canvas.getContext('2d'),{pixelRatio:ratio});return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;}
async function decodedPng(buffer){const image=await loadImage(buffer),canvas=createCanvas(image.width,image.height),context=canvas.getContext('2d');context.drawImage(image,0,0);return context.getImageData(0,0,image.width,image.height).data;}

test('public point clip exactly matches independent existing viewport pixels and exports',async()=>{
  const control=clippingControl(chart),actual=control.editPointMark({target:'scatterPlot',clip:true}),primitive=clippingPrimitive(chart,control);
  for(const ratio of [1,2])assert.deepEqual(rgba(actual,ratio),rgba(primitive,ratio));
  const png=await renderToPNGBuffer(actual);
  assert.equal(Buffer.compare(Buffer.from(await decodedPng(png.buffer)),Buffer.from(rgba(primitive,1,true))),0,'Exact viewport pixels with the same native font resources');
  const svg=renderToSVG(actual,{resourceNamespace:'clipTest'});assert.equal((svg.match(/clip-path=/g)||[]).length,1);
  assert.match(svg,/<rect x="40" y="30" width="160" height="128"/);
  const pdf=await renderToPDFBuffer(actual);assert.equal(pdf.pages,1);assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');
  const decoded=[];
  for(const match of pdf.buffer.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)){
    try{decoded.push(inflateSync(Buffer.from(match[1],'latin1')).toString('latin1'));}catch{}
  }
  assert.match(decoded.join('\n'),/40 30 160 128 re\s+W\* n/);
  const restored=deserializeGraphic(serializeGraphic(actual));assert.deepEqual(rgba(restored),rgba(actual));
  const inspection=inspectProgram(actual).views.find(view=>view.owner?.id==='scatterPlot');
  assert.equal(inspection.flags.find(f=>f.reason==='outside-clip').count,2);assert.equal(inspection.visibleCandidates,6);
});

test('omitted or disabled clip retains the frozen control SVG and exact decoded PNG pixels',async()=>{
  const control=clippingControl(chart),off=control.editPointMark({target:'scatterPlot',clip:false});
  assert.equal(Buffer.compare(Buffer.from(await decodedPng((await renderToPNGBuffer(control)).buffer)),Buffer.from(rgba(control,1,true))),0,'Exact control pixels with the same native font resources');
  assert.equal(createHash('sha256').update(renderToSVG(control)).digest('hex'),'5ab2de406fcaea7ac6ec88884eef0ebdd6929ad497095b45be49fab6cdc027db');
  assert.equal(renderToSVG(off),renderToSVG(control));assert.deepEqual(rgba(off),rgba(control));
});

test('primitive owner clip validation is closed, immutable, and independent from item properties',()=>{
  const p=chart().createCanvas({width:100,height:100,margin:10}).createGraphics({id:'dot',type:'circle',length:1,parent:'plot-main'});
  for(const clip of [false,null,{},[],{...clippingFrame,width:-1},{...clippingFrame,height:Infinity},{...clippingFrame,z:2},{...clippingFrame,x:Number.MAX_VALUE,width:Number.MAX_VALUE}])
    assert.throws(()=>validateGraphicClip(clip,'circle'),/clip/);
  for(const target of ['dot:0','canvas'])assert.throws(()=>p.editGraphics({target,property:'clip',value:clippingFrame}),/clip/);
  const input={...clippingFrame},q=p.editGraphics({target:'dot',property:'clip',value:input});input.x=99;
  assert.equal(q.graphicSpec.objects.dot.clip.x,40);assert.equal(p.graphicSpec.objects.dot.clip,undefined);
  const mixed=q.editGraphics({target:'dot',property:'items',value:[{type:'rect',properties:{x:1,y:2,width:3,height:4,fill:'red',stroke:'none',strokeWidth:0}}]});
  assert.deepEqual(mixed.graphicSpec.objects.dot.clip,clippingFrame);
  assert.equal(mixed.editGraphics({target:'dot',property:'clip',value:false}).graphicSpec.objects.dot.clip,undefined);
  const single=chart().createGraphics({id:'single',type:'circle'}).editGraphics({target:'single',property:'clip',value:clippingFrame})
    .editGraphics({target:'single',property:'length',value:2});assert.deepEqual(single.graphicSpec.objects.single.clip,clippingFrame);
});

test('native clipping preflight rejects unsafe geometry before mutating a destination',()=>{
  const program=clippingControl(chart).editGraphics({target:'scatterPlot',property:'clip',value:{x:0,y:0,width:20000000,height:1}});
  const canvas=createCanvas(7,9);assert.throws(()=>render(program,canvas.getContext('2d')),/16777216/);assert.equal(canvas.width,7);assert.equal(canvas.height,9);
});

test('owner clips join nested viewport frames and isolated normal/difference allocation',()=>{
  const base=clippingControl(chart).editPointMark({target:'scatterPlot',clip:true});
  const normal=base.editGraphics({target:'scatterPlot',property:'blend',value:'normal'});
  const context=createCanvas(320,240).getContext('2d');const isolated=prepareIsolatedGlyphs(resolveGraphicRenderTarget(normal.graphicSpec),context);
  assert.equal(isolated.plans.get('scatterPlot:5').empty,true);assert.equal(isolated.plans.get('scatterPlot:7').empty,true);
  assert.equal(isolated.plans.get('scatterPlot:0').left,40);
  // Compare against the same isolated source under an existing nested viewport.
  let primitive=clippingPrimitive(chart,clippingControl(chart)).editGraphics({target:'scatterPlot',property:'blend',value:'normal'});
  assert.deepEqual(rgba(normal),rgba(primitive));
  for(const type of ['rect','path']){
    let p=chart().createCanvas({width:80,height:70,margin:10}).createGraphics({id:'shape',type,parent:'plot-main'});
    const props=type==='rect'?{x:5,y:5,width:40,height:40,fill:'red',stroke:'blue',strokeWidth:3,opacity:.5,blend:'difference'}:
      {commands:[{op:'M',x:5,y:5},{op:'L',x:45,y:5},{op:'L',x:45,y:45},{op:'Z'}],fill:'red',stroke:'blue',strokeWidth:3,opacity:.5,blend:'difference'};
    for(const [property,value]of Object.entries(props))p=p.editGraphics({target:'shape',property,value});
    const clipped=p.editGraphics({target:'shape',property:'clip',value:{x:10,y:10,width:20,height:20}}),pixels=rgba(clipped);
    assert.ok(pixels[(20*80+20)*4+3]>0);assert.equal(pixels[(6*80+6)*4+3],255); // white Canvas outside remains unchanged
    assert.equal(pixels[(6*80+6)*4],255);
  }
});

test('collection and child clips intersect without translations, including empty rectangles',()=>{
  let p=chart().createCanvas({width:120,height:100,margin:10})
    .createGraphics({id:'group',type:'collection',parent:'plot-main'})
    .createGraphics({id:'dot',type:'circle',parent:'group'});
  for(const [property,value]of Object.entries({x:25,y:25,radius:10,fill:'red'}))p=p.editGraphics({target:'dot',property,value});
  p=p.editGraphics({target:'group',property:'clip',value:{x:20,y:20,width:20,height:20}})
    .editGraphics({target:'dot',property:'clip',value:{x:25,y:15,width:20,height:30}});
  assert.deepEqual(resolveConcreteGraphicBounds(p.graphicSpec,'dot'),{left:25,right:35,top:20,bottom:35});
  assert.deepEqual(resolveConcreteGraphicBounds(p.graphicSpec,'group'),{left:25,right:35,top:20,bottom:35});
  assert.equal((renderToSVG(p).match(/clip-path=/g)||[]).length,2);
  const data=rgba(p),pixel=(x,y)=>[...data.slice((y*120+x)*4,(y*120+x)*4+4)];
  assert.deepEqual(pixel(28,25),[255,0,0,255]);assert.deepEqual(pixel(24,25),[255,255,255,255]);assert.deepEqual(pixel(28,19),[255,255,255,255]);
  const empty=p.editGraphics({target:'group',property:'clip',value:{x:20,y:20,width:20,height:0}});
  assert.ok(rgba(empty).every(byte=>byte===255));assert.equal(resolveConcreteGraphicBounds(empty.graphicSpec,'group'),undefined);
});

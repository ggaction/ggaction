// Review-only existing-primitive target. No proposed mark or node clip API is used.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chart} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';

export const targetRows = Object.freeze([
  [-.25,4],[.25,8.25],[5,0],[10.25,4],[5,4],[12,10],[10,8],[-1,-1]
].map(([x,y])=>Object.freeze({x,y,series:'Series A'})));
export const expectedCenters = Object.freeze([[36,94],[44,26],[120,158],[204,94],[120,94],[232,-2],[200,30],[24,174]]);
export const frame = Object.freeze({x:40,y:30,width:160,height:128});

export function buildUnclippedControl(factory=chart) {
  return factory()
    .createCanvas({width:320,height:240,margin:{left:40,top:30,right:120,bottom:82}})
    .createData({values:targetRows})
    .createScatterPlot({x:{field:'x',scale:{domain:[0,10]}},y:{field:'y',scale:{domain:[0,8]}},guides:false})
    .encodeColor({field:'series',scale:{domain:['Series A'],range:['#4c78a8']}})
    .encodePointRadius({value:8})
    .editPointMark({opacity:.7})
    .createLegend({title:'Series',titleStyle:{fontSize:11,fontWeight:700},labels:{fontSize:10}})
    .createData({id:'outsideLine',values:[{x:-1,y:9},{x:12,y:9}]})
    .createLinePlot({x:'x',y:'y',guides:false})
    .editLineMark({stroke:'#f58518',strokeWidth:3});
}

// Geometry comes from the literals above, not a proposed clipping materializer.
// Unrelated line/legend primitives are copied without moving them.
export function buildPrimitiveTarget(control) {
  const objects=control.graphicSpec.objects;
  assert.deepEqual(objects.scatterPlot.items.map(i=>[i.properties.x,i.properties.y]),expectedCenters);
  for(const item of objects.scatterPlot.items){assert.equal(item.properties.radius,8);assert.equal(item.properties.opacity,.7);assert.equal(item.properties.fill,'#4c78a8');}
  let p=chart();
  const set=(id,properties)=>{for(const [property,value]of Object.entries(properties??{}))p=p.editGraphics({target:id,property,value});};
  function copy(id,parent){
    const object=objects[id];
    if(id==='scatterPlot'){
      p=p.createGraphics({id:'pointWindow',type:'canvas',parent});set('pointWindow',frame);
      p=p.createGraphics({id,type:'circle',length:expectedCenters.length,parent:'pointWindow'});
      set(id,{x:expectedCenters.map(([x])=>x-frame.x),y:expectedCenters.map(([,y])=>y-frame.y),radius:8,fill:'#4c78a8',opacity:.7});
      return;
    }
    p=p.createGraphics({id,type:object.type,...(parent===undefined?{}:{parent}),...(object.items&&object.type!=='collection'?{length:object.items.length}:{})});
    if(object.items){
      p=p.editGraphics({target:id,property:'items',value:object.items.map(item=>({type:item.type??object.type,properties:item.properties}))});
    }else set(id,object.properties);
    for(const child of object.children??[])copy(child,id);
  }
  for(const id of control.graphicSpec.order)copy(id,undefined);
  assert.deepEqual(p.graphicSpec.objects.pointWindow.properties,frame);
  for(const [id,object]of Object.entries(objects)){
    if(['canvas','plot-main','scatterPlot'].includes(id))continue;
    assert.deepEqual(p.graphicSpec.objects[id],object,'Unrelated control primitive '+id+' must be unchanged');
  }
  return p;
}

export async function writeTargets(directory,{beforeImplementation=false}={}) {
  await fs.mkdir(directory,{recursive:true});assert.equal((await fs.readdir(directory)).length,0,'Preserve prior review outputs');
  const control=buildUnclippedControl(),snapshot=JSON.stringify(control),primitive=buildPrimitiveTarget(control),sha=bytes=>createHash('sha256').update(bytes).digest('hex'),before=[];
  if(beforeImplementation){
    for(const [label,run]of[
      ['mark API',()=>control.editPointMark({clip:true})],
      ['concrete owner property',()=>control.editGraphics({target:'scatterPlot',property:'clip',value:frame})]
    ]){let error;try{run()}catch(e){error=e.message;}assert(error,label+' is not implemented before this checkpoint');assert.equal(JSON.stringify(control),snapshot);before.push({label,error});}
  }
  const outputs=[];
  for(const [name,program]of[['unclipped-control',control],['clipped-primitive-target',primitive]]){
    const svg=renderToSVG(program),png=await renderToPNGBuffer(program),pdf=await renderToPDFBuffer(program);
    assert.equal(png.width,320);assert.equal(png.height,240);assert.equal(pdf.pages,1);assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');
    await fs.writeFile(directory+'/'+name+'.svg',svg,{flag:'wx'});await fs.writeFile(directory+'/'+name+'.png',png.buffer,{flag:'wx'});await fs.writeFile(directory+'/'+name+'.pdf',pdf.buffer,{flag:'wx'});await fs.writeFile(directory+'/'+name+'.graphic.json',JSON.stringify(program.graphicSpec,null,2)+'\n',{flag:'wx'});
    outputs.push({name,svgSha256:sha(svg),pngSha256:sha(png.buffer),pdfSha256:sha(pdf.buffer),clipReferences:(svg.match(/clip-path=/g)??[]).length});
  }
  assert.equal(outputs[0].clipReferences,0);assert.equal(outputs[1].clipReferences,1);assert.notEqual(outputs[0].pngSha256,outputs[1].pngSha256);
  const result={status:'existing-primitive-target-rendered-public-clip-not-yet-implemented',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scriptSha256:sha(await fs.readFile(import.meta.filename)),frame,rawRows:targetRows,expectedCenters,pointCount:8,offPlotCenters:5,fullyOutsideGlyphs:2,partiallyVisibleGlyphs:5,fullyInsideGlyphs:1,unclippedLineAndOutsideLegendUnchanged:true,before,outputs,schoolCalls:0,chartPixelsInspected:false};
  await fs.writeFile(directory+'/target-proof.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));return result;
}

if(process.argv[1]===import.meta.filename)await writeTargets(process.argv[2]??'.artifacts/mark-plot-clipping/target-v1',{beforeImplementation:process.argv.includes('--before-implementation')});

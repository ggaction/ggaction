// Review-only existing primitive target. No spacing implementation is imported.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chart} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';

export const rows = [{x:0,y:0,v:0},{x:1,y:1,v:80},{x:2,y:2,v:336}];
export const centers = [[40,190],[110,110],[180,30]];
export const radii = [8,12,20];
export const targetRows = [73,102,143];
const blue = '#2563eb';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function buildBody(factory=chart) {
  return factory()
    .createCanvas({plot:{width:140,height:160},margin:{left:40,top:30,right:140,bottom:50}})
    .createData({values:rows})
    .createScatterPlot({x:{field:'x',scale:{domain:[0,2]}},y:{field:'y',scale:{domain:[0,2]}},guides:false})
    .encodeSize({field:'v',scale:{type:'linear',domain:[0,336],range:[64*Math.PI,400*Math.PI]}})
    .editPointMark({fill:blue,stroke:'none',opacity:1});
}

export function buildControl(factory=chart) {
  return buildBody(factory)
    .createLegend({channels:['size'],values:[0,80,336],title:'v'})
    .editLegendLabels({fontSize:10,fontFamily:'sans-serif',color:'#000'})
    .editLegendTitle({fontSize:14,fontFamily:'sans-serif',color:'#000'})
    .editLegendBlock({target:'scatterPlot',channel:'size',symbol:{fill:blue,stroke:blue,strokeWidth:2}});
}

// This exact proposed public flow is executed only after implementation.
export function buildPublicTarget(factory=chart) {
  return buildControl(factory).editLegendLayout({rowPadding:7,titlePadding:20});
}

export function buildPrimitiveTarget(control) {
  const objects=control.graphicSpec.objects;
  assert.deepEqual(objects.scatterPlot.items.map(i=>[i.properties.x,i.properties.y]),centers);
  assert.deepEqual(objects.scatterPlot.items.map(i=>i.properties.radius),radii);
  assert.deepEqual(objects.sizeLegendSymbols.items.map(i=>i.properties.radius),radii);
  assert.deepEqual(objects.sizeLegendSymbols.items.map(i=>i.properties.x),[231,231,231]);
  assert.deepEqual(objects.sizeLegendLabels.items.map(i=>i.properties.x),[264,264,264]);
  assert.deepEqual(objects.sizeLegendLabels.items.map(i=>i.properties.text),['0','80','336']);
  assert.equal(objects.sizeLegendTitle.properties.x,210);
  assert.equal(objects.sizeLegendTitle.properties.fontSize,14);
  assert.equal(objects.sizeLegendTitle.properties.textBaseline,'top');
  for(const item of objects.sizeLegendLabels.items){assert.equal(item.properties.textBaseline,'top');assert.equal(item.properties.fontSize,10);}
  for(const item of objects.sizeLegendSymbols.items){
    assert.equal(item.properties.fill,blue);assert.equal(item.properties.stroke,blue);
    assert.equal(item.properties.strokeWidth,2);
  }
  let p=chart();
  const set=(id,properties)=>{for(const[property,value]of Object.entries(properties??{}))p=p.editGraphics({target:id,property,value});};
  function copy(id,parent){
    const o=objects[id];
    p=p.createGraphics({id,type:o.type,...(parent===undefined?{}:{parent}),...(o.items&&o.type!=='collection'?{length:o.items.length}:{})});
    if(o.items){
      const items=o.items.map((item,index)=>({type:item.type??o.type,properties:{...item.properties,
        ...(id==='sizeLegendSymbols'?{y:targetRows[index]}:id==='sizeLegendLabels'?{y:targetRows[index]-5}:{})}}));
      p=p.editGraphics({target:id,property:'items',value:items});
    }else set(id,{...o.properties,...(id==='sizeLegendTitle'?{y:30}:{})});
    for(const child of o.children??[])copy(child,id);
  }
  for(const id of control.graphicSpec.order)copy(id);
  for(const[id,object]of Object.entries(objects))if(!['sizeLegendSymbols','sizeLegendLabels','sizeLegendTitle'].includes(id)){
    assert.deepEqual(p.graphicSpec.objects[id],object,'Unrelated control primitive '+id+' is unchanged');
  }
  return p;
}

export async function writeTargets(directory,{beforeImplementation=false}={}) {
  await fs.mkdir(directory,{recursive:true});assert.equal((await fs.readdir(directory)).length,0,'Preserve prior target evidence');
  const control=buildControl(),snapshot=JSON.stringify(control),primitive=buildPrimitiveTarget(control),before=[];
  if(beforeImplementation){
    for(const option of ['rowPadding','titlePadding'])for(const phase of ['create','whole-edit','layout-edit']){
      const input={[option]:option==='rowPadding'?7:20};let error;
      try{
        if(phase==='create')buildBody().createLegend({channels:['size'],...input});
        else if(phase==='whole-edit')control.editLegend(input);
        else control.editLegendLayout(input);
      }catch(e){error=e.message;}
      assert(error?.includes(option),'Proposed '+phase+' '+option+' must reject before implementation');
      assert.equal(JSON.stringify(control),snapshot);before.push({option,phase,error});
    }
  }
  const outputs=[];
  for(const[name,program]of[['uniform-control',control],['content-spacing-primitive-target',primitive]]){
    const svg=renderToSVG(program),png=await renderToPNGBuffer(program),png2=await renderToPNGBuffer(program,{pixelRatio:2}),pdf=await renderToPDFBuffer(program);
    assert.equal(png.width,320);assert.equal(png.height,240);assert.equal(png2.width,640);assert.equal(png2.height,480);
    assert.equal(pdf.pages,1);assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');
    for(const[extension,data]of[['svg',svg],['png',png.buffer],['dpr2.png',png2.buffer],['pdf',pdf.buffer],['graphic.json',JSON.stringify(program.graphicSpec,null,2)+'\n']]){
      await fs.writeFile(directory+'/'+name+'.'+extension,data,{flag:'wx'});
    }
    outputs.push({name,svgSha256:sha(svg),pngSha256:sha(png.buffer),pngDpr2Sha256:sha(png2.buffer),pdfSha256:sha(pdf.buffer)});
  }
  assert.notEqual(outputs[0].svgSha256,outputs[1].svgSha256);assert.notEqual(outputs[0].pngSha256,outputs[1].pngSha256);
  const result={status:'corrected-existing-primitive-target-rendered-spacing-not-yet-implemented-in-baseline',runtimeBaselineCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scriptSha256:sha(await fs.readFile(import.meta.filename)),canvas:{width:320,height:240},plot:{x:40,y:30,width:140,height:160},radii,paintedSampleHeights:[18,26,42],titleHeight:14,titleGraphicY:30,titleGraphicBaseline:'top',titleCenterY:37,labelGraphicY:[68,97,138],labelGraphicBaseline:'top',labelCenterY:targetRows,sampleCenterY:targetRows,sampleCenterDistances:[29,41],samplePaintedEdgeGaps:[7,7],titlePaintedBodyGap:20,sourceRows:rows,pointCenters:centers,unrelatedPrimitivesUnchanged:true,before,outputs,schoolCalls:0,chartPixelsInspected:false};
  await fs.writeFile(directory+'/target-proof.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));return result;
}

if(process.argv[1]===import.meta.filename)await writeTargets(process.argv[2]??'.artifacts/legend-content-spacing/target-v1',{beforeImplementation:process.argv.includes('--before-implementation')});

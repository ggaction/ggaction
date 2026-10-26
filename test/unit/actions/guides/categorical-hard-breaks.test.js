import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
const base=()=>chart().createCanvas({plot:{width:314,height:314},margin:170}).createData({id:'rows',values:[{x:1,y:2,g:1},{x:2,y:4,g:2}]});
test('categorical legend and theta retain complete hard breaks including empty lines',()=>{
 for(const position of ['right','bottom']){
  const p=base().createScatterPlot({id:'plot',x:'x',y:'y',color:{field:'g',fieldType:'ordinal'}})
   .createLegend({target:'plot',channels:['color'],position}).editLegendBlock({target:'plot',channel:'color',labelMap:[{value:1,label:'One\n\nregion'}]});
  const item=p.graphicSpec.objects.colorLegendLabels.items[0];assert.equal(item.properties.lines.length,3);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  const reset=p.editLegendBlock({target:'plot',channel:'color',labelMap:'auto'});assert.equal(reset.graphicSpec.objects.colorLegendLabels.items[0].properties.lines,undefined);
 }
 const polar=base().createRosePlot({id:'plot',category:'g',value:'y'}).createGuides()
  .editThetaAxisLabels({labelMap:[{value:1,label:'One\nregion'}]});
 assert.ok(Object.values(polar.graphicSpec.objects).flatMap(g=>g.items??[]).some(i=>i.properties.lines?.length===2));
});
test('parallel categories have typed maps while continuous dimensions reject them',()=>{
 const p=base().createParallelCoordinates({id:'plot',dimensions:[{field:'g',fieldType:'ordinal'},'x']});
 const n=p.editParallelAxis({target:'plot',field:'g',labels:{labelMap:[{value:1,label:'One\nregion'}]}});
 assert.equal(n.graphicSpec.objects.parallelAxisLabels.items[0].properties.text,'One\nregion');
 assert.equal(n.graphicSpec.objects.parallelAxisLabels.items[0].properties.lines.length,2);
 assert.deepEqual(deserializeProgram(serializeProgram(n)).graphicSpec,n.graphicSpec);
 assert.throws(()=>p.editParallelAxis({target:'plot',field:'x',labels:{labelMap:[]}}),/categorical/);
 assert.equal(n.editParallelAxis({target:'plot',field:'g',ticksAndLabels:{labels:{labelMap:'auto'}}}).graphicSpec.objects.parallelAxisLabels.items[0].properties.text,'1');
});
test('polar titles retain hard breaks and remove stale line geometry on reset',()=>{
 const p=base().createRosePlot({id:'plot',category:'g',value:'y'}).createGuides();
 for(const [method,id] of [['editThetaAxisTitle','thetaAxisTitle'],['editRadialAxisTitle','radialAxisTitle']]){
  const edited=p[method]({text:'First\n\nsecond'});
  assert.equal(edited.graphicSpec.objects[id].properties.lines.length,3);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec,edited.graphicSpec);
  assert.equal(edited[method]({text:'Only'}).graphicSpec.objects[id].properties.lines,undefined);
 }
});
test('facet field titles reserve the complete multiline label and title bounds',()=>{
 const p=base().createScatterPlot({id:'plot',x:'x',y:'y'}).facet({field:'g',columns:2,
  headers:{column:{title:{text:'Group'}}}});
 const edited=p.editFacetHeaders({role:'column',title:{text:'Group\n\nname'},labelMap:[{value:1,label:'One\nregion'}]});
 const texts=Object.values(edited.graphicSpec.objects).flatMap(g=>g.items??[]).filter(i=>i.properties.text?.includes('\n'));
 assert.ok(texts.some(i=>i.properties.text==='Group\n\nname'&&i.properties.lines.length===3));
 assert.ok(texts.some(i=>i.properties.text==='One\nregion'&&i.properties.lines.length===2));
 assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec,edited.graphicSpec);
});
test('edited categorical hard breaks share Canvas, SVG and PDF concrete geometry',async()=>{
 const {renderToSVG}=await import('../../../../src/renderers/svg.js');
 const {render}=await import('../../../../src/renderers/canvas/index.js');
 const {renderToPDFBuffer}=await import('../../../../src/renderers/pdf.js');
 const {createMockCanvasContext}=await import('../../../support/canvas.js');
 const p=base().createScatterPlot({id:'plot',x:'x',y:'y',color:{field:'g',fieldType:'nominal'}})
  .createLegend({target:'plot',channels:['color']}).editLegendBlock({target:'plot',channel:'color',labelMap:[{value:1,label:'First\n\nregion'}]});
 const svg=renderToSVG(p);assert.ok(svg.includes('>First</'));assert.ok(svg.includes('>region</'));
 const context=createMockCanvasContext();render(p,context);assert.ok(JSON.stringify(context.calls).includes('First'));assert.ok(JSON.stringify(context.calls).includes('region'));
 assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,5).toString(),'%PDF-');
});

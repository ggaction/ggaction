import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';
import {serializeProgram,deserializeProgram} from '../../../src/persistence.js';
import {render} from '../../../src/renderers/canvas/index.js';
import {createMockCanvasContext,findCanvasCalls} from '../../support/canvas.js';

function blankHeader(topLane){return chart().createCanvas({width:180,height:180,margin:50})
  .createData({values:[{panel:'A',x:0,y:0},{panel:'B',x:1,y:1}]})
  .createScatterPlot({x:'x',y:'y',guides:false})
  .facet({field:'panel',spacing:'plot',topLane,headers:{labelMap:[{value:'A',label:''}]}});}

test('blank mapped headers keep identity and render through Canvas, SVG, PNG and PDF',async()=>{
  for(const mode of ['stacked','shared']){
    const p=blankHeader(mode),before=serializeProgram(p),headers=p.graphicSpec.objects['facet-headers'];
    assert.equal(headers.items.length,2);assert.equal(headers.items[0].properties.text,'');
    assert.equal(headers.items[1].properties.text,'B');
    const context=createMockCanvasContext();render(p,context);
    assert.ok(findCanvasCalls(context,'fillText').some(call=>call.args[0]===''));
    assert.match(renderToSVG(p),/<text\b[^>]*><\/text>/);
    assert.ok((await renderToPNGBuffer(p)).buffer.length>100);
    assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,5).toString(),'%PDF-');
    assert.deepEqual(deserializeProgram(before).graphicSpec,p.graphicSpec);
    assert.equal(serializeProgram(p),before);
  }
});

test('concrete renderers still reject missing and non-string text and empty appearance strings',()=>{
  const original=blankHeader('shared');
  for(const [property,value] of [['text',undefined],['text',0],['fontFamily',''],['fill','']]){
    const graphicSpec=structuredClone(original.graphicSpec);
    graphicSpec.objects['facet-headers'].items[0].properties[property]=value;
    const scene={graphicSpec};
    assert.throws(()=>renderToSVG(scene));
    assert.throws(()=>render(scene,createMockCanvasContext()));
  }
});

import {chart} from '../../src/index.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {assertChartProgramsEquivalent} from '../support/chart-equivalence.js';
import {assertRenderedPNG} from '../support/png.js';
export function combinedBase(){return chart().createCanvas({width:1000,height:800,margin:250})
  .createData({values:[{x:1,y:1,g:'A',m:0},{x:2,y:2,g:'B',m:10}]}).createPointMark()
  .encodeX({field:'x'}).encodeY({field:'y'}).encodeColor({field:'g'})
  .encodeSize({field:'m',scale:{range:[4*Math.PI,36*Math.PI]}});}
export function combinedPrimitive(edge){
  const top=edge==='top';
  const label={fill:'#334155',fontSize:12,fontFamily:'sans-serif',fontWeight:'normal',textAlign:'left',textBaseline:'middle'};
  const title={fill:'#334155',fontSize:13,fontFamily:'sans-serif',fontWeight:600,textAlign:'center',textBaseline:'middle'};
  const y=top?201.25:623.75, sy=top?201:623.5, ty=top?176.5:599;
  return combinedBase()
    .createGraphics({id:'colorLegendBackground',type:'rect',parent:'canvas'})
    .editGraphics({target:'colorLegendBackground',property:'x',value:370.57500000000005})
    .editGraphics({target:'colorLegendBackground',property:'y',value:top?158:580.5})
    .editGraphics({target:'colorLegendBackground',property:'width',value:258.84999999999997})
    .editGraphics({target:'colorLegendBackground',property:'height',value:61.5})
    .editGraphics({target:'colorLegendBackground',property:'fill',value:'transparent'})
    .editGraphics({target:'colorLegendBackground',property:'stroke',value:'#cbd5e1'})
    .editGraphics({target:'colorLegendBackground',property:'strokeWidth',value:1})
    .createGraphics({id:'colorLegendSymbols',type:'rect',length:2,parent:'canvas'})
    .editGraphics({target:'colorLegendSymbols',property:'items',value:[
      {type:'rect',properties:{x:382.82500000000005,y:y-6,width:14,height:12,fill:'#4c78a8',stroke:'white',strokeWidth:0.5}},
      {type:'rect',properties:{x:432.14500000000004,y:y-6,width:14,height:12,fill:'#f58518',stroke:'white',strokeWidth:0.5}}]})
    .createGraphics({id:'colorLegendLabels',type:'text',length:2,parent:'canvas'})
    .editGraphics({target:'colorLegendLabels',property:'items',value:[
      {type:'text',properties:{x:404.82500000000005,y,text:'A',...label}},{type:'text',properties:{x:454.14500000000004,y,text:'B',...label}}]})
    .createGraphics({id:'colorLegendTitle',type:'text',parent:'canvas'})
    .editGraphics({target:'colorLegendTitle',property:'x',value:422.14500000000004})
    .editGraphics({target:'colorLegendTitle',property:'y',value:ty})
    .editGraphics({target:'colorLegendTitle',property:'text',value:'g'})
    .editGraphics({target:'colorLegendTitle',property:'fill',value:title.fill})
    .editGraphics({target:'colorLegendTitle',property:'fontSize',value:13})
    .editGraphics({target:'colorLegendTitle',property:'fontFamily',value:'sans-serif'})
    .editGraphics({target:'colorLegendTitle',property:'fontWeight',value:600})
    .editGraphics({target:'colorLegendTitle',property:'textAlign',value:'center'})
    .editGraphics({target:'colorLegendTitle',property:'textBaseline',value:'middle'})
    .createGraphics({id:'sizeLegendSymbols',type:'circle',length:2,parent:'canvas'})
    .editGraphics({target:'sizeLegendSymbols',property:'items',value:[
      {type:'circle',properties:{x:503.4650000000001,y:sy,radius:2,fill:'#94a3b8',opacity:0.7}},
      {type:'circle',properties:{x:574.7850000000001,y:sy,radius:6,fill:'#94a3b8',opacity:0.7}}]})
    .createGraphics({id:'sizeLegendLabels',type:'text',length:2,parent:'canvas'})
    .editGraphics({target:'sizeLegendLabels',property:'items',value:[
      {type:'text',properties:{x:531.4650000000001,y:sy,text:'0',...label}},{type:'text',properties:{x:602.7850000000001,y:sy,text:'10',...label}}]})
    .createGraphics({id:'sizeLegendTitle',type:'text',parent:'canvas'})
    .editGraphics({target:'sizeLegendTitle',property:'x',value:552.4450000000002})
    .editGraphics({target:'sizeLegendTitle',property:'y',value:ty})
    .editGraphics({target:'sizeLegendTitle',property:'text',value:'m'})
    .editGraphics({target:'sizeLegendTitle',property:'fill',value:'#0f172a'})
    .editGraphics({target:'sizeLegendTitle',property:'fontSize',value:13})
    .editGraphics({target:'sizeLegendTitle',property:'fontFamily',value:'sans-serif'})
    .editGraphics({target:'sizeLegendTitle',property:'fontWeight',value:600})
    .editGraphics({target:'sizeLegendTitle',property:'textAlign',value:'center'})
    .editGraphics({target:'sizeLegendTitle',property:'textBaseline',value:'middle'});
}

test("combined horizontal legends match primitive geometry, drawing order and pixels", async () => {
  for (const position of ["top", "bottom"]) {
    const primitive = combinedPrimitive(position);
    const publicProgram = combinedBase().createLegend({ channels: ["color", "size"], position, count: 2, offset: 30, itemGap: 20, border: true });
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram, compareSemanticSpec: false });
    const options = { width: 1000, height: 800, colors: ["#4c78a8", "#f58518"],
      regions: [{ name: "plot", x: 240, y: 240, width: 520, height: 320, minimumInkPixels: 20 }] };
    const artifact = { scope: "charts", capability: "legend-layout", chart: "combined-legend-edges", variant: position,
      title: `Combined legend at ${position}`, userFacingCallChain: `base.createLegend({channels:["color","size"],position:"${position}",count:2,offset:30,itemGap:20,border:true})` };
    const expected = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const actual = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(actual.pixelHash, expected.pixelHash);
  }
});

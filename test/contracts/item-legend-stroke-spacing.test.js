import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";
function intervalBase() {
  return chart().createCanvas({width:1000,height:700,margin:{left:240,right:240,top:200,bottom:200}})
    .createData({values:[{x:1,y:1,m:0},{x:2,y:2,m:10}]}).createPointMark()
    .encodeX({field:"x"}).encodeY({field:"y"}).encodeColor({field:"m",fieldType:"quantitative",scale:{type:"quantize",range:["#4c78a8","#f58518"]}});
}
function intervalPrimitive(base, edge) {
  const r={x:[810,810],y:[264.5,316.5],labelX:[852,852],title:[790,220],align:"left"};
  return base.createGraphics({id:"colorLegendSymbols",type:"rect",length:2,parent:"canvas"})
    .editGraphics({target:"colorLegendSymbols",property:"x",value:r.x})
    .editGraphics({target:"colorLegendSymbols",property:"y",value:r.y.map(y=>y-6)})
    .editGraphics({target:"colorLegendSymbols",property:"width",value:14})
    .editGraphics({target:"colorLegendSymbols",property:"height",value:12})
    .editGraphics({target:"colorLegendSymbols",property:"fill",value:["#4c78a8","#f58518"]})
    .editGraphics({target:"colorLegendSymbols",property:"stroke",value:"black"})
    .editGraphics({target:"colorLegendSymbols",property:"strokeWidth",value:40})
    .createGraphics({id:"colorLegendLabels",type:"text",length:2,parent:"canvas"})
    .editGraphics({target:"colorLegendLabels",property:"x",value:r.labelX})
    .editGraphics({target:"colorLegendLabels",property:"y",value:r.y})
    .editGraphics({target:"colorLegendLabels",property:"text",value:["< 5","≥ 5"]})
    .editGraphics({target:"colorLegendLabels",property:"fill",value:"#334155"})
    .editGraphics({target:"colorLegendLabels",property:"fontSize",value:12})
    .editGraphics({target:"colorLegendLabels",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"colorLegendLabels",property:"fontWeight",value:"normal"})
    .editGraphics({target:"colorLegendLabels",property:"textAlign",value:"left"})
    .editGraphics({target:"colorLegendLabels",property:"textBaseline",value:"middle"})
    .createGraphics({id:"colorLegendTitle",type:"text",parent:"canvas"})
    .editGraphics({target:"colorLegendTitle",property:"x",value:r.title[0]})
    .editGraphics({target:"colorLegendTitle",property:"y",value:r.title[1]})
    .editGraphics({target:"colorLegendTitle",property:"text",value:"m"})
    .editGraphics({target:"colorLegendTitle",property:"fill",value:"#334155"})
    .editGraphics({target:"colorLegendTitle",property:"fontSize",value:13})
    .editGraphics({target:"colorLegendTitle",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"colorLegendTitle",property:"fontWeight",value:600})
    .editGraphics({target:"colorLegendTitle",property:"textAlign",value:r.align})
    .editGraphics({target:"colorLegendTitle",property:"textBaseline",value:"middle"});
}

function widthBase() {
  return chart().createCanvas({width:1000,height:700,margin:{left:240,right:240,top:200,bottom:200}})
    .createData({values:[{x:1,y:1,g:"A",m:0},{x:2,y:2,g:"A",m:0},{x:1,y:2,g:"B",m:10},{x:2,y:1,g:"B",m:10}]})
    .createLineMark().encodeX({field:"x"}).encodeY({field:"y"}).encodeGroup({field:"g"})
    .encodeStrokeWidth({field:"m",scale:{domain:[0,10],range:[2,60]}});
}
function widthPrimitive(base, edge) {
  // Slot92, labels7.32/14.64, gap32 => width261.96; occupied first sample starts29px inside slot.
  const start = 240 + (520 - 261.96) / 2;
  const second = start + 111.32 + 32;
  const dx = 500 - ((start + 29) + (second + 104 + 14.64)) / 2;
  const r={x:[start+30+dx,second+30+dx],y:[140,140],labelX:[start+104+dx,second+104+dx],title:[500+dx,91.5],align:"center"};
  return base.createGraphics({id:"strokeWidthLegendSymbols",type:"line",length:2,parent:"canvas"})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"x1",value:r.x})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"x2",value:r.x.map(x=>x+32)})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"y1",value:r.y})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"y2",value:r.y})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"stroke",value:"#4c78a8"})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"strokeWidth",value:[2,60]})
    .createGraphics({id:"strokeWidthLegendLabels",type:"text",length:2,parent:"canvas"})
    .editGraphics({target:"strokeWidthLegendLabels",property:"x",value:r.labelX})
    .editGraphics({target:"strokeWidthLegendLabels",property:"y",value:r.y})
    .editGraphics({target:"strokeWidthLegendLabels",property:"text",value:["0","10"]})
    .editGraphics({target:"strokeWidthLegendLabels",property:"fill",value:"#334155"})
    .editGraphics({target:"strokeWidthLegendLabels",property:"fontSize",value:12})
    .editGraphics({target:"strokeWidthLegendLabels",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"strokeWidthLegendLabels",property:"fontWeight",value:"normal"})
    .editGraphics({target:"strokeWidthLegendLabels",property:"textAlign",value:"left"})
    .editGraphics({target:"strokeWidthLegendLabels",property:"textBaseline",value:"middle"})
    .createGraphics({id:"strokeWidthLegendTitle",type:"text",parent:"canvas"})
    .editGraphics({target:"strokeWidthLegendTitle",property:"x",value:r.title[0]})
    .editGraphics({target:"strokeWidthLegendTitle",property:"y",value:r.title[1]})
    .editGraphics({target:"strokeWidthLegendTitle",property:"text",value:"m"})
    .editGraphics({target:"strokeWidthLegendTitle",property:"fill",value:"#0f172a"})
    .editGraphics({target:"strokeWidthLegendTitle",property:"fontSize",value:13})
    .editGraphics({target:"strokeWidthLegendTitle",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"strokeWidthLegendTitle",property:"fontWeight",value:600})
    .editGraphics({target:"strokeWidthLegendTitle",property:"textAlign",value:r.align})
    .editGraphics({target:"strokeWidthLegendTitle",property:"textBaseline",value:"middle"});
}

const targets = [
 {id:"interval-right",primitive:()=>intervalPrimitive(intervalBase()),public:()=>intervalBase().createLegend({position:"right",symbol:{stroke:"black",strokeWidth:40}}),call:'intervalBase().createLegend({position:"right",symbol:{stroke:"black",strokeWidth:40}})'},
 {id:"width-top",primitive:()=>widthPrimitive(widthBase()),public:()=>widthBase().createLegend({position:"top",count:2}),call:'widthBase().createLegend({position:"top",count:2})'}
];
test("item legend strokes reserve sample space with exact primitive graphics and pixels",async()=>{
 for(const c of targets){
  const expected=c.primitive(), actual=c.public();
  assertChartProgramsEquivalent({primitiveProgram:expected,publicProgram:actual,compareSemanticSpec:false});
  const options={width:1000,height:700,colors:["#4c78a8"],regions:[{name:"plot",x:230,y:190,width:540,height:320,minimumInkPixels:20}]};
  const artifact={scope:"charts",capability:"legend-layout",chart:"item-stroke-spacing",variant:c.id,title:"Item legend stroke spacing: "+c.id,userFacingCallChain:c.call};
  const a=await assertRenderedPNG(expected,{...options,artifact:{...artifact,kind:"primitive"}});
  const b=await assertRenderedPNG(actual,{...options,artifact:{...artifact,kind:"user-facing"}});
  assert.equal(a.pixelHash,b.pixelHash);
 }
});

import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../src/index.js";
import {assertChartProgramsEquivalent} from "../support/chart-equivalence.js";
import {assertRenderedPNG} from "../support/png.js";
function base(kind = "color") {
  let p=chart().createCanvas({width:2400,height:2000,margin:600})
    .createData({values:[{x:0,y:0,g:"A"},{x:1,y:1,g:"A"},{x:2,y:2,g:"B"},{x:3,y:3,g:"B"}]});
  p=kind === "line" ? p.createLineMark() : p.createPointMark();
  p=p.encodeX({field:"x"}).encodeY({field:"y"});
  return kind === "shape" ? p.encodeShape({field:"g",scale:{range:["square","circle"]}})
    : kind === "line" ? p.encodeGroup({field:"g"}).encodeStrokeDash({field:"g"}) : p.encodeColor({field:"g"});
}
function primitive_right_large_text(){return base("color")
    .createGraphics({"id":"colorLegendSymbols","type":"rect","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendSymbols","property":"x","value":[1860,1860]})
    .editGraphics({"target":"colorLegendSymbols","property":"y","value":[706,786]})
    .editGraphics({"target":"colorLegendSymbols","property":"width","value":14})
    .editGraphics({"target":"colorLegendSymbols","property":"height","value":12})
    .editGraphics({"target":"colorLegendSymbols","property":"fill","value":["#4c78a8","#f58518"]})
    .editGraphics({"target":"colorLegendSymbols","property":"stroke","value":"black"})
    .editGraphics({"target":"colorLegendSymbols","property":"strokeWidth","value":40})
    .createGraphics({"id":"colorLegendLabels","type":"text","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendLabels","property":"x","value":[1902,1902]})
    .editGraphics({"target":"colorLegendLabels","property":"y","value":[712,792]})
    .editGraphics({"target":"colorLegendLabels","property":"text","value":["A","B"]})
    .editGraphics({"target":"colorLegendLabels","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorLegendLabels","property":"fontSize","value":80})
    .editGraphics({"target":"colorLegendLabels","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorLegendLabels","property":"fontWeight","value":"normal"})
    .editGraphics({"target":"colorLegendLabels","property":"textAlign","value":"left"})
    .editGraphics({"target":"colorLegendLabels","property":"textBaseline","value":"middle"})
    .createGraphics({"id":"colorLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"colorLegendTitle","property":"x","value":1840})
    .editGraphics({"target":"colorLegendTitle","property":"y","value":620})
    .editGraphics({"target":"colorLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"colorLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorLegendTitle","property":"fontSize","value":80})
    .editGraphics({"target":"colorLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"colorLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"colorLegendTitle","property":"textBaseline","value":"middle"});}
function primitive_top_inline_line(){return base("line")
    .createGraphics({"id":"seriesLegendSymbols","type":"line","parent":"canvas","length":2})
    .editGraphics({"target":"seriesLegendSymbols","property":"x1","value":[1127.856,1272.056]})
    .editGraphics({"target":"seriesLegendSymbols","property":"x2","value":[1159.856,1304.056]})
    .editGraphics({"target":"seriesLegendSymbols","property":"y1","value":[530,530]})
    .editGraphics({"target":"seriesLegendSymbols","property":"y2","value":[530,530]})
    .editGraphics({"target":"seriesLegendSymbols","property":"stroke","value":"#4c78a8"})
    .editGraphics({"target":"seriesLegendSymbols","property":"strokeWidth","value":60})
    .editGraphics({"target":"seriesLegendSymbols","property":"strokeDash","value":[[],[8,4]]})
    .createGraphics({"id":"seriesLegendLabels","type":"text","parent":"canvas","length":2})
    .editGraphics({"target":"seriesLegendLabels","property":"x","value":[1199.856,1344.056]})
    .editGraphics({"target":"seriesLegendLabels","property":"y","value":[530,530]})
    .editGraphics({"target":"seriesLegendLabels","property":"text","value":["A","B"]})
    .editGraphics({"target":"seriesLegendLabels","property":"fill","value":"#334155"})
    .editGraphics({"target":"seriesLegendLabels","property":"fontSize","value":20})
    .editGraphics({"target":"seriesLegendLabels","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"seriesLegendLabels","property":"fontWeight","value":"normal"})
    .editGraphics({"target":"seriesLegendLabels","property":"textAlign","value":"left"})
    .editGraphics({"target":"seriesLegendLabels","property":"textBaseline","value":"middle"})
    .createGraphics({"id":"seriesLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"seriesLegendTitle","property":"x","value":1043.744})
    .editGraphics({"target":"seriesLegendTitle","property":"y","value":530})
    .editGraphics({"target":"seriesLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"seriesLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"seriesLegendTitle","property":"fontSize","value":40})
    .editGraphics({"target":"seriesLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"seriesLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"seriesLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"seriesLegendTitle","property":"textBaseline","value":"middle"});}
function primitive_left_mapped_shapes(){return base("shape")
    .createGraphics({"id":"seriesLegendSymbolPoints","type":"collection","parent":"canvas"})
    .editGraphics({"target":"seriesLegendSymbolPoints","property":"items","value":[{"type":"rect","properties":{"x":466.0931922364173,"y":661.9131922364172,"width":53.17361552716548,"height":53.17361552716548,"fill":"#4c78a8","stroke":"black","strokeWidth":40}},{"type":"circle","properties":{"x":492.68,"y":788.5,"radius":30,"fill":"#4c78a8","stroke":"black","strokeWidth":40}}]})
    .createGraphics({"id":"seriesLegendLabels","type":"text","parent":"canvas","length":2})
    .editGraphics({"target":"seriesLegendLabels","property":"x","value":[600 - 40 - 117.32 + 100 + 10,600 - 40 - 117.32 + 100 + 10]})
    .editGraphics({"target":"seriesLegendLabels","property":"y","value":[688.5,788.5]})
    .editGraphics({"target":"seriesLegendLabels","property":"text","value":["A","B"]})
    .editGraphics({"target":"seriesLegendLabels","property":"fill","value":"#334155"})
    .editGraphics({"target":"seriesLegendLabels","property":"fontSize","value":12})
    .editGraphics({"target":"seriesLegendLabels","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"seriesLegendLabels","property":"fontWeight","value":"normal"})
    .editGraphics({"target":"seriesLegendLabels","property":"textAlign","value":"left"})
    .editGraphics({"target":"seriesLegendLabels","property":"textBaseline","value":"middle"})
    .createGraphics({"id":"seriesLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"seriesLegendTitle","property":"x","value":442.68})
    .editGraphics({"target":"seriesLegendTitle","property":"y","value":620})
    .editGraphics({"target":"seriesLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"seriesLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"seriesLegendTitle","property":"fontSize","value":13})
    .editGraphics({"target":"seriesLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"seriesLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"seriesLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"seriesLegendTitle","property":"textBaseline","value":"middle"});}
function primitive_legacy_bottom(){return base("color")
    .createGraphics({"id":"colorLegendSymbols","type":"rect","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendSymbols","property":"x","value":[1160.43,1210.25]})
    .editGraphics({"target":"colorLegendSymbols","property":"y","value":[1966,1966]})
    .editGraphics({"target":"colorLegendSymbols","property":"width","value":14})
    .editGraphics({"target":"colorLegendSymbols","property":"height","value":12})
    .editGraphics({"target":"colorLegendSymbols","property":"fill","value":["#4c78a8","#f58518"]})
    .editGraphics({"target":"colorLegendSymbols","property":"stroke","value":"white"})
    .editGraphics({"target":"colorLegendSymbols","property":"strokeWidth","value":0.5})
    .createGraphics({"id":"colorLegendLabels","type":"text","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendLabels","property":"x","value":[1182.68,1232.5]})
    .editGraphics({"target":"colorLegendLabels","property":"y","value":[1972,1972]})
    .editGraphics({"target":"colorLegendLabels","property":"text","value":["A","B"]})
    .editGraphics({"target":"colorLegendLabels","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorLegendLabels","property":"fontSize","value":12})
    .editGraphics({"target":"colorLegendLabels","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorLegendLabels","property":"fontWeight","value":"normal"})
    .editGraphics({"target":"colorLegendLabels","property":"textAlign","value":"left"})
    .editGraphics({"target":"colorLegendLabels","property":"textBaseline","value":"middle"})
    .createGraphics({"id":"colorLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"colorLegendTitle","property":"x","value":1200})
    .editGraphics({"target":"colorLegendTitle","property":"y","value":1948})
    .editGraphics({"target":"colorLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"colorLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorLegendTitle","property":"fontSize","value":13})
    .editGraphics({"target":"colorLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"colorLegendTitle","property":"textAlign","value":"center"})
    .editGraphics({"target":"colorLegendTitle","property":"textBaseline","value":"middle"});}
const variants=[{id:"right-large-text",kind:"color",options:{"position":"right","offset":40,"title":"m","symbol":{"stroke":"black","strokeWidth":40},"labels":{"fontSize":80},"titleStyle":{"fontSize":80}},primitive:primitive_right_large_text},
{id:"top-inline-line",kind:"line",options:{"position":"top","offset":40,"title":"m","titlePosition":"left","itemGap":30,"symbol":{"lineWidth":60},"labels":{"fontSize":20},"titleStyle":{"fontSize":40}},primitive:primitive_top_inline_line},
{id:"left-mapped-shapes",kind:"shape",options:{"position":"left","offset":40,"title":"m","symbol":{"layers":[{"type":"point","size":30,"stroke":"black","strokeWidth":40}]}},primitive:primitive_left_mapped_shapes},
{id:"legacy-bottom",kind:"color",options:{"position":"bottom","layout":"legacy-bottom","title":"m","itemGap":20},primitive:primitive_legacy_bottom}];
test("categorical spacing matches independent primitive graphics and pixels",async()=>{
 for(const v of variants){
  const expected=v.primitive(),actual=base(v.kind).createLegend(v.options);
  assertChartProgramsEquivalent({primitiveProgram:expected,publicProgram:actual,compareSemanticSpec:false});
  const options={width:2400,height:2000,pixelRatio:1,colors:["#4c78a8"],regions:[{name:"plot",x:590,y:590,width:1220,height:820,minimumInkPixels:20}]};
  const artifact={scope:"charts",capability:"legend-layout",chart:"categorical-spacing",variant:v.id,title:"Categorical spacing: "+v.id,userFacingCallChain:"base("+JSON.stringify(v.kind)+").createLegend("+JSON.stringify(v.options)+")"};
  const a=await assertRenderedPNG(expected,{...options,artifact:{...artifact,kind:"primitive"}});
  const b=await assertRenderedPNG(actual,{...options,artifact:{...artifact,kind:"user-facing"}});
  assert.equal(a.pixelHash,b.pixelHash);
 }
});

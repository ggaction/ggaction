import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";
function base() { return chart().createCanvas({width:2400,height:2000,margin:500}).createData({values:[{x:0,y:0,m:0},{x:10,y:10,m:10}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'}).encodeOpacity({field:'m'}); }
function primitive_right() {
  return base()
    .createGraphics({"id":"opacityLegendSymbols","type":"circle","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendSymbols","property":"x","value":[1980,1980,1980]})
    .editGraphics({"target":"opacityLegendSymbols","property":"y","value":[602,682,762]})
    .editGraphics({"target":"opacityLegendSymbols","property":"radius","value":[30,30,30]})
    .editGraphics({"target":"opacityLegendSymbols","property":"fill","value":["#4c78a8","#4c78a8","#4c78a8"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"opacity","value":[0.2,0.6000000000000001,1]})
    .editGraphics({"target":"opacityLegendSymbols","property":"stroke","value":["black","black","black"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"strokeWidth","value":[20,20,20]})
    .createGraphics({"id":"opacityLegendLabels","type":"text","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendLabels","property":"x","value":[2032,2032,2032]})
    .editGraphics({"target":"opacityLegendLabels","property":"y","value":[602,682,762]})
    .editGraphics({"target":"opacityLegendLabels","property":"text","value":["0","5","10"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fill","value":["#334155","#334155","#334155"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontSize","value":[50,50,50]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif","sans-serif"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontWeight","value":["normal","normal","normal"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textAlign","value":["left","left","left"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textBaseline","value":["middle","middle","middle"]})
    .createGraphics({"id":"opacityLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"opacityLegendTitle","property":"x","value":1940})
    .editGraphics({"target":"opacityLegendTitle","property":"y","value":520})
    .editGraphics({"target":"opacityLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"opacityLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontSize","value":60})
    .editGraphics({"target":"opacityLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"opacityLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"opacityLegendTitle","property":"textBaseline","value":"middle"});
}
function primitive_stacked() {
  return base()
    .createGraphics({"id":"opacityLegendSymbols","type":"circle","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendSymbols","property":"x","value":[1072,1200,1328]})
    .editGraphics({"target":"opacityLegendSymbols","property":"y","value":[318,318,318]})
    .editGraphics({"target":"opacityLegendSymbols","property":"radius","value":[40,40,40]})
    .editGraphics({"target":"opacityLegendSymbols","property":"fill","value":["#4c78a8","#4c78a8","#4c78a8"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"opacity","value":[0.2,0.6000000000000001,1]})
    .editGraphics({"target":"opacityLegendSymbols","property":"stroke","value":["black","black","black"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"strokeWidth","value":[20,20,20]})
    .createGraphics({"id":"opacityLegendLabels","type":"text","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendLabels","property":"x","value":[1072,1200,1328]})
    .editGraphics({"target":"opacityLegendLabels","property":"y","value":[420,420,420]})
    .editGraphics({"target":"opacityLegendLabels","property":"text","value":["0","5","10"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fill","value":["#334155","#334155","#334155"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontSize","value":[80,80,80]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif","sans-serif"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontWeight","value":["normal","normal","normal"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textAlign","value":["center","center","center"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textBaseline","value":["middle","middle","middle"]})
    .createGraphics({"id":"opacityLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"opacityLegendTitle","property":"x","value":1200})
    .editGraphics({"target":"opacityLegendTitle","property":"y","value":226})
    .editGraphics({"target":"opacityLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"opacityLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontSize","value":60})
    .editGraphics({"target":"opacityLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"opacityLegendTitle","property":"textAlign","value":"center"})
    .editGraphics({"target":"opacityLegendTitle","property":"textBaseline","value":"middle"});
}
// Inline width is 51.168 + 20 + 426; x starts at 500 + (1400 - 497.168) / 2.
function primitive_inline() {
  return base()
    .createGraphics({"id":"opacityLegendSymbols","type":"circle","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendSymbols","property":"x","value":[1062.5839999999998,1201.0839999999998,1339.5839999999998]})
    .editGraphics({"target":"opacityLegendSymbols","property":"y","value":[1580,1580,1580]})
    .editGraphics({"target":"opacityLegendSymbols","property":"radius","value":[30,30,30]})
    .editGraphics({"target":"opacityLegendSymbols","property":"fill","value":["#4c78a8","#4c78a8","#4c78a8"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"opacity","value":[0.2,0.6000000000000001,1]})
    .editGraphics({"target":"opacityLegendSymbols","property":"stroke","value":["black","black","black"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"strokeWidth","value":[20,20,20]})
    .createGraphics({"id":"opacityLegendLabels","type":"text","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendLabels","property":"x","value":[1110.5839999999998,1249.0839999999998,1387.5839999999998]})
    .editGraphics({"target":"opacityLegendLabels","property":"y","value":[1580,1580,1580]})
    .editGraphics({"target":"opacityLegendLabels","property":"text","value":["0","5","10"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fill","value":["#334155","#334155","#334155"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontSize","value":[50,50,50]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif","sans-serif"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontWeight","value":["normal","normal","normal"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textAlign","value":["left","left","left"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textBaseline","value":["middle","middle","middle"]})
    .createGraphics({"id":"opacityLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"opacityLegendTitle","property":"x","value":951.4159999999999})
    .editGraphics({"target":"opacityLegendTitle","property":"y","value":1580})
    .editGraphics({"target":"opacityLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"opacityLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontSize","value":60})
    .editGraphics({"target":"opacityLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"opacityLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"opacityLegendTitle","property":"textBaseline","value":"middle"});
}

function laneBase(){return chart().createCanvas({width:2400,height:2000,margin:500}).createData({values:[{x:0,y:0,m:0},{x:10,y:10,m:10}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'}).encodeOpacity({field:'m'}).encodeColor({field:'m',fieldType:'nominal'});}
// Mirrored label distance is 40 + 12 = 52, so the shared label column is 16 + 52 = 68, replacing 44.
function primitive_lane() {
  return laneBase()
    .createGraphics({"id":"colorLegendSymbols","type":"rect","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendSymbols","property":"x","value":[340,340]})
    .editGraphics({"target":"colorLegendSymbols","property":"y","value":[546,574]})
    .editGraphics({"target":"colorLegendSymbols","property":"width","value":[14,14]})
    .editGraphics({"target":"colorLegendSymbols","property":"height","value":[12,12]})
    .editGraphics({"target":"colorLegendSymbols","property":"fill","value":["#4c78a8","#f58518"]})
    .editGraphics({"target":"colorLegendSymbols","property":"stroke","value":["white","white"]})
    .editGraphics({"target":"colorLegendSymbols","property":"strokeWidth","value":[0.5,0.5]})
    .createGraphics({"id":"colorLegendLabels","type":"text","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendLabels","property":"x","value":[399,399]})
    .editGraphics({"target":"colorLegendLabels","property":"y","value":[552,580]})
    .editGraphics({"target":"colorLegendLabels","property":"text","value":["0","10"]})
    .editGraphics({"target":"colorLegendLabels","property":"fill","value":["#334155","#334155"]})
    .editGraphics({"target":"colorLegendLabels","property":"fontSize","value":[12,12]})
    .editGraphics({"target":"colorLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif"]})
    .editGraphics({"target":"colorLegendLabels","property":"fontWeight","value":["normal","normal"]})
    .editGraphics({"target":"colorLegendLabels","property":"textAlign","value":["left","left"]})
    .editGraphics({"target":"colorLegendLabels","property":"textBaseline","value":["middle","middle"]})
    .createGraphics({"id":"colorLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"colorLegendTitle","property":"x","value":331})
    .editGraphics({"target":"colorLegendTitle","property":"y","value":520})
    .editGraphics({"target":"colorLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"colorLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorLegendTitle","property":"fontSize","value":13})
    .editGraphics({"target":"colorLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"colorLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"colorLegendTitle","property":"textBaseline","value":"middle"})
    .createGraphics({"id":"opacityLegendBackground","type":"rect","parent":"canvas"})
    .editGraphics({"target":"opacityLegendBackground","property":"x","value":295})
    .editGraphics({"target":"opacityLegendBackground","property":"y","value":611})
    .editGraphics({"target":"opacityLegendBackground","property":"width","value":177})
    .editGraphics({"target":"opacityLegendBackground","property":"height","value":336})
    .editGraphics({"target":"opacityLegendBackground","property":"fill","value":"transparent"})
    .editGraphics({"target":"opacityLegendBackground","property":"stroke","value":"#cbd5e1"})
    .editGraphics({"target":"opacityLegendBackground","property":"strokeWidth","value":1})
    .createGraphics({"id":"opacityLegendSymbols","type":"circle","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendSymbols","property":"x","value":[347,347,347]})
    .editGraphics({"target":"opacityLegendSymbols","property":"y","value":[735,815,895]})
    .editGraphics({"target":"opacityLegendSymbols","property":"radius","value":[30,30,30]})
    .editGraphics({"target":"opacityLegendSymbols","property":"fill","value":["#4c78a8","#4c78a8","#4c78a8"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"opacity","value":[0.2,0.6000000000000001,1]})
    .editGraphics({"target":"opacityLegendSymbols","property":"stroke","value":["black","black","black"]})
    .editGraphics({"target":"opacityLegendSymbols","property":"strokeWidth","value":[20,20,20]})
    .createGraphics({"id":"opacityLegendLabels","type":"text","parent":"canvas","length":3})
    .editGraphics({"target":"opacityLegendLabels","property":"x","value":[399,399,399]})
    .editGraphics({"target":"opacityLegendLabels","property":"y","value":[735,815,895]})
    .editGraphics({"target":"opacityLegendLabels","property":"text","value":["0","5","10"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fill","value":["#334155","#334155","#334155"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontSize","value":[50,50,50]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif","sans-serif"]})
    .editGraphics({"target":"opacityLegendLabels","property":"fontWeight","value":["normal","normal","normal"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textAlign","value":["left","left","left"]})
    .editGraphics({"target":"opacityLegendLabels","property":"textBaseline","value":["middle","middle","middle"]})
    .createGraphics({"id":"opacityLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"opacityLegendTitle","property":"x","value":331})
    .editGraphics({"target":"opacityLegendTitle","property":"y","value":653})
    .editGraphics({"target":"opacityLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"opacityLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontSize","value":60})
    .editGraphics({"target":"opacityLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"opacityLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"opacityLegendTitle","property":"textAlign","value":"left"})
    .editGraphics({"target":"opacityLegendTitle","property":"textBaseline","value":"middle"});
}

const cases = [{"id":"right","options":{"channels":["opacity"],"count":3,"offset":40,"position":"right","symbol":{"radius":30,"stroke":"black","strokeWidth":20},"labels":{"fontSize":50},"titleStyle":{"fontSize":60}}},{"id":"stacked","options":{"channels":["opacity"],"count":3,"offset":40,"position":"top","symbol":{"radius":40,"stroke":"black","strokeWidth":20},"labels":{"fontSize":80},"titleStyle":{"fontSize":60}}},{"id":"inline","options":{"channels":["opacity"],"count":3,"offset":40,"position":"bottom","titlePosition":"left","symbol":{"radius":30,"stroke":"black","strokeWidth":20},"labels":{"fontSize":50},"titleStyle":{"fontSize":60}}}];
cases.push({"id":"lane","options":{"channels":["opacity"],"position":"left","count":3,"offset":40,"border":true,"symbol":{"radius":30,"stroke":"black","strokeWidth":20},"labels":{"fontSize":50},"titleStyle":{"fontSize":60}}});
const primitives = [primitive_right, primitive_stacked, primitive_inline, primitive_lane];
test("large opacity samples and text match independent spacing primitives", async () => {
  for (const [index, c] of cases.entries()) {
    const expected = primitives[index]();
    const actual = c.id === "lane" ? laneBase().createLegend({channels:["color"],position:"left",offset:40}).createLegend(c.options) : base().createLegend(c.options);
    assertChartProgramsEquivalent({ primitiveProgram: expected, publicProgram: actual, compareSemanticSpec: false });
    const options = { width: 2400, height: 2000, pixelRatio: 1, colors: ["#4c78a8"], regions: [{name:"marks",x:490,y:490,width:1420,height:1020,minimumInkPixels:20}] };
    const artifact = {scope:"charts",capability:"legend-layout",chart:"opacity-spacing",variant:c.id,title:"Opacity legend spacing: "+c.id,userFacingCallChain:(c.id === "lane" ? "laneBase().createLegend({channels:[\"color\"],position:\"left\",offset:40}).createLegend(" : "base().createLegend(")+JSON.stringify(c.options)+")"};
    const a = await assertRenderedPNG(expected, {...options,artifact:{...artifact,kind:"primitive"}});
    const b = await assertRenderedPNG(actual, {...options,artifact:{...artifact,kind:"user-facing"}});
    assert.equal(a.pixelHash,b.pixelHash);
  }
});

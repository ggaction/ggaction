import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";
function base(kind){let p=chart().createCanvas({width:1200,height:1000,margin:300}).createData({values:[{x:0,y:0,m:0,g:'A'},{x:10,y:10,m:10,g:'B'}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'});return kind==='color'?p.encodeColor({field:'g'}):kind==='gradient'?p.encodeColor({field:'m',fieldType:'quantitative'}):p.encodeSize({field:'m'});}
function primitive0() {
  return base("color")
    .createGraphics({"id":"colorLegendBackground","type":"rect","parent":"canvas"})
    .editGraphics({"target":"colorLegendBackground","property":"x","value":300.5})
    .editGraphics({"target":"colorLegendBackground","property":"y","value":198})
    .editGraphics({"target":"colorLegendBackground","property":"width","value":388.82+7.32+12-300.5})
    .editGraphics({"target":"colorLegendBackground","property":"height","value":61.5})
    .editGraphics({"target":"colorLegendBackground","property":"fill","value":"transparent"})
    .editGraphics({"target":"colorLegendBackground","property":"stroke","value":"#cbd5e1"})
    .editGraphics({"target":"colorLegendBackground","property":"strokeWidth","value":1})
    .createGraphics({"id":"colorLegendSymbols","type":"rect","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendSymbols","property":"x","value":[312.75,366.57]})
    .editGraphics({"target":"colorLegendSymbols","property":"y","value":[235.25,235.25]})
    .editGraphics({"target":"colorLegendSymbols","property":"width","value":[14,14]})
    .editGraphics({"target":"colorLegendSymbols","property":"height","value":[12,12]})
    .editGraphics({"target":"colorLegendSymbols","property":"fill","value":["#4c78a8","#f58518"]})
    .editGraphics({"target":"colorLegendSymbols","property":"stroke","value":["white","white"]})
    .editGraphics({"target":"colorLegendSymbols","property":"strokeWidth","value":[0.5,0.5]})
    .createGraphics({"id":"colorLegendLabels","type":"text","parent":"canvas","length":2})
    .editGraphics({"target":"colorLegendLabels","property":"x","value":[335,388.82]})
    .editGraphics({"target":"colorLegendLabels","property":"y","value":[241.25,241.25]})
    .editGraphics({"target":"colorLegendLabels","property":"text","value":["A","B"]})
    .editGraphics({"target":"colorLegendLabels","property":"fill","value":["#334155","#334155"]})
    .editGraphics({"target":"colorLegendLabels","property":"fontSize","value":[12,12]})
    .editGraphics({"target":"colorLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif"]})
    .editGraphics({"target":"colorLegendLabels","property":"fontWeight","value":["normal","normal"]})
    .editGraphics({"target":"colorLegendLabels","property":"textAlign","value":["left","left"]})
    .editGraphics({"target":"colorLegendLabels","property":"textBaseline","value":["middle","middle"]})
    .createGraphics({"id":"colorLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"colorLegendTitle","property":"x","value":354.32})
    .editGraphics({"target":"colorLegendTitle","property":"y","value":216.5})
    .editGraphics({"target":"colorLegendTitle","property":"text","value":"g"})
    .editGraphics({"target":"colorLegendTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorLegendTitle","property":"fontSize","value":13})
    .editGraphics({"target":"colorLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"colorLegendTitle","property":"textAlign","value":"center"})
    .editGraphics({"target":"colorLegendTitle","property":"textBaseline","value":"middle"});
}
function primitive1() {
  return base("gradient")
    .createGraphics({"id":"colorGradientBackground","type":"rect","parent":"canvas"})
    .editGraphics({"target":"colorGradientBackground","property":"x","value":744.52})
    .editGraphics({"target":"colorGradientBackground","property":"y","value":740.5})
    .editGraphics({"target":"colorGradientBackground","property":"width","value":154.98000000000002})
    .editGraphics({"target":"colorGradientBackground","property":"height","value":85})
    .editGraphics({"target":"colorGradientBackground","property":"fill","value":"transparent"})
    .editGraphics({"target":"colorGradientBackground","property":"stroke","value":"#cbd5e1"})
    .editGraphics({"target":"colorGradientBackground","property":"strokeWidth","value":1})
    .createGraphics({"id":"colorGradientStrips","type":"rect","parent":"canvas","length":60})
    .editGraphics({"target":"colorGradientStrips","property":"x","value":[760.18,762.18,764.18,766.18,768.18,770.18,772.18,774.18,776.18,778.18,780.18,782.18,784.18,786.18,788.18,790.18,792.18,794.18,796.18,798.18,800.18,802.18,804.18,806.18,808.18,810.18,812.18,814.18,816.18,818.18,820.18,822.18,824.18,826.18,828.18,830.18,832.18,834.18,836.18,838.18,840.18,842.18,844.18,846.18,848.18,850.18,852.18,854.18,856.18,858.18,860.18,862.18,864.18,866.18,868.18,870.18,872.18,874.18,876.18,878.18]})
    .editGraphics({"target":"colorGradientStrips","property":"y","value":[777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5,777.5]})
    .editGraphics({"target":"colorGradientStrips","property":"width","value":[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]})
    .editGraphics({"target":"colorGradientStrips","property":"height","value":[12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12]})
    .editGraphics({"target":"colorGradientStrips","property":"fill","value":["#450457","#460b5e","#471164","#481769","#481d6e","#482273","#482877","#472d7b","#46327f","#453782","#433d84","#424286","#404788","#3e4c89","#3c508b","#3a548c","#38598c","#365e8d","#34628d","#32668e","#306a8e","#2e6e8e","#2c728e","#2b768e","#297a8e","#287f8e","#26838e","#24868e","#238a8e","#228f8d","#21938d","#20968c","#1f9a8a","#1f9e89","#20a287","#21a685","#24aa83","#28ae80","#2db27e","#32b57b","#39b977","#40bd73","#47c16f","#50c46a","#59c765","#62ca60","#6bcd5a","#75d054","#7fd34e","#8ad647","#95d841","#a0da3a","#abdc32","#b6de2b","#c2e024","#cde11e","#d8e31b","#e3e41a","#eee61d","#f8e722"]})
    .editGraphics({"target":"colorGradientStrips","property":"stroke","value":["#450457","#460b5e","#471164","#481769","#481d6e","#482273","#482877","#472d7b","#46327f","#453782","#433d84","#424286","#404788","#3e4c89","#3c508b","#3a548c","#38598c","#365e8d","#34628d","#32668e","#306a8e","#2e6e8e","#2c728e","#2b768e","#297a8e","#287f8e","#26838e","#24868e","#238a8e","#228f8d","#21938d","#20968c","#1f9a8a","#1f9e89","#20a287","#21a685","#24aa83","#28ae80","#2db27e","#32b57b","#39b977","#40bd73","#47c16f","#50c46a","#59c765","#62ca60","#6bcd5a","#75d054","#7fd34e","#8ad647","#95d841","#a0da3a","#abdc32","#b6de2b","#c2e024","#cde11e","#d8e31b","#e3e41a","#eee61d","#f8e722"]})
    .editGraphics({"target":"colorGradientStrips","property":"strokeWidth","value":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]})
    .createGraphics({"id":"colorGradientTicks","type":"line","parent":"canvas","length":5})
    .editGraphics({"target":"colorGradientTicks","property":"x1","value":[760.18,790.18,820.18,850.18,880.18]})
    .editGraphics({"target":"colorGradientTicks","property":"y1","value":[789.5,789.5,789.5,789.5,789.5]})
    .editGraphics({"target":"colorGradientTicks","property":"x2","value":[760.18,790.18,820.18,850.18,880.18]})
    .editGraphics({"target":"colorGradientTicks","property":"y2","value":[795.5,795.5,795.5,795.5,795.5]})
    .editGraphics({"target":"colorGradientTicks","property":"stroke","value":["#64748b","#64748b","#64748b","#64748b","#64748b"]})
    .editGraphics({"target":"colorGradientTicks","property":"strokeWidth","value":[1,1,1,1,1]})
    .createGraphics({"id":"colorGradientLabels","type":"text","parent":"canvas","length":5})
    .editGraphics({"target":"colorGradientLabels","property":"x","value":[760.18,790.18,820.18,850.18,880.18]})
    .editGraphics({"target":"colorGradientLabels","property":"y","value":[807.5,807.5,807.5,807.5,807.5]})
    .editGraphics({"target":"colorGradientLabels","property":"text","value":["0","2.5","5","7.5","10"]})
    .editGraphics({"target":"colorGradientLabels","property":"fill","value":["#334155","#334155","#334155","#334155","#334155"]})
    .editGraphics({"target":"colorGradientLabels","property":"fontSize","value":[12,12,12,12,12]})
    .editGraphics({"target":"colorGradientLabels","property":"fontFamily","value":["sans-serif","sans-serif","sans-serif","sans-serif","sans-serif"]})
    .editGraphics({"target":"colorGradientLabels","property":"fontWeight","value":["normal","normal","normal","normal","normal"]})
    .editGraphics({"target":"colorGradientLabels","property":"textAlign","value":["center","center","center","center","center"]})
    .editGraphics({"target":"colorGradientLabels","property":"textBaseline","value":["middle","middle","middle","middle","middle"]})
    .createGraphics({"id":"colorGradientTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"colorGradientTitle","property":"x","value":820.18})
    .editGraphics({"target":"colorGradientTitle","property":"y","value":759})
    .editGraphics({"target":"colorGradientTitle","property":"text","value":"m"})
    .editGraphics({"target":"colorGradientTitle","property":"fill","value":"#334155"})
    .editGraphics({"target":"colorGradientTitle","property":"fontSize","value":13})
    .editGraphics({"target":"colorGradientTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"colorGradientTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"colorGradientTitle","property":"textAlign","value":"center"})
    .editGraphics({"target":"colorGradientTitle","property":"textBaseline","value":"middle"});
}
function primitive2() {
  return base("size")
    .createGraphics({"id":"sizeLegendBackground","type":"rect","parent":"canvas"})
    .editGraphics({"target":"sizeLegendBackground","property":"x","value":372.0980234021147})
    .editGraphics({"target":"sizeLegendBackground","property":"y","value":194.70269166066282})
    .editGraphics({"target":"sizeLegendBackground","property":"width","value":455.80395319577065})
    .editGraphics({"target":"sizeLegendBackground","property":"height","value":64.79730833933718})
    .editGraphics({"target":"sizeLegendBackground","property":"fill","value":"transparent"})
    .editGraphics({"target":"sizeLegendBackground","property":"stroke","value":"#cbd5e1"})
    .editGraphics({"target":"sizeLegendBackground","property":"strokeWidth","value":1})
    .createGraphics({"id":"sizeLegendSymbols","type":"circle","parent":"canvas","length":5})
    .editGraphics({"target":"sizeLegendSymbols","property":"x","value":[386.86197659788536,478.18197659788535,580.0619765978854,671.3819765978853,773.2619765978853]})
    .editGraphics({"target":"sizeLegendSymbols","property":"y","value":[239.6013458303314,239.6013458303314,239.6013458303314,239.6013458303314,239.6013458303314]})
    .editGraphics({"target":"sizeLegendSymbols","property":"radius","value":[2.763953195770684,4.61809077155419,5.917270272703197,6.978639737521917,7.898654169668588]})
    .editGraphics({"target":"sizeLegendSymbols","property":"fill","value":["#94a3b8","#94a3b8","#94a3b8","#94a3b8","#94a3b8"]})
    .editGraphics({"target":"sizeLegendSymbols","property":"opacity","value":[0.7,0.7,0.7,0.7,0.7]})
    .createGraphics({"id":"sizeLegendLabels","type":"text","parent":"canvas","length":5})
    .editGraphics({"target":"sizeLegendLabels","property":"x","value":[414.86197659788536,506.1819765978853,608.0619765978854,699.3819765978853,801.2619765978853]})
    .editGraphics({"target":"sizeLegendLabels","property":"y","value":[239.6013458303314,239.6013458303314,239.6013458303314,239.6013458303314,239.6013458303314]})
    .editGraphics({"target":"sizeLegendLabels","property":"text","value":["0","2.5","5","7.5","10"]})
    .editGraphics({"target":"sizeLegendLabels","property":"fill","value":["#334155","#334155","#334155","#334155","#334155"]})
    .editGraphics({"target":"sizeLegendLabels","property":"fontSize","value":[12,12,12,12,12]})
    .editGraphics({"target":"sizeLegendLabels","property":"fontFamily","value":["sans-serif","sans-serif","sans-serif","sans-serif","sans-serif"]})
    .editGraphics({"target":"sizeLegendLabels","property":"fontWeight","value":["normal","normal","normal","normal","normal"]})
    .editGraphics({"target":"sizeLegendLabels","property":"textAlign","value":["left","left","left","left","left"]})
    .editGraphics({"target":"sizeLegendLabels","property":"textBaseline","value":["middle","middle","middle","middle","middle"]})
    .createGraphics({"id":"sizeLegendTitle","type":"text","parent":"canvas"})
    .editGraphics({"target":"sizeLegendTitle","property":"x","value":593.3819765978853})
    .editGraphics({"target":"sizeLegendTitle","property":"y","value":213.20269166066282})
    .editGraphics({"target":"sizeLegendTitle","property":"text","value":"m"})
    .editGraphics({"target":"sizeLegendTitle","property":"fill","value":"#0f172a"})
    .editGraphics({"target":"sizeLegendTitle","property":"fontSize","value":13})
    .editGraphics({"target":"sizeLegendTitle","property":"fontFamily","value":"sans-serif"})
    .editGraphics({"target":"sizeLegendTitle","property":"fontWeight","value":600})
    .editGraphics({"target":"sizeLegendTitle","property":"textAlign","value":"center"})
    .editGraphics({"target":"sizeLegendTitle","property":"textBaseline","value":"middle"});
}

const cases = [{"kind":"color","position":"top","align":"left"},{"kind":"gradient","position":"bottom","align":"right"},{"kind":"size","position":"top","align":"center"}];
const primitives = [primitive0, primitive1, primitive2];
test("single horizontal legends match literal occupied-bound primitive targets", async () => {
  for (const [index, c] of cases.entries()) {
    const expected = primitives[index]();
    const actual = base(c.kind).createLegend({ position: c.position, align: c.align, border: true, offset: 40 });
    assertChartProgramsEquivalent({ primitiveProgram: expected, publicProgram: actual, compareSemanticSpec: false });
    const options = { width: 1200, height: 1000, colors: c.kind === "gradient" ? ["#440154", "#fde725"] : c.kind === "size" ? ["#4c78a8"] : ["#4c78a8", "#f58518"], regions: [{ name: "marks", x: 290, y: 290, width: 620, height: 420, minimumInkPixels: 20 }] };
    const artifact = { scope: "charts", capability: "legend-layout", chart: "occupied-legend-alignment", variant: c.kind, title: c.kind + " legend at " + c.position, userFacingCallChain: "base(" + JSON.stringify(c.kind) + ").createLegend(" + JSON.stringify({position:c.position,align:c.align,border:true,offset:40}) + ")" };
    const a = await assertRenderedPNG(expected, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const b = await assertRenderedPNG(actual, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(a.pixelHash, b.pixelHash);
  }
});

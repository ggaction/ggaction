import assert from "node:assert/strict";
import test from "node:test";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { chart } from "../../src/index.js";
import { assertRenderedPNG } from "../support/png.js";
const edgeReferences = {
  right: { x: [790,790], y: [252,292], labelX: [834,834], title: [790,220], align: "left" },
  left: { x: [151.36,151.36], y: [252,292], labelX: [195.36,195.36], title: [151.36,220], align: "left" },
  top: { x: [425.02,516.3399999999999], y: [164,164], labelX: [469.02,560.3399999999999], title: [500,139.5], align: "center" },
  bottom: { x: [425.02,516.3399999999999], y: [561,561], labelX: [469.02,560.3399999999999], title: [500,536.5], align: "center" }
};
function sizeBase() {
  return chart().createCanvas({width:1000,height:700,margin:{left:240,right:240,top:200,bottom:200}})
    .createData({values:[{x:1,y:1,m:0},{x:2,y:2,m:10}]}).createPointMark()
    .encodeX({field:"x"}).encodeY({field:"y"})
    .encodeSize({field:"m",scale:{domain:[0,10],range:[4*Math.PI,36*Math.PI]}});
}
function sizePrimitive(base, edge) {
  const r=edgeReferences[edge];
  return base.createGraphics({id:"sizeLegendSymbols",type:"circle",length:2,parent:"canvas"})
    .editGraphics({target:"sizeLegendSymbols",property:"x",value:r.x.map(x=>x+16)})
    .editGraphics({target:"sizeLegendSymbols",property:"y",value:r.y})
    .editGraphics({target:"sizeLegendSymbols",property:"radius",value:[2,6]})
    .editGraphics({target:"sizeLegendSymbols",property:"fill",value:"#94a3b8"})
    .editGraphics({target:"sizeLegendSymbols",property:"opacity",value:0.7})
    .createGraphics({id:"sizeLegendLabels",type:"text",length:2,parent:"canvas"})
    .editGraphics({target:"sizeLegendLabels",property:"x",value:r.labelX})
    .editGraphics({target:"sizeLegendLabels",property:"y",value:r.y})
    .editGraphics({target:"sizeLegendLabels",property:"text",value:["0","10"]})
    .editGraphics({target:"sizeLegendLabels",property:"fill",value:"#334155"})
    .editGraphics({target:"sizeLegendLabels",property:"fontSize",value:12})
    .editGraphics({target:"sizeLegendLabels",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"sizeLegendLabels",property:"fontWeight",value:"normal"})
    .editGraphics({target:"sizeLegendLabels",property:"textAlign",value:"left"})
    .editGraphics({target:"sizeLegendLabels",property:"textBaseline",value:"middle"})
    .createGraphics({id:"sizeLegendTitle",type:"text",parent:"canvas"})
    .editGraphics({target:"sizeLegendTitle",property:"x",value:r.title[0]})
    .editGraphics({target:"sizeLegendTitle",property:"y",value:r.title[1]})
    .editGraphics({target:"sizeLegendTitle",property:"text",value:"m"})
    .editGraphics({target:"sizeLegendTitle",property:"fill",value:"#0f172a"})
    .editGraphics({target:"sizeLegendTitle",property:"fontSize",value:13})
    .editGraphics({target:"sizeLegendTitle",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"sizeLegendTitle",property:"fontWeight",value:600})
    .editGraphics({target:"sizeLegendTitle",property:"textAlign",value:r.align})
    .editGraphics({target:"sizeLegendTitle",property:"textBaseline",value:"middle"});
}

test("places size legends at four edges with exact primitive graphics and pixels", async () => {
  for (const edge of Object.keys(edgeReferences)) {
    const base = sizeBase();
    const primitive = sizePrimitive(base, edge);
    const publicProgram = base.createLegend({ channels: ["size"], count: 2, position: edge });
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram, compareSemanticSpec: false });
    const options = { width: 1000, height: 700, colors: ["#4c78a8"],
      regions: [{ name: "plot", x: 235, y: 195, width: 535, height: 315, minimumInkPixels: 20 }] };
    const artifact = { scope: "charts", capability: "legend-layout", chart: "size-legend-edges", variant: edge,
      title: `Size legend at ${edge}`, userFacingCallChain: `base.createLegend({ channels: ["size"], count: 2, position: "${edge}" })` };
    const expected = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const actual = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(actual.pixelHash, expected.pixelHash);
  }
});

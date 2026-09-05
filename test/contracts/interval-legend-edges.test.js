import assert from "node:assert/strict";
import test from "node:test";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { chart } from "../../src/index.js";
import { assertRenderedPNG } from "../support/png.js";
const edgeReferences = {
  right: { x: [790,790], y: [252,280], labelX: [812,812], title: [790,220], align: "left" },
  left: { x: [165.32,165.32], y: [252,280], labelX: [187.32,187.32], title: [165.32,220], align: "left" },
  top: { x: [444.5,510.82], y: [164,164], labelX: [466.5,532.8199999999999], title: [500,139.5], align: "center" },
  bottom: { x: [444.5,510.82], y: [561,561], labelX: [466.5,532.8199999999999], title: [500,536.5], align: "center" }
};
// Align the literal occupied content, including sample strokes or unused slots.
for (const edge of ["top", "bottom"]) {
  const r = edgeReferences[edge], dx = 500 - ((r.x[0] - 0.25) + (r.labelX[1] + 22.68)) / 2, dy = edge === "top" ? -0.25 : 0;
  r.x = r.x.map(x => x + dx);
  r.labelX = r.labelX.map(x => x + dx);
  r.y = r.y.map(y => y + dy);
  r.title = [r.title[0] + dx, r.title[1] + dy];
}
function intervalBase() {
  return chart().createCanvas({width:1000,height:700,margin:{left:240,right:240,top:200,bottom:200}})
    .createData({values:[{x:1,y:1,m:0},{x:2,y:2,m:10}]}).createPointMark()
    .encodeX({field:"x"}).encodeY({field:"y"}).encodeColor({field:"m",fieldType:"quantitative",scale:{type:"quantize",range:["#4c78a8","#f58518"]}});
}
function intervalPrimitive(base, edge) {
  const r=edgeReferences[edge];
  return base.createGraphics({id:"colorLegendSymbols",type:"rect",length:2,parent:"canvas"})
    .editGraphics({target:"colorLegendSymbols",property:"x",value:r.x})
    .editGraphics({target:"colorLegendSymbols",property:"y",value:r.y.map(y=>y-6)})
    .editGraphics({target:"colorLegendSymbols",property:"width",value:14})
    .editGraphics({target:"colorLegendSymbols",property:"height",value:12})
    .editGraphics({target:"colorLegendSymbols",property:"fill",value:["#4c78a8","#f58518"]})
    .editGraphics({target:"colorLegendSymbols",property:"stroke",value:"white"})
    .editGraphics({target:"colorLegendSymbols",property:"strokeWidth",value:0.5})
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

test("places interval legends at four edges with exact primitive graphics and pixels", async () => {
  for (const edge of Object.keys(edgeReferences)) {
    const base = intervalBase();
    const primitive = intervalPrimitive(base, edge);
    const publicProgram = base.createLegend({ channels: ["color"], position: edge });
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram, compareSemanticSpec: false });
    const options = { width: 1000, height: 700, colors: ["#4c78a8", "#f58518"],
      regions: [{ name: "plot", x: 235, y: 195, width: 535, height: 315, minimumInkPixels: 20 }] };
    const artifact = { scope: "charts", capability: "legend-layout", chart: "interval-legend-edges", variant: edge,
      title: `Interval legend at ${edge}`, userFacingCallChain: `base.createLegend({ channels: ["color"], position: "${edge}" })` };
    const expected = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const actual = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(actual.pixelHash, expected.pixelHash);
  }
});

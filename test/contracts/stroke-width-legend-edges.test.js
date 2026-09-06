import assert from "node:assert/strict";
import test from "node:test";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { chart } from "../../src/index.js";
import { assertRenderedPNG } from "../support/png.js";
const edgeReferences = {
  right: { x: [795,795], y: [252,284], labelX: [844,844], title: [790,220], align: "left" },
  left: { x: [146.36,146.36], y: [252,284], labelX: [195.36,195.36], title: [141.36,220], align: "left" },
  top: { x: [424.02,517.3399999999999], y: [164,164], labelX: [473.02,566.3399999999999], title: [500,139.5], align: "center" },
  bottom: { x: [424.02,517.3399999999999], y: [561,561], labelX: [473.02,566.3399999999999], title: [500,536.5], align: "center" }
};
// Align the literal occupied content, including sample strokes or unused slots.
for (const edge of ["top", "bottom"]) {
  const r = edgeReferences[edge], dx = 500 - ((r.x[0] - 1) + (r.labelX[1] + 14.64)) / 2;
  r.x = r.x.map(x => x + dx);
  r.labelX = r.labelX.map(x => x + dx);
  r.title = [r.title[0] + dx, r.title[1]];
}
function widthBase() {
  return chart().createCanvas({width:1000,height:700,margin:{left:240,right:240,top:200,bottom:200}})
    .createData({values:[{x:1,y:1,g:"A",m:0},{x:2,y:2,g:"A",m:0},{x:1,y:2,g:"B",m:10},{x:2,y:1,g:"B",m:10}]})
    .createLineMark().encodeX({field:"x"}).encodeY({field:"y"}).encodeGroup({field:"g"})
    .encodeStrokeWidth({field:"m",scale:{domain:[0,10],range:[2,10]}});
}
function widthPrimitive(base, edge) {
  const r=edgeReferences[edge];
  return base.createGraphics({id:"strokeWidthLegendSymbols",type:"line",length:2,parent:"canvas"})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"x1",value:r.x})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"x2",value:r.x.map(x=>x+32)})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"y1",value:r.y})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"y2",value:r.y})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"stroke",value:"#4c78a8"})
    .editGraphics({target:"strokeWidthLegendSymbols",property:"strokeWidth",value:[2,10]})
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

test("places stroke-width legends at four edges with exact primitive graphics and pixels", async () => {
  for (const edge of Object.keys(edgeReferences)) {
    const base = widthBase();
    const primitive = widthPrimitive(base, edge);
    const publicProgram = base.createLegend({ channels: ["strokeWidth"], count: 2, position: edge });
    assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram, compareSemanticSpec: false });
    const options = { width: 1000, height: 700, colors: ["#4c78a8"],
      regions: [{ name: "plot", x: 235, y: 195, width: 535, height: 315, minimumInkPixels: 20 }] };
    const artifact = { scope: "charts", capability: "legend-layout", chart: "stroke-width-legend-edges", variant: edge,
      title: `Stroke-width legend at ${edge}`, userFacingCallChain: `base.createLegend({ channels: ["strokeWidth"], count: 2, position: "${edge}" })` };
    const expected = await assertRenderedPNG(primitive, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const actual = await assertRenderedPNG(publicProgram, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(actual.pixelHash, expected.pixelHash);
  }
});

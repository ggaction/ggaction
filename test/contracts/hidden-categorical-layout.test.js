import {chart} from '../../src/index.js';
import assert from "node:assert/strict";
import test from "node:test";
import { assertChartProgramsEquivalent } from "../support/chart-equivalence.js";
import { assertRenderedPNG } from "../support/png.js";
export function base() {return chart().createCanvas({width:1000,height:800,margin:250})
.createData({values:[{x:0,y:0,g:'A'},{x:10,y:10,g:'B'}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'}).encodeColor({field:'g'});}
export function primitive(position){
 const top=position==='top';
 // Each slot includes the swatch's half-pixel stroke on both sides.
 const gap=top?24:20, column=14.5+8+7.32, width=2*column+gap;
 const start=250+(500-width)/2, x=[start+.25,start+column+gap+.25];
 const labels=x.map(value=>value+14.25+8), y=top?217.25:570.75;
 const left=x[0]-.25-12, right=labels[1]+7.32+12;
 return base().createGraphics({id:'colorLegendBackground',type:'rect',parent:'canvas'})
 .editGraphics({target:'colorLegendBackground',property:'x',value:left})
 .editGraphics({target:'colorLegendBackground',property:'y',value:top?205:558.5})
 .editGraphics({target:'colorLegendBackground',property:'width',value:right-left})
 .editGraphics({target:'colorLegendBackground',property:'height',value:36.5})
 .editGraphics({target:'colorLegendBackground',property:'fill',value:'transparent'})
 .editGraphics({target:'colorLegendBackground',property:'stroke',value:'#cbd5e1'})
 .editGraphics({target:'colorLegendBackground',property:'strokeWidth',value:1})
 .createGraphics({id:'colorLegendSymbols',type:'rect',length:2,parent:'canvas'})
 .editGraphics({target:'colorLegendSymbols',property:'x',value:x})
 .editGraphics({target:'colorLegendSymbols',property:'y',value:y})
 .editGraphics({target:'colorLegendSymbols',property:'width',value:14})
 .editGraphics({target:'colorLegendSymbols',property:'height',value:12})
 .editGraphics({target:'colorLegendSymbols',property:'fill',value:['#4c78a8','#f58518']})
 .editGraphics({target:'colorLegendSymbols',property:'stroke',value:'white'})
 .editGraphics({target:'colorLegendSymbols',property:'strokeWidth',value:0.5})
 .createGraphics({id:'colorLegendLabels',type:'text',length:2,parent:'canvas'})
 .editGraphics({target:'colorLegendLabels',property:'x',value:labels})
 .editGraphics({target:'colorLegendLabels',property:'y',value:y+6})
 .editGraphics({target:'colorLegendLabels',property:'text',value:['A','B']})
 .editGraphics({target:'colorLegendLabels',property:'fill',value:'#334155'})
 .editGraphics({target:'colorLegendLabels',property:'fontSize',value:12})
 .editGraphics({target:'colorLegendLabels',property:'fontFamily',value:'sans-serif'})
 .editGraphics({target:'colorLegendLabels',property:'fontWeight',value:'normal'})
 .editGraphics({target:'colorLegendLabels',property:'textAlign',value:'left'})
 .editGraphics({target:'colorLegendLabels',property:'textBaseline',value:'middle'});
}

test("hidden categorical edge legends match literal primitive bounds and pixels", async () => {
  for (const position of ["top", "bottom"]) {
    const expected = primitive(position);
    const actual = base().createLegend({ position, border: true }).editLegend({ title: false });
    assertChartProgramsEquivalent({ primitiveProgram: expected, publicProgram: actual, compareSemanticSpec: false });
    const options = { width: 1000, height: 800, colors: ["#4c78a8", "#f58518"],
      regions: [{ name: "marks", x: 240, y: 240, width: 520, height: 320, minimumInkPixels: 20 }] };
    const artifact = { scope: "charts", capability: "legend-layout", chart: "hidden-categorical", variant: position,
      title: `Hidden categorical title at ${position}`,
      userFacingCallChain: `base().createLegend({ position: "${position}", border: true }).editLegend({ title: false })` };
    const a = await assertRenderedPNG(expected, { ...options, artifact: { ...artifact, kind: "primitive" } });
    const b = await assertRenderedPNG(actual, { ...options, artifact: { ...artifact, kind: "user-facing" } });
    assert.equal(a.pixelHash, b.pixelHash);
  }
});

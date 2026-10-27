import { inspectGraphicIntegrity, assertGraphicIntegrity } from "../../../ggaction/test/oracles/graphic-integrity.js";
import { inspectAnalyticLayerIntegrity, assertAnalyticLayerIntegrity } from "../../../ggaction/test/oracles/analytic-layer-integrity.js";
import { assertSvgIntegrity } from "../../../ggaction/test/oracles/svg-integrity.js";
import { createCanvas } from "../../../ggaction/node_modules/@napi-rs/canvas/index.js";
const make = () => ({ semanticSpec: { layers: [{ id: "points", mark: {type:"point"} }] }, graphicSpec: {
 order:["canvas"], objects:{canvas:{type:"canvas",properties:{width:100,height:100},children:["points"]},points:{type:"circle",items:[{id:"p0",properties:{x:10,y:20,radius:3,fill:"#ff0000"}}]}}}
});
const output = { graphicWrongTypes:[], svgMalformed:[], visibility:[], blankCanvas:{} };
for (const value of [null, "broken", false, {}, []]) {
 const p=make();p.graphicSpec.objects.points.items[0].properties.x=value;
 output.graphicWrongTypes.push({value,issues:inspectGraphicIntegrity(p).issues});
}
for(const svg of ['<svg><circle cx="broken" cy="0" r="1" /></svg>', '<svg><circle cx="null" cy="0" r="1" /></svg>', '<svg><g></svg>', `<svg><circle cx='NaN' cy='0' r='1' /></svg>`]) {
 let accepted = true; try {assertSvgIntegrity(svg)} catch {accepted=false} output.svgMalformed.push({svg,accepted});
}
for(const [name,properties] of [['opacity-zero',{opacity:0}],['off-canvas',{x:10000,y:10000}],['no-paint',{fill:'none',stroke:'none'}]]) {
 const p=make();Object.assign(p.graphicSpec.objects.points.items[0].properties,properties);
 output.visibility.push({name,graphic:inspectGraphicIntegrity(p).issues,analytic:inspectAnalyticLayerIntegrity(p).issues});
}
const canvas=createCanvas(20,20).getContext('2d');const bytes=canvas.getImageData(0,0,20,20).data;
output.blankCanvas = {existingInkPredicate:bytes.some((byte,i)=>i%4!==3&&byte<200),visibleAlpha:bytes.some((byte,i)=>i%4===3&&byte>0)};
console.log(JSON.stringify(output,null,2));

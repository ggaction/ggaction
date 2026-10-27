import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../src/renderers/pdf.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { assertAnalyticPixels } from "../../../support/analytic-pixels.js";
const rows=[{x:0,y:1,lo:0,hi:2},{x:1,y:2,lo:1,hi:3},{x:2,y:2.5,lo:1.5,hi:3.5},{x:4,y:6,lo:5,hi:7}];
const curve="monotone-steffen";
function base(factory=chart){return factory().createCanvas({width:360,height:260,margin:30}).createData({id:"raw",values:rows});}
const paths=p=>Object.values(p.graphicSpec.objects).flatMap(g=>g.items??[g]).map(g=>g.properties?.commands).filter(Boolean);

for(const kind of ["line","area","band"]){
  test(`Steffen ${kind} survives immutable authoring, rematerialization and all export backends`,async()=>{
    const start=base(),before=serializeProgram(start);
    const p=kind==="line"?start.createLinePlot({x:"x",y:"y",line:{curve},guides:false}):
      kind==="area"?start.createAreaPlot({x:"x",y:"y",area:{curve},guides:false}):
      start.createErrorBand({x:{field:"x"},y:{center:"y",lower:"lo",upper:"hi"},curve});
    assert.equal(serializeProgram(start),before);
    assert.ok(paths(p).some(commands=>commands.some(c=>c.op==="C")));
    assert.ok(assertAnalyticPixels(p,`Steffen ${kind}`)>0);
    const restored=deserializeProgram(serializeProgram(p));
    assert.deepEqual(restored.graphicSpec,p.graphicSpec);
    assert.deepEqual(restored.editCanvas({width:400}).editCanvas({width:360}).graphicSpec,p.graphicSpec);
    const edited=kind==="line"?p.editLineMark({curve:"linear"}).editLineMark({curve}):
      p.editAreaMark({curve:"linear"}).editAreaMark({curve});
    assert.deepEqual(edited.graphicSpec,p.graphicSpec);
    const graphic=deserializeGraphic(serializeGraphic(p));
    assert.equal(renderToSVG(p),renderToSVG(graphic));
    const png=await renderToPNGBuffer(p),snapshot=await renderToPNGBuffer(graphic);
    assert.deepEqual(png.buffer,snapshot.buffer);
    const pdf=await renderToPDFBuffer(p);assert.equal(pdf.pages,1);assert.ok(pdf.bytes>100);
  });
}

test("Basic line facade retains the recipe without broadening its chart families",()=>{
  for(const family of ["Line"]){
    const options={x:"x",y:"y",guides:false,[family.toLowerCase()]:{curve}};
    assertEquivalentMeaning(base(basicChart)[`create${family}Plot`](options).graphicSpec,
      base()[`create${family}Plot`](options).graphicSpec);
  }
  assert.equal(typeof basicChart().createAreaPlot,"undefined");
});

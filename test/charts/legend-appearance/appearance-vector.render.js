import assert from'node:assert/strict';
import test from'node:test';
import{renderToSVG}from'../../../src/renderers/svg.js';
import{renderToPDFBuffer}from'../../../src/renderers/pdf.js';
import{appearanceVariants}from'./manifest.js';
for(const variant of appearanceVariants){
 test(`${variant.variant} preserves exact primitive SVG and PDF`,async()=>{
  const a=variant.userFacing(),b=variant.primitive(),options={resourceNamespace:'comparison'};
  const svg=renderToSVG(a,options);assert.equal(svg,renderToSVG(b,options));
  if(variant.chart==='legend-layout'){assert.ok(svg.includes('stroke-dasharray="4 2 6 1"'));assert.ok(!svg.includes('<image'));}
  assert.deepEqual((await renderToPDFBuffer(a)).buffer,(await renderToPDFBuffer(b)).buffer);
 });
}

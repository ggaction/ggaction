import { saveBrowserEvidence } from "../support/browser.js";
import { saveBrowserPageEvidence } from "../support/browser.js";
import assert from'node:assert/strict';
import test from'node:test';
import{fileURLToPath}from'node:url';
import{chromium}from'playwright';
import{renderToSVG}from'../../src/renderers/svg.js';
import{createGradientBlockProgram}from'../../examples/legend-layout/program.js';
import{createRecipeOpacityProgram}from'../../examples/legend-recipe-opacity/program.js';
import{openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence}from'../support/browser.js';
import{startStaticServer}from'../support/static-server.js';
let browser,server;
test.before(async()=>{server=await startStaticServer(fileURLToPath(new URL('../../',import.meta.url)), { dependencies: "repository" });browser=await chromium.launch({headless:true});});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();});
for(const entry of[{id:'legend-layout',factory:createGradientBlockProgram,opacity:null},...[0,.7,1].map(opacity=>({id:'legend-recipe-opacity',factory:()=>createRecipeOpacityProgram(opacity),opacity}))]){
 test(`${entry.id} ${entry.opacity??'gradient'} has exact browser Canvas and SVG primitive output`,async()=>{
  try {
  const{page,errors}=await openBrowserPage(browser,new URL(`examples/${entry.id}/`,server.baseUrl).href,{waitFor:()=>{const text=document.querySelector('#status')?.textContent??'';return text.length>0&&!/^Loading\b/i.test(text);}});
  try{
   const result=await page.evaluate(async({id,opacity})=>{
    const{createGradientBlockProgram}=await import('/examples/legend-layout/program.js');
    const{createRecipeOpacityProgram}=await import('/examples/legend-recipe-opacity/program.js');
    const{createGradientBlockPrimitive,createRecipeOpacityPrimitive}=await import('/test/charts/legend-appearance/primitive.program.js');
    const{render}=await import('/src/index.js');const{renderToSVG}=await import('/src/renderers/svg.js');
    const a=opacity===null?createGradientBlockProgram():createRecipeOpacityProgram(opacity);
    const b=opacity===null?createGradientBlockPrimitive():createRecipeOpacityPrimitive(opacity);
    const rgba=[a,b].map(p=>{const c=document.createElement('canvas');render(p,c.getContext('2d'));return c.getContext('2d').getImageData(0,0,480,270).data;});
    const options={resourceNamespace:'comparison'},svg=renderToSVG(a,options),canvas=document.querySelector('#chart');
    return{exact:rgba[0].every((v,i)=>v===rgba[1][i]),bytes:rgba[0].length,svg,svgExact:svg===renderToSVG(b,options),
     width:canvas.width,height:canvas.height,accessible:canvas.getAttribute('aria-label'),state:window.__ggactionExample};
   },{id:entry.id,opacity:entry.opacity});
   assert.equal(result.exact,true);assert.equal(result.bytes,480*270*4);assert.equal(result.svgExact,true);
   assert.equal(result.svg,renderToSVG(entry.factory(),{resourceNamespace:'comparison'}));
   assert.equal(result.width,480);assert.equal(result.height,270);assert.ok(result.accessible?.length>0);
   assert.deepEqual(result.state,{id:entry.id,width:480,height:270});assertNoBrowserErrors(errors,entry.id);
  } catch (error) { await saveBrowserPageEvidence(page, error, "browser-assertion"); throw error; } finally { await page.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
}

import { saveBrowserEvidence } from "../support/browser.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {startStaticServer} from '../support/static-server.js';
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence} from '../support/browser.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('shared numeric samples match literal Canvas and SVG on DOM and Offscreen surfaces',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-combined-legends-'));let server,browser;
 try{
  const bundle=await build({stdin:{contents:`export {render} from './src/index.js';export {renderToSVG} from './src/renderers/svg.js';export {createNumericCombinedProgram} from './examples/combined-legends/program.js';export {createPrimitiveProgram} from './test/charts/combined-legends/primitive.program.js';export {visualVariants} from './test/charts/combined-legends/manifest.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundle.outputFiles[0].contents);await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});
  const result=await opened.page.evaluate(async()=>{
   const {render,renderToSVG,createNumericCombinedProgram,createPrimitiveProgram,visualVariants}=await import('/module.js');
   const publicProgram=createNumericCombinedProgram(),primitive=createPrimitiveProgram(),failures=[];let count=0;
   for(const variant of visualVariants){
    const publicProgram=variant.userFacing(),primitive=variant.primitive();
    if(renderToSVG(publicProgram,{resourceNamespace:"combined-samples"})!==renderToSVG(primitive,{resourceNamespace:"combined-samples"}))failures.push({variant:variant.variant,svg:true});
   for(const backend of ['DOM','Offscreen'])for(const pixelRatio of [1,1.5,2])for(const background of ['white','#556677','transparent']){
    const outputs=[publicProgram,primitive].map(p=>{
     const graphicSpec={...p.graphicSpec,objects:{...p.graphicSpec.objects,canvas:{...p.graphicSpec.objects.canvas,properties:{...p.graphicSpec.objects.canvas.properties,background}}}};
     const canvas=backend==='DOM'?document.createElement('canvas'):new OffscreenCanvas(1,1);render({graphicSpec},canvas.getContext('2d'),{pixelRatio});return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    });if(!outputs[0].every((value,index)=>value===outputs[1][index]))failures.push({variant:variant.variant,backend,pixelRatio,background});count++;
   }
   }
   const svg=renderToSVG(publicProgram,{resourceNamespace:"combined-samples"}),expected=renderToSVG(primitive,{resourceNamespace:"combined-samples"}),dom=new DOMParser().parseFromString(svg,'image/svg+xml');
   return {count,failures,svgExact:svg===expected,circles:[...dom.querySelectorAll('circle')].map(c=>[Number(c.getAttribute('cx')),Number(c.getAttribute('cy')),Number(c.getAttribute('r'))])};
  });
  assert.equal(result.count,90);assert.deepEqual(result.failures,[]);assert.equal(result.svgExact,true);
  assert.deepEqual(result.circles,[[10,290,1],[205,150,2],[400,10,3],[433.5,48.5,1],[433.5,66.5,2],[433.5,84.5,3]]);
  assertNoBrowserErrors(opened.errors,'combined-legends');await opened.page.close();
 } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

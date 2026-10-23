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
import {noPaintScene,noPaintSamples} from '../support/none-paint-scene.js';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('browser Canvas and SVG interpret none as no paint across filled primitives and lines',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-none-browser-'));let server,browser,page;
 try{
  const bundled=await build({stdin:{contents:`export {render} from './src/index.js';export {renderToSVG} from './src/renderers/svg.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundled.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});page=opened.page;
  const actual=await page.evaluate(async({scene,samples})=>{
   const {render,renderToSVG}=await import('/module.js');const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   ctx.strokeStyle='red';ctx.fillStyle='red';render(scene,ctx);
   const svg=renderToSVG(scene),image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode();
   const other=document.createElement('canvas');other.width=240;other.height=100;const c=other.getContext('2d');c.drawImage(image,0,0);
   return {canvas:samples.map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]),svg:samples.map(([x,y])=>[...c.getImageData(x,y,1,1).data])};
  },{scene:noPaintScene(),samples:noPaintSamples});
  const expected=noPaintSamples.map(([, ,rgba])=>rgba);assert.deepEqual(actual.canvas,expected);assert.deepEqual(actual.svg,expected);
  assertNoBrowserErrors(opened.errors,'none paint');await page.close();
 } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

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

test('browser normal opacity matches bounded independent sources in DOM and Offscreen Canvas',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-normal-opacity-browser-'));let server,browser;
 try{
  const bundle=await build({stdin:{contents:`export {render} from './src/index.js'; export {normalGlyphScene,independentGlyphReference} from './test/oracles/glyph-opacity.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundle.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});
  const results=await opened.page.evaluate(async()=>{
   const {render,normalGlyphScene,independentGlyphReference}=await import('/module.js');let count=0;const failures=[];
   for(const backend of ['dom','offscreen'])for(const type of ['circle','rect','path'])for(const opacity of [0,.2,.7,1])
   for(const background of ['white','#556677','transparent'])for(const intrinsic of [false,true])
   for(const pixelRatio of [1,1.5,2])for(const nested of [false,true]){
    const factory=backend==='dom'?(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}:(w,h)=>new OffscreenCanvas(w,h);
    const fill=intrinsic?'rgba(255,0,0,0.4)':'red',stroke=intrinsic?'rgba(0,0,255,0.6)':'blue';
    const scene=normalGlyphScene(type,opacity,fill,stroke,nested);scene.graphicSpec.objects.canvas.properties.background=background;
    const actual=factory(80*pixelRatio,80*pixelRatio);render(scene,actual.getContext('2d'),{pixelRatio});
    const reference=independentGlyphReference(factory,{type,opacity,fill,stroke,background,pixelRatio,nested});
    const ap=actual.getContext('2d').getImageData(0,0,actual.width,actual.height).data,bp=reference.getContext('2d').getImageData(0,0,actual.width,actual.height).data;
    if(!ap.every((v,i)=>v===bp[i]))failures.push({backend,type,opacity,background,intrinsic,pixelRatio,nested});count++;
   }return{count,failures};
  });
  assert.equal(results.count,864);assert.deepEqual(results.failures,[]);assertNoBrowserErrors(opened.errors,'normal glyph opacity');await opened.page.close();
 }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

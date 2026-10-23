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

test('browser SVG normal opacity remains one whole element with independent literal pixels',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-normal-opacity-svg-'));let server,browser;
 try{
  const bundle=await build({stdin:{contents:`export {renderToSVG} from './src/renderers/svg.js'; export {normalGlyphScene} from './test/oracles/glyph-opacity.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundle.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});
  const results=await opened.page.evaluate(async()=>{
   const {renderToSVG,normalGlyphScene}=await import('/module.js');const failures=[];let count=0;
   async function pixels(svg){const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});const c=document.createElement('canvas');c.width=80;c.height=80;c.getContext('2d').drawImage(image,0,0);return c.getContext('2d').getImageData(0,0,80,80).data;}
   for(const type of ['circle','rect','path'])for(const opacity of [0,.7,1])for(const intrinsic of [false,true])for(const background of ['white','#556677','transparent']){
    const fill=intrinsic?'rgba(255,0,0,0.4)':'red',stroke=intrinsic?'rgba(0,0,255,0.6)':'blue';
    const scene=normalGlyphScene(type,opacity,fill,stroke);scene.graphicSpec.objects.canvas.properties.background=background;
    const actual=renderToSVG(scene),geometry=type==='circle'?'cx="40" cy="40" r="20"':type==='rect'?'x="20" y="20" width="40" height="40"':'d="M20 20L60 20L60 60L20 60Z"';
    const expected=`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${background}"/><${type} ${geometry} fill="${fill}" stroke="${stroke}" stroke-width="10" opacity="${opacity}"/></svg>`;
    const [a,b]=await Promise.all([pixels(actual),pixels(expected)]);
    if(actual.includes('mix-blend-mode')||actual.includes('isolation')||!a.every((v,i)=>v===b[i]))failures.push({type,opacity,intrinsic,background});count++;
   }return{count,failures};
  });
  assert.equal(results.count,54);assert.deepEqual(results.failures,[]);assertNoBrowserErrors(opened.errors,'normal SVG opacity');await opened.page.close();
 } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

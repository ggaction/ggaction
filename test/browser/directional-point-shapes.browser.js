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
test('browser Canvas renders directional named glyphs like independent polygon primitives',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-directional-browser-'));
 let server,browser,page;
 try {
  const bundled=await build({stdin:{contents:`export {chart,render} from './src/index.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundled.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><canvas aria-label="Directional point geometry"></canvas><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});page=opened.page;
  const results=await page.evaluate(async()=>{
   const {chart,render}=await import('/module.js');const results=[];
   for(const shape of ['wedge','arrow'])for(const area of [25,100])for(const angle of [0,90]) {
    const publicCanvas=document.createElement('canvas');
    const p=chart().createCanvas({width:300,height:200,margin:50})
     .createData({values:[{x:.5,y:.5}]}).createPointMark({shape,fill:'#236ab9',stroke:false,opacity:1})
     .encodeX({field:'x',scale:{domain:[0,1]}}).encodeY({field:'y',scale:{domain:[0,1]}})
     .encodeRadius({value:Math.sqrt(area/Math.PI)}).encodeAngle({value:angle});
    render(p,publicCanvas.getContext('2d'));
    const primitive=document.createElement('canvas');primitive.width=300;primitive.height=200;
    const c=primitive.getContext('2d');c.fillStyle='white';c.fillRect(0,0,300,200);c.fillStyle='#236ab9';
    const vertices=shape==='wedge'?[[0,-2/Math.sqrt(3)],[-.25,1/Math.sqrt(3)],[.25,1/Math.sqrt(3)]]:
     [[-1/7,1],[1/7,1],[1/7,-.125],[.4,-.125],[0,-1],[-.4,-.125],[-1/7,-.125]];
    const k=Math.sqrt(area/(shape==='wedge'?Math.sqrt(3)/4:47/70)),r=angle*Math.PI/180;
    c.beginPath();vertices.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](150+(x*Math.cos(r)-y*Math.sin(r))*k,100+(x*Math.sin(r)+y*Math.cos(r))*k));c.closePath();c.fill();
    const a=publicCanvas.getContext('2d').getImageData(0,0,300,200).data,b=c.getImageData(0,0,300,200).data;
    results.push({shape,area,angle,exact:a.every((v,i)=>v===b[i]),ink:a.filter((v,i)=>i%4===0&&v<250).length});
   }return results;
  });
  assert.equal(results.length,8);for(const result of results){assert.equal(result.exact,true,JSON.stringify(result));assert.ok(result.ink>10);}
  assertNoBrowserErrors(opened.errors,'directional points');await page.close();
 } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

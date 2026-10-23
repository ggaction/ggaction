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

test('browser combined size-shape samples match independent area geometry',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-size-shape-browser-'));let server,browser;
 try{
  const bundle=await build({stdin:{contents:`export {chart,render} from './src/index.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundle.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});
  const actual=await opened.page.evaluate(async()=>{
   const {chart,render}=await import('/module.js');
   const p=chart().createCanvas({width:1200,height:1000,margin:300}).createData({values:[{g:'A'},{g:'B'},{g:'C'}]})
    .createPointMark().encodeShape({field:'g',scale:{domain:['A','B','C'],range:['circle','square','triangle-up']}})
    .encodeSize({field:'g',fieldType:'ordinal',scale:{domain:['A','B','C'],range:[25,100,225]}}).createLegend({combine:'size-shape'});
   const symbols=p.graphicSpec.objects.seriesLegendSymbolPoints;
   const scene={graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:1200,height:1000,background:'white'},children:['symbols']},symbols},order:['canvas']}};
   const a=document.createElement('canvas'),b=document.createElement('canvas');render(scene,a.getContext('2d'));b.width=1200;b.height=1000;
   const c=b.getContext('2d');c.fillStyle='white';c.fillRect(0,0,1200,1000);c.fillStyle='#4c78a8';
   const [circle,square,triangle]=symbols.items.map(item=>item.properties);
   c.beginPath();c.arc(circle.x,circle.y,Math.sqrt(25/Math.PI),0,2*Math.PI);c.fill();
   c.fillRect(square.x,square.y,10,10);
   const cx=triangle.commands[0].x,top=triangle.commands[0].y,h=Math.sqrt(225*Math.sqrt(3)),half=h/Math.sqrt(3);
   c.beginPath();c.moveTo(cx,top);c.lineTo(cx+half,top+h);c.lineTo(cx-half,top+h);c.closePath();c.fill();
   const ap=a.getContext('2d').getImageData(0,0,1200,1000).data,bp=c.getImageData(0,0,1200,1000).data;
   return {exact:ap.every((v,i)=>v===bp[i]),ink:ap.filter((v,i)=>i%4===0&&v<100).length};
  });
  assert.equal(actual.exact,true);assert.ok(actual.ink>100);assertNoBrowserErrors(opened.errors,'size-shape legend');await opened.page.close();
 } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

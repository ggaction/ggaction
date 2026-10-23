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

test('browser gradient strips preserve independent orientation and dimensions at every edge',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-gradient-browser-'));let server,browser,page;
 try{
  const bundle=await build({stdin:{contents:`export {chart,render} from './src/index.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundle.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});page=opened.page;
  const actual=await page.evaluate(async()=>{
   const {chart,render}=await import('/module.js');const results=[];
   for(const position of ['top','right','bottom','left'])for(const direction of ['horizontal','vertical']){
    const p=chart().createCanvas({width:700,height:600,margin:200}).createData({values:[{x:0,y:0,v:1},{x:1,y:1,v:10}]})
     .createScatterPlot({x:'x',y:'y',guides:false}).encodeColor({field:'v',fieldType:'quantitative',scale:{domain:[0,10],range:['black','white']}})
     .createLegend({position,direction,titlePosition:'bottom',gradient:{length:120,thickness:16}});
    const ramp=p.graphicSpec.objects.colorGradientStrips;
    const scene={graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:700,height:600,background:'white'},children:['ramp']},ramp},order:['canvas']}};
    const a=document.createElement('canvas'),b=document.createElement('canvas');render(scene,a.getContext('2d'));b.width=700;b.height=600;
    const c=b.getContext('2d');c.fillStyle='white';c.fillRect(0,0,700,600);
    const x=Math.min(...ramp.items.map(i=>i.properties.x)),y=Math.min(...ramp.items.map(i=>i.properties.y));
    for(let i=0;i<60;i++){
     c.fillStyle=ramp.items[i].properties.fill;
     c.fillRect(x+(direction==='horizontal'?i*2:0),y+(direction==='vertical'?i*2:0),direction==='horizontal'?2:16,direction==='vertical'?2:16);
    }
    const ap=a.getContext('2d').getImageData(0,0,700,600).data,bp=c.getImageData(0,0,700,600).data;
    results.push({position,direction,exact:ap.every((v,i)=>v===bp[i]),ink:ap.filter((v,i)=>i%4===0&&v<100).length});
   }return results;
  });
  for(const result of actual){assert.equal(result.exact,true,JSON.stringify(result));assert.ok(result.ink>100);}
  assertNoBrowserErrors(opened.errors,'gradient layout');await page.close();
 } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

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
test('sample windows preserve full circles and clip fill and stroke with exact browser pixels',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-sample-window-'));let server,browser;
 try{
  const bundle=await build({stdin:{contents:`export {chart,render} from './src/index.js'; export {drawSampleWindow} from './test/oracles/sample-window.js';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false});
  await writeFile(path.join(directory,'module.js'),bundle.outputFiles[0].contents);await writeFile(path.join(directory,'index.html'),'<!doctype html><p id="status">ready</p>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='ready'});
  const results=await opened.page.evaluate(async()=>{
   const {chart,render,drawSampleWindow}=await import('/module.js'),failures=[];let count=0;
   const p=chart().createCanvas({width:600,height:400,margin:150}).createData({values:[{v:0},{v:10}]}).createPointMark({id:'p'})
    .encodeSize({field:'v',scale:{domain:[0,10],range:[1600*Math.PI,1600*Math.PI]}}).createLegend({channels:['size'],values:[0],clipHeight:30})
    .editLegendBlock({target:'p',channel:'size',symbol:{fill:'red',stroke:'blue',strokeWidth:2,opacity:1}});
   const glyph=p.graphicSpec.objects['sizeLegendSymbols:0'];
   if(glyph.properties.radius!==40||glyph.properties.x!==41||glyph.properties.y!==15)throw Error('physical sample geometry changed');
   for(const backend of ['DOM','Offscreen'])for(const pixelRatio of [1,1.5,2])for(const [dx,dy]of [[0,0],[.5,.25]])for(const background of ['white','#556677','transparent']){
    const factory=()=>backend==='DOM'?document.createElement('canvas'):new OffscreenCanvas(1,1),a=factory(),b=factory();
    const scene={graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:100,height:100,background},children:['window']},window:{type:'canvas',properties:{x:9+dx,y:35+dy,width:82,height:30},children:['glyph']},glyph},order:['canvas']}};
    render(scene,a.getContext('2d'),{pixelRatio});const expected=drawSampleWindow(b.getContext('2d'),{pixelRatio,dx,dy,background});
    const actual=a.getContext('2d').getImageData(0,0,a.width,a.height).data;
    if(!actual.every((v,i)=>v===expected[i]))failures.push({backend,pixelRatio,dx,dy,background});count++;
   }return{count,failures};
  });
  assert.equal(results.count,36);assert.deepEqual(results.failures,[]);assertNoBrowserErrors(opened.errors,'sample-window');await opened.page.close();
 }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

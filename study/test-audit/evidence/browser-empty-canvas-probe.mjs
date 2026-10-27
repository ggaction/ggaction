import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/node_modules/playwright/index.mjs';
import {publicExamples} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/examples/registry.js';
import {startStaticServer} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/static-server.js';
import {openBrowserPage,windowValue,assertNoBrowserErrors} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/browser.js';
const root='/Users/hj/Desktop/ggaction_chongjeonglee/ggaction';
const evidence='/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence';
const server=await startStaticServer(root), browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const mode of ['baseline','disable-paint']) {
  const context=await browser.newContext();
  try {
   if(mode==='disable-paint') await context.addInitScript(()=>{
    for(const key of ['fill','stroke','fillRect','strokeRect','fillText','strokeText','drawImage','putImageData'])
      CanvasRenderingContext2D.prototype[key]=function(){};
   });
   for(const id of ['cars-scatterplot','legend-layout','cars-binned-heatmap']) {
    const example=publicExamples({browser:true}).find(e=>e.id===id);
    const {page,errors}=await openBrowserPage(context,new URL(`examples/${example.browser.path}`,server.baseUrl).href,{waitFor:()=>{
     const status=document.querySelector('#status')?.textContent??'';
     return status.length>0&&!/^Loading\b/i.test(status);
    }});
    const size=await page.locator(example.browser.canvas).evaluate(canvas=>({
     width:canvas.width,height:canvas.height,accessibleName:canvas.getAttribute('aria-label')?.trim()??'',
     logicalWidth:Number.parseFloat(getComputedStyle(canvas).width),logicalHeight:Number.parseFloat(getComputedStyle(canvas).height)
    }));
    assert.deepEqual({width:size.width,height:size.height},{width:example.width,height:example.height});
    assert.notEqual(size.accessibleName,'');
    assert.equal(size.logicalWidth,example.width);assert.equal(size.logicalHeight,example.height);
    if(example.browser.state)assert.deepEqual(await windowValue(page,example.browser.state.global),example.browser.state.expected);
    assertNoBrowserErrors(errors,id);
    const nontransparentPixels=await page.locator(example.browser.canvas).evaluate(canvas=>{
     const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let count=0;
     for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)count++;return count;
    });
    results.push({mode,id,existingPublicExampleAssertions:'PASS',nontransparentPixels});
    await page.close();
   }
  }finally{await context.close();}
 }
}finally{await browser.close();await server.close();}
await writeFile(`${evidence}/browser-empty-canvas-results.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));

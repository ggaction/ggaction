import { saveBrowserContextEvidence, saveBrowserEvidence } from "../support/browser.js";
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {chromium,firefox,webkit} from 'playwright';
import {preparePackageConsumer} from '../../scripts/package-consumer.js';
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence} from '../support/browser.js';
import {startStaticServer} from '../support/static-server.js';

const name=process.env.GGACTION_BROWSER??'chromium',engines={chromium,firefox,webkit};
assert.ok(Object.hasOwn(engines,name));
let browser,consumer,server;
test.before(async()=>{
  consumer=await preparePackageConsumer();
  for(const [file,source,relative] of [
    ['public.js','../../examples/facet-shared-top-lane/program.js',"'../../src/index.js'"],
    ['primitive.js','../charts/facet-shared-top-lane/primitive.program.js',"'../../../src/index.js'"]]){
    await writeFile(path.join(consumer.directory,file),(await readFile(new URL(source,import.meta.url),'utf8'))
      .replace(relative,"'/node_modules/ggaction/src/index.js'"));
  }
  await writeFile(path.join(consumer.directory,'index.html'),'<html lang="en"><head><meta charset="utf-8"><title>Facet top lane</title></head><body><p id="status" role="status">Ready</p></body></html>');
  server=await startStaticServer(consumer.directory);browser=await engines[name].launch({headless:true});
});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();await consumer?.cleanup();});

for(const blank of [false,true])for(const ratio of [1,2])test(`${name} matches ${blank?'blank header':'shared top lane'} primitive in installed Canvas and SVG at DPR ${ratio}`,async()=>{
  try {
  const context=await browser.newContext({deviceScaleFactor:ratio});
  try{
    const {page,errors}=await openBrowserPage(context,server.baseUrl);
    const result=await page.evaluate(async ({ratio,blank})=>{
      const {render}=await import('/node_modules/ggaction/src/index.js');
      const {renderToSVG}=await import('/node_modules/ggaction/src/renderers/svg.js');
      const {createFacetSharedTopLaneProgram}=await import('/public.js');
      const {createPrimitiveProgram}=await import('/primitive.js');
      const programs=blank?[
        createFacetSharedTopLaneProgram().editFacetHeaders({labelMap:[{value:'Sun',label:''}]}),
        createPrimitiveProgram().editGraphics({target:'facet-headers:0',property:'text',value:''})
      ]:[createFacetSharedTopLaneProgram(),createPrimitiveProgram()];
      const svgs=programs.map(p=>renderToSVG(p,{resourceNamespace:"comparison"})),checks=[];
      for(const backend of ['Canvas','SVG']){
        const pixels=[];
        for(let i=0;i<programs.length;i++){
          const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
          if(backend==='Canvas')render(programs[i],ctx,{pixelRatio:ratio});
          else{
            canvas.width=508*ratio;canvas.height=262*ratio;
            const url=URL.createObjectURL(new Blob([svgs[i]],{type:'image/svg+xml'})),image=new Image();
            image.src=url;await image.decode();ctx.scale(ratio,ratio);ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
          }
          pixels.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);
        }
        let differences=0,ink=0;
        for(let i=0;i<pixels[0].length;i++)if(pixels[0][i]!==pixels[1][i])differences++;
        for(let y=43*ratio;y<243*ratio;y++)for(let x=40*ratio;x<452*ratio;x++){
          const i=(y*508*ratio+x)*4;if(pixels[0][i]+pixels[0][i+1]+pixels[0][i+2]<740&&pixels[0][i+3]>0)ink++;
        }
        checks.push({backend,differences,ink});
      }
      const host=document.createElement('div');host.innerHTML=svgs[0];document.body.append(host);await document.fonts.ready;
      const root=host.querySelector('svg').getBoundingClientRect();
      const text=[...host.querySelectorAll('text')].filter(n=>['Grouped Bar Chart','Sun','50'].includes(n.textContent))
        .map(n=>{const b=n.getBoundingClientRect();return{text:n.textContent,top:b.top-root.top,bottom:b.bottom-root.top};});
      return{svgExact:svgs[0]===svgs[1],checks,text,canvas:programs[0].graphicSpec.objects.canvas.properties};
    },{ratio,blank});
    assert.equal(result.svgExact,true);assert.equal(result.canvas.width,508);assert.equal(result.canvas.height,262);
    for(const check of result.checks){assert.equal(check.differences,0,check.backend);assert.ok(check.ink>5000*ratio*ratio);}
    const [title,header,endpoint]=['Grouped Bar Chart','Sun','50'].map(text=>result.text.find(item=>item.text===text));
    assert.ok(title.top>=0);
    if(blank){assert.equal(header,undefined);assert.ok(title.bottom<endpoint.top);}
    else{assert.ok(title.bottom<=header.top);assert.ok(header.bottom<endpoint.top);}
    assert.ok(endpoint.top<43&&endpoint.bottom>43,'upper endpoint is retained at the plot edge');
    assertNoBrowserErrors(errors,name);await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }finally{await context.close();}

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});

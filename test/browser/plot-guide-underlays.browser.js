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
    ['public.js','../../examples/plot-guide-underlays/program.js',"'../../src/index.js'"],
    ['primitive.js','../charts/plot-guide-underlays/primitive.program.js',"'../../../src/index.js'"]])
    await writeFile(path.join(consumer.directory,file),(await readFile(new URL(source,import.meta.url),'utf8'))
      .replace(relative,"'/node_modules/ggaction/src/index.js'"));
  await writeFile(path.join(consumer.directory,'index.html'),'<html lang="en"><head><meta charset="utf-8"><title>Guide underlays</title></head><body><p id="status" role="status">Ready</p></body></html>');
  server=await startStaticServer(consumer.directory);browser=await engines[name].launch({headless:true});
});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();await consumer?.cleanup();});

for(const ratio of [1,2])test(`${name} preserves literal underlay pixels and opaque difference arithmetic at DPR ${ratio}`,async()=>{
  const context=await browser.newContext({deviceScaleFactor:ratio});
  try{
    const {page,errors}=await openBrowserPage(context,server.baseUrl);
    const result=await page.evaluate(async ratio=>{
      const {render}=await import('/node_modules/ggaction/src/index.js');
      const {renderToSVG}=await import('/node_modules/ggaction/src/renderers/svg.js');
      const {createPlotUnderlayProgram}=await import('/public.js');
      const {createPrimitiveProgram}=await import('/primitive.js');
      const programs=[createPlotUnderlayProgram(),createPrimitiveProgram(),
        createPlotUnderlayProgram({axisUnderlay:false,borderUnderlay:false})];
      const svgs=programs.map(p=>renderToSVG(p)),checks=[];
      for(const backend of ['Canvas','SVG']){
        const pixels=[],probes=[];
        for(let i=0;i<programs.length;i++){
          const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
          if(backend==='Canvas')render(programs[i],ctx,{pixelRatio:ratio});
          else{
            canvas.width=240*ratio;canvas.height=180*ratio;
            const url=URL.createObjectURL(new Blob([svgs[i]],{type:'image/svg+xml'})),image=new Image();
            image.src=url;await image.decode();ctx.scale(ratio,ratio);ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
          }
          pixels.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);
          probes.push([...ctx.getImageData(85*ratio,139*ratio,1,1).data]);
        }
        let differences=0,controlDifferences=0,ink=0;
        for(let i=0;i<pixels[0].length;i++){
          if(pixels[0][i]!==pixels[1][i])differences++;
          if(pixels[0][i]!==pixels[2][i])controlDifferences++;
        }
        for(let y=20*ratio;y<140*ratio;y++)for(let x=40*ratio;x<220*ratio;x++){
          const i=(y*240*ratio+x)*4;if(pixels[0][i]+pixels[0][i+1]+pixels[0][i+2]<740&&pixels[0][i+3]>0)ink++;
        }
        checks.push({backend,differences,controlDifferences,ink,probes});
      }
      return{svgExact:svgs[0]===svgs[1],checks,order:programs[0].graphicSpec.objects['plot-main'].children};
    },ratio);
    assert.equal(result.svgExact,true);
    assert.deepEqual(result.order,['horizontalGridLines','plotBorder','xAxisLine','barPlot']);
    for(const check of result.checks){
      assert.equal(check.differences,0,check.backend);assert.ok(check.controlDifferences>0);assert.ok(check.ink>5000*ratio*ratio);
      assert.deepEqual(check.probes,[[119,119,136,255],[119,119,136,255],[136,136,136,255]]);
    }
    assertNoBrowserErrors(errors,name);await page.close();
  }finally{await context.close();}
});

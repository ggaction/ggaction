import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { startStaticServer } from '../support/static-server.js';
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from '../support/browser.js';

test('offline animation frames share embedded assets in browser Canvas and SVG at both DPRs', async()=>{
  const root=fileURLToPath(new URL('../../',import.meta.url)),directory=await mkdtemp(path.join(tmpdir(),'ggaction-animation-assets-'));
  const bytes=await readFile(new URL('../fixtures/fonts/metric-fixture.ttf',import.meta.url));
  const font={contentHash:createHash('sha256').update(bytes).digest('hex'),mimeType:'font/ttf',byteLength:bytes.length,
    family:'ggaction Metric Fixture',style:'normal',weight:400,metricsProviderVersion:'fixture@1',payload:{encoding:'base64',data:bytes.toString('base64')}};
  let server,browser;
  try{
    const bundle=await build({stdin:{contents:`export {animationAssetEndpoints} from './test/support/animation-asset-frame.js';export * from './src/animation.js';export {render,prepareImageRendering,prepareFontRendering} from './src/index.js';export {renderToSVG} from './src/renderers/svg.js';`,resolveDir:root},bundle:true,platform:'browser',format:'esm',write:false,metafile:true});
    assert.ok(Object.keys(bundle.metafile.inputs).every(name=>!name.includes('node:')&&!name.includes('/renderers/png')&&!name.includes('/renderers/pdf')));
    await writeFile(path.join(directory,'frame.js'),bundle.outputFiles[0].contents);
    await writeFile(path.join(directory,'index.html'),'<!doctype html><html lang="en"><title>Offline animation</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Offline point transition with embedded assets"></canvas></html>');
    server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
    for(const ratio of [1,2]){
      const context=await browser.newContext({deviceScaleFactor:ratio});
      try{
        const opened=await openBrowserPage(context,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='Ready'});
        await opened.page.evaluate(async()=>{globalThis.animation=await import('/frame.js');});
        await context.setOffline(true);
        const result=await opened.page.evaluate(async({font,ratio})=>{
          const {animationAssetEndpoints,planTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames,render,prepareImageRendering,prepareFontRendering,renderToSVG}=globalThis.animation;
          let networkCalls=0;globalThis.fetch=()=>{networkCalls++;throw Error('offline');};
          const {from,to}=animationAssetEndpoints(font,bytes=>btoa(String.fromCharCode(...bytes)));
          const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}});
          const restored=deserializeAnimation(serializeAnimation(plan));
          const frames=exportAnimationFrames(restored.plan,{timesMs:[0,50,100]}),records=[];
          for(const frame of frames){
            const fonts=await prepareFontRendering(frame,{register:async request=>{
              const face=new FontFace(request.family,request.bytes,{style:request.style,weight:String(request.weight)});
              await face.load();document.fonts.add(face);
              return {...Object.fromEntries(['contentHash','family','style','weight','metricsProviderVersion'].map(k=>[k,request[k]])),dispose(){document.fonts.delete(face);}};
            }});
            try{
              const images=await prepareImageRendering(frame,{decode:async request=>{
                const url=URL.createObjectURL(new Blob([request.bytes],{type:request.mimeType}));
                try{const image=new Image();image.src=url;await image.decode();return {image,width:image.naturalWidth,height:image.naturalHeight,originClean:true};}
                finally{URL.revokeObjectURL(url);}
              }});
              const canvas=document.querySelector('canvas');render(frame,canvas.getContext('2d'),{images,fonts,pixelRatio:ratio});
              const image=new Image();image.src=`data:image/svg+xml,${encodeURIComponent(renderToSVG(frame))}`;await image.decode();
              const svg=document.createElement('canvas');svg.width=300*ratio;svg.height=200*ratio;svg.getContext('2d').drawImage(image,0,0,svg.width,svg.height);
              const pixels=target=>[[20,20],[40,20],[23,62],[52,62],[168,100]].map(([x,y])=>[...target.getContext('2d').getImageData(x*ratio,y*ratio,1,1).data]);
              records.push({timeMs:frame.timeMs,canvas:pixels(canvas),svg:pixels(svg),size:[canvas.width,canvas.height]});
            }finally{fonts.dispose();}
          }
          document.querySelector('#status').textContent='Complete';return {records,networkCalls};
        },{font,ratio});
        assert.equal(result.networkCalls,0);
        for(const record of result.records){assert.deepEqual(record.size,[300*ratio,200*ratio]);
          record.canvas.forEach((pixel,i)=>pixel.forEach((value,c)=>assert.ok(Math.abs(value-record.svg[i][c])<=1,JSON.stringify(record))));}
        assert.deepEqual(result.records[0].canvas.slice(0,4),[[255,0,0,255],[0,0,255,255],[0,128,0,255],[255,255,255,255]]);
        assert.deepEqual(result.records[1].canvas[4],[255,0,0,255]);
        assertNoBrowserErrors(opened.errors,'Offline animation');await opened.page.close();
      }finally{await context.close();}
    }
  }catch(error){if(browser)await saveBrowserEvidence(browser,error);throw error;}
  finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

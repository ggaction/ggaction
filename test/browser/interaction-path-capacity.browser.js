import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {startStaticServer} from '../support/static-server.js';
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from '../support/browser.js';

test('browser explicit path preparation preserves CSS candidates at both pixel ratios',async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),directory=await mkdtemp(path.join(tmpdir(),'ggaction-path-hit-'));
 let server,browser;
 try{
  const bundle=await build({stdin:{contents:`export {chart,render} from 'ggaction'; export {createInteractionSession} from 'ggaction/interaction'; export {planTransition,sampleTransition} from 'ggaction/animation';`,resolveDir:root},bundle:true,platform:'browser',format:'esm',minify:true,write:false});
  await writeFile(path.join(directory,'entry.js'),bundle.outputFiles[0].contents);
  await writeFile(path.join(directory,'index.html'),'<!doctype html><html lang="en"><title>Path hit capacity</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Geographic line"></canvas></html>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
  for(const ratio of[1,2]){
   const context=await browser.newContext({deviceScaleFactor:ratio});
   try{
    const opened=await openBrowserPage(context,server.baseUrl,{waitFor:()=>document.querySelector('#status').textContent==='Ready'});
    const result=await opened.page.evaluate(async ratio=>{
     const {chart,render,createInteractionSession,planTransition,sampleTransition}=await import('/entry.js');
     const program=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
      .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:1000},(_,i)=>[-30+60*i/999,(i%2?1:-1)*5])}}]}})
      .createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'})
      .createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
     const hitPreparation={maxWork:128000000,pathGeometry:{maxParts:400000,maxWork:2000000,maxIndexWork:16000000}},canvas=document.querySelector('canvas');
     render(program,canvas.getContext('2d'),{pixelRatio:ratio});
     const scalar=createInteractionSession({program,bindings:[]}),indexed=createInteractionSession({program,bindings:[],hitPreparation});
     scalar.mount(canvas);indexed.mount(canvas);
     const hits=[];
     for(const i of[0,499,998]){
      const point={x:200+100*(-30+60*(i+.5)/999)*Math.PI/180,y:200};
      for(const session of[scalar,indexed])session.dispatch({type:'inspect',point,slop:0});
      hits.push({a:scalar.getState().hit.candidates,b:indexed.getState().hit.candidates,owner:indexed.getState().hit.target?.ownerId,scalar:scalar.getState().hit.statistics.work,indexed:indexed.getState().hit.statistics.work});
     }
     const plan=planTransition({from:program,to:program.editProjection({scalePx:200}),options:{durationMs:100,formatVersion:5}}),frame=sampleTransition(plan,50);
     indexed.dispatch({type:'frame',frame,version:indexed.getState().frameVersion+1,generation:indexed.getState().generation});
     const current=indexed.getState().animationFrame===frame;
     scalar.destroy();indexed.destroy();document.querySelector('#status').textContent='Complete';
     return {hits,current,size:[canvas.width,canvas.height]};
    },ratio);
    assert.deepEqual(result.size,[400*ratio,400*ratio]);assert.equal(result.current,true);
    for(const hit of result.hits){assert.deepEqual(hit.a,hit.b);assert.equal(hit.owner,'coast');assert.ok(hit.indexed<hit.scalar);}
    assert.equal(await opened.page.locator('#status').textContent(),'Complete');assertNoBrowserErrors(opened.errors,'Path hit capacity');await opened.page.close();
   }finally{await context.close();}
  }
 }catch(error){if(browser)await saveBrowserEvidence(browser,error);throw error;}
 finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

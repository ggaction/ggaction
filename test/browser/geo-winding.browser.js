import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { landChecks, landCanvas } from "../support/geographic-land.js";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root=fileURLToPath(new URL("../../",import.meta.url));let directory,server,browser;
test.before(async()=>{
  directory=await mkdtemp(path.join(tmpdir(),"ggaction-land-"));
  const bundle=await build({stdin:{contents:`export {geographicLandProgram} from './test/support/geographic-land.js';export {render} from './src/index.js';export {renderToSVG} from './src/renderers/svg.js';`,resolveDir:root},bundle:true,platform:"browser",format:"esm",write:false});
  await writeFile(path.join(directory,"program.js"),bundle.outputFiles[0].contents);
  await writeFile(path.join(directory,"index.html"),'<!doctype html><html lang="en"><title>Geographic ring direction</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas width="720" height="360" aria-label="World land and ocean"></canvas></html>');
  server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();if(directory)await rm(directory,{recursive:true,force:true});});
for(const ratio of [1,2])test(`clockwise land preserves independent Canvas and SVG ocean pixels at DPR ${ratio}`,async()=>{
  const values=JSON.parse(await readFile(new URL("../../scripts/chart-gallery/data/land-110m.geojson",import.meta.url)));
  const context=await browser.newContext({deviceScaleFactor:ratio});
  try{
    const opened=await openBrowserPage(context,server.baseUrl,{waitFor:()=>document.querySelector("#status").textContent==="Ready"});
    const result=await opened.page.evaluate(async({values,ratio,checks})=>{
      const {geographicLandProgram,render,renderToSVG}=await import("/program.js"),p=geographicLandProgram(values),canvas=document.querySelector("canvas");
      render(p,canvas.getContext("2d"),{pixelRatio:ratio});
      const svg=document.createElement("canvas");svg.width=canvas.width;svg.height=canvas.height;
      const image=new Image();image.src=`data:image/svg+xml,${encodeURIComponent(renderToSVG(p))}`;await image.decode();svg.getContext("2d").drawImage(image,0,0,svg.width,svg.height);
      const samples=c=>checks.map(({point:[x,y]})=>[...c.getContext("2d").getImageData(x*ratio+Math.floor(ratio/2),y*ratio+Math.floor(ratio/2),1,1).data]);
      document.querySelector("#status").textContent="Complete";
      return {canvas:samples(canvas),svg:samples(svg),width:canvas.width,height:canvas.height};
    },{values,ratio,checks:landChecks});
    for(const backend of ["canvas","svg"])landChecks.forEach(({expected,region},i)=>assert.deepEqual(result[backend][i],expected,`${backend} ${region}`));
    assert.deepEqual([result.width,result.height],[landCanvas.width*ratio,landCanvas.height*ratio]);
    assertNoBrowserErrors(opened.errors,"Geographic land");await opened.page.close();
  }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await context.close();}
});

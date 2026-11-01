import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp,writeFile,readFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence } from "../support/browser.js";

test("browser axis reflow uses exact current native lines and embedded fonts at both DPRs",async()=>{
  const root=fileURLToPath(new URL("../../",import.meta.url)),directory=await mkdtemp(path.join(tmpdir(),"ggaction-axis-animation-"));
  const bytes=[...await readFile(new URL("../fixtures/fonts/metric-fixture.ttf",import.meta.url))];let server,browser;
  try {
    const bundle=await build({stdin:{contents:`export {animationAxisReflowFrame,axisReflowFontIdentity} from './test/support/animation-axis-reflow-frame.js'; export {render,prepareFontRendering} from './src/index.js'; export {renderToSVG} from './src/renderers/svg.js';`,resolveDir:root},bundle:true,platform:"browser",format:"esm",write:false,metafile:true});
    assert.ok(Object.keys(bundle.metafile.inputs).every(name=>!name.includes("node:")&&!name.includes("/renderers/png")&&!name.includes("/renderers/pdf")));
    await writeFile(path.join(directory,"frame.js"),bundle.outputFiles[0].contents);
    await writeFile(path.join(directory,"index.html"),'<!doctype html><html lang="en"><title>Current axis label reflow</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Native axis labels at the current viewport"></canvas>');
    server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
    for(const ratio of [1,2]){
      const context=await browser.newContext({deviceScaleFactor:ratio});
      try{
        const opened=await openBrowserPage(context,server.baseUrl,{waitFor:()=>document.querySelector("#status").textContent==="Ready"});
        const result=await opened.page.evaluate(async({bytes,ratio})=>{
          const {animationAxisReflowFrame,axisReflowFontIdentity,render,prepareFontRendering,renderToSVG}=await import("/frame.js");
          const {from,to,frame,expected}=await animationAxisReflowFrame({bytes:new Uint8Array(bytes),decode:axisReflowFontIdentity,measure:async({asset,queries})=>{
            const fontBytes=Uint8Array.from(atob(asset.payload.data),c=>c.charCodeAt(0)),face=new FontFace(asset.family,fontBytes,{style:asset.style,weight:String(asset.weight)});
            await face.load();document.fonts.add(face);
            try{const ctx=document.createElement("canvas").getContext("2d");return{contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>{ctx.font=`${asset.weight} ${fontSize}px "${asset.family}"`;return ctx.measureText(text).width;})};}finally{document.fonts.delete(face);}
          }});
          let registered=0,removed=0;
          const host={register:async request=>{
            const face=new FontFace(request.family,request.bytes,{style:request.style,weight:String(request.weight)});await face.load();document.fonts.add(face);registered++;
            return{...axisReflowFontIdentity(request),dispose(){document.fonts.delete(face);removed++;}};
          }};
          const fonts=await prepareFontRendering(frame,host),nativeFonts=await prepareFontRendering(expected,host);
          try{
            const actual=document.querySelector("canvas"),native=document.createElement("canvas");render(frame,actual.getContext("2d"),{pixelRatio:ratio,fonts});render(expected,native.getContext("2d"),{pixelRatio:ratio,fonts:nativeFonts});
            const svgCanvas=async p=>{const image=new Image();image.src=`data:image/svg+xml,${encodeURIComponent(renderToSVG(p))}`;await image.decode();const c=document.createElement("canvas");c.width=330*ratio;c.height=300*ratio;c.getContext("2d").drawImage(image,0,0,c.width,c.height);return c;};
            const a=await svgCanvas(frame),b=await svgCanvas(expected),pixels=c=>c.getContext("2d").getImageData(0,0,c.width,c.height).data;
            const difference=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;};
            const canvasPixels=pixels(actual);fonts.dispose();nativeFonts.dispose();document.querySelector("#status").textContent="Complete";
            return{canvasDifference:difference(canvasPixels,pixels(native)),svgDifference:difference(pixels(a),pixels(b)),ink:canvasPixels.some((v,i)=>i%4===3&&v>0),size:[actual.width,actual.height],lines:[from.graphicSpec.objects.xAxisLabels.items.length,to.graphicSpec.objects.xAxisLabels.items.length],registered,removed};
          }finally{fonts.dispose();nativeFonts.dispose();}
        },{bytes,ratio});
        assert.deepEqual(result,{canvasDifference:0,svgDifference:0,ink:true,size:[330*ratio,300*ratio],lines:[6,3],registered:2,removed:2});
        assert.equal(await opened.page.locator("#status").textContent(),"Complete");assertNoBrowserErrors(opened.errors,"Native axis label reflow");await opened.page.close();
      }finally{await context.close();}
    }
  }catch(error){if(browser)await saveBrowserEvidence(browser,error);throw error;}
  finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});

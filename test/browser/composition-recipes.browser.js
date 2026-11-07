import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";
let browser,server;
test.before(async()=>{server=await startStaticServer(fileURLToPath(new URL("../../",import.meta.url)));browser=await chromium.launch({headless:true});});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();});
for(const chart of ["marginal","bullet","linked-overlay"]) test(`${chart} renders the same primitive in browser Canvas and SVG at both densities`,async()=>{
  for(const ratio of [1,2]){
    const context=await browser.newContext({deviceScaleFactor:ratio});
    try{
      const opened=await openBrowserPage(context,`${server.baseUrl}examples/${chart}/`,{waitFor:()=>window.__ggactionExample!==undefined});
      const outputs=await opened.page.evaluate(async({chart,ratio})=>{
        const file=chart==="linked-overlay"?"linked-composition":chart;
        const publicModule=await import(`/examples/${chart}/program.js`),primitive=await import(`/test/charts/${file}/primitive.program.js`);
        const variant=chart==="marginal"?{primitive:primitive.createMarginalPrimitive,userFacing:publicModule.createMarginal}
          :chart==="bullet"?{primitive:primitive.createBulletPrimitive,userFacing:publicModule.createBullet}
          :{primitive:primitive.overlayPrimitive,userFacing:publicModule.createLinkedOverlay};
        const {render}=await import("/src/index.js"),{renderToSVG}=await import("/src/renderers/svg.js");
        const results=[];
        for(const backend of ["Canvas","SVG"]){
          const pixels=[];
          for(const p of [variant.primitive(),variant.userFacing()]){
            const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
            if(backend==="Canvas")render(p,ctx,{pixelRatio:ratio});
            else{canvas.width=p.graphicSpec.objects.canvas.properties.width*ratio;canvas.height=p.graphicSpec.objects.canvas.properties.height*ratio;const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(p))}`;await image.decode();ctx.drawImage(image,0,0,canvas.width,canvas.height);}
            pixels.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);
          }
          let mismatch=0,ink=0;for(let i=0;i<pixels[0].length;i++){if(pixels[0][i]!==pixels[1][i])mismatch++;if(i%4!==3&&pixels[1][i]<220)ink++;}
          results.push({backend,mismatch,ink});
        }return results;
      },{chart,ratio});
      for(const output of outputs){assert.equal(output.mismatch,0,JSON.stringify({chart,ratio,...output}));assert.ok(output.ink>1000);}
      assertNoBrowserErrors(opened.errors,chart);
    }finally{await context.close();}
  }
});

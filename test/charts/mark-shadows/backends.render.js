import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { prepareShadowRendering, render } from "../../../src/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { visualVariants, frame } from "./manifest.js";
import { shadowFixture } from "./variants/native/fixture.js";
import { expectedColor, pixels } from "./variants/native/reference.js";
import { startStaticServer } from "../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../../support/browser.js";
const root=fileURLToPath(new URL("../../../",import.meta.url)), directory=path.join(root,".artifacts/test/png/charts/mark-shadows/public");
const bytes=url=>Buffer.from(url.split(",")[1],"base64"), hash=b=>createHash("sha256").update(b).digest("hex");
async function decoded(buffer,ratio=1){const image=await loadImage(buffer),canvas=createCanvas(frame.width*ratio,frame.height*ratio);assert.equal(image.width,canvas.width);assert.equal(image.height,canvas.height);canvas.getContext("2d").drawImage(image,0,0);return canvas;}
const rgba=canvas=>canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
function samples(canvas,fixture,backend,ratio=1){return pixels.map(([x,y])=>{const actual=[...canvas.getContext("2d").getImageData(x*ratio+Math.floor(ratio/2),y*ratio+Math.floor(ratio/2),1,1).data],expected=expectedColor(fixture,x,y);return{backend,pixel:[x,y],expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=(i===3?0:1))};});}
const decode=async({bytes})=>{const image=await loadImage(bytes);return{image,width:image.width,height:image.height,originClean:true};};
test("public and explicit shadow programs match four backends with independent interior oracles",async()=>{
 let server,browser;const evidence=[];await mkdir(directory,{recursive:true});
 try{
  server=await startStaticServer(root);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,`${server.baseUrl}examples/mark-shadows/`,{waitFor:()=>document.querySelector("#status").textContent==="Mark shadows rendered"});
  for(const variant of visualVariants){
   const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});
   const publicProgram=variant.userFacing(),primitive=variant.primitive(),fixture=shadowFixture(variant.variant),checks=[];
   for(const pixelRatio of [1,2]){
    const publicPNG=(await renderToPNGBuffer(publicProgram,{pixelRatio})).buffer,primitivePNG=(await renderToPNGBuffer(primitive,{pixelRatio})).buffer;
    assert.deepEqual(rgba(await decoded(publicPNG,pixelRatio)),rgba(await decoded(primitivePNG,pixelRatio)),`${variant.variant} PNG ${pixelRatio}x`);
    const shadows=await prepareShadowRendering(publicProgram,{createCanvas,decode,pixelRatio}),canvas=createCanvas(1,1);
    try{render(publicProgram,canvas.getContext("2d"),{shadows,pixelRatio});assert.deepEqual(rgba(canvas),rgba(await decoded(publicPNG,pixelRatio)),"Native Canvas / PNG parity");}finally{shadows.dispose();}
    await writeFile(path.join(output,`public-${pixelRatio}x.png`),publicPNG);
    const result=await opened.page.evaluate(async({style,pixelRatio})=>{
     const {createMarkShadowExample}=await import("/examples/mark-shadows/program.js"),{createMarkShadowPrimitive}=await import("/test/charts/mark-shadows/primitive.program.js");
     const {prepareShadowRendering,render}=await import("/src/index.js"),{renderToSVG}=await import("/src/renderers/svg.js");
     const createCanvas=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c;};
     const decode=async({bytes,mimeType})=>{const image=await createImageBitmap(new Blob([bytes],{type:mimeType}));return{image,width:image.width,height:image.height,originClean:true};};
     const values=[];
     for(const p of [createMarkShadowExample(style),createMarkShadowPrimitive(style)]){
      const shadows=await prepareShadowRendering(p,{createCanvas,decode,pixelRatio});
      try{const canvas=createCanvas(1,1);render(p,canvas.getContext("2d"),{shadows,pixelRatio});
       const svg=renderToSVG(p,{shadows}),image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await image.decode();
       const raster=createCanvas(260*pixelRatio,200*pixelRatio);raster.getContext("2d").drawImage(image,0,0,raster.width,raster.height);
       values.push({canvas:canvas.toDataURL(),svg:raster.toDataURL(),source:svg});
      }finally{shadows.dispose();}
     }return values;
    },{style:variant.variant,pixelRatio});
    for(const backend of ["canvas","svg"]){
     const actual=await decoded(bytes(result[0][backend]),pixelRatio),reference=await decoded(bytes(result[1][backend]),pixelRatio);
     assert.deepEqual(rgba(actual),rgba(reference),`${variant.variant} Browser ${backend} ${pixelRatio}x exact primitive/public pixels`);
     await writeFile(path.join(output,`browser-${backend}-${pixelRatio}x.png`),bytes(result[0][backend]));
     if(pixelRatio===1)checks.push(...samples(actual,fixture,`Browser ${backend}`));
    }
    await writeFile(path.join(output,`public-${pixelRatio}x.svg`),result[0].source);
    if(pixelRatio===1)checks.push(...samples(await decoded(publicPNG),fixture,"Native Canvas / PNG"));
   }
   for(const[kind,p]of [["public",publicProgram],["primitive",primitive]]){
    const pdf=(await renderToPDFBuffer(p)).buffer;await writeFile(path.join(output,`${kind}.pdf`),pdf);
    execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,`${kind}.pdf`),path.join(output,`${kind}-pdf`)],{stdio:"pipe"});
    const imageHeaders=pdf.toString("latin1").match(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>/g)??[];
    assert.equal(imageHeaders.length,2,"Only the effect glyph RGB and alpha are rasterized");
    for(const header of imageHeaders){assert.ok(Number(header.match(/\/Width\s+(\d+)/)?.[1])<frame.width);assert.ok(Number(header.match(/\/Height\s+(\d+)/)?.[1])<frame.height);}
   }
   const publicPDF=await readFile(path.join(output,"public-pdf.png")),primitivePDF=await readFile(path.join(output,"primitive-pdf.png"));
   assert.deepEqual(rgba(await decoded(publicPDF)),rgba(await decoded(primitivePDF)),"PDF exact primitive/public pixels");
   execFileSync("pdftoppm",["-r","288","-singlefile","-png",path.join(output,"public.pdf"),path.join(output,"public-pdf-4x")],{stdio:"pipe"});
   checks.push(...samples(await decoded(await readFile(path.join(output,"public-pdf-4x.png")),4),fixture,"Native PDF at 288dpi",4));
   evidence.push({variant:variant.variant,primitivePublicExact:["Canvas 1x/2x","SVG 1x/2x","PNG 1x/2x","PDF 72dpi"],pdfHash:hash(publicPDF),checks});
  }
  await writeFile(path.join(directory,"results.json"),JSON.stringify({primitivePublicPair:true,variants:evidence},null,2)+"\n");
  assert.deepEqual(evidence.flatMap(v=>v.checks.filter(c=>!c.passed).map(c=>({variant:v.variant,...c}))),[]);
  assertNoBrowserErrors(opened.errors,"Public shadow outputs");await opened.page.close();
 }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdir,readFile,writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas,loadImage,GlobalFonts } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { prepareFontRendering,prepareShadowRendering,render } from "../../../../../src/index.js";
import { nativeFontRegistrar } from "../../../../../src/renderers/nativeBackend.js";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { serializeGraphic,deserializeGraphic } from "../../../../../src/persistence.js";
import { visualVariants } from "./manifest.js";
import { startStaticServer } from "../../../../support/static-server.js";
import { openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence } from "../../../../support/browser.js";
import { ensureVariantMetadata } from "../../../../support/artifact-metadata.js";
const root=fileURLToPath(new URL("../../../../../",import.meta.url)), directory=new URL("../../../../../.artifacts/test/png/charts/mark-shadows/text/",import.meta.url);
const bytes=url=>Buffer.from(url.split(",")[1],"base64");
async function rgba(buffer){const image=await loadImage(buffer),canvas=createCanvas(image.width,image.height);canvas.getContext("2d").drawImage(image,0,0);return canvas.getContext("2d").getImageData(0,0,image.width,image.height).data;}
function visibleLayers(data,style,ratio=1){
 if(style==="plain")for(const[x,y]of [[72,56],[92,76]]){
  const i=((y*ratio+Math.floor(ratio/2))*(220*ratio)+x*ratio+Math.floor(ratio/2))*4;
  assert.deepEqual([...data.slice(i,i+4)],[255,255,255,255],"Literal A counter and its offset shadow remain empty");
 }
let source=0,shadow=0,outline=0;for(let i=0;i<data.length;i+=4){if(data[i]>data[i+1]+30&&data[i]>data[i+2]+30)source++;if(data[i+2]>data[i]+30&&data[i+2]>data[i+1]+30)shadow++;if(data[i+1]>data[i]+20&&data[i+1]>data[i+2]+20)outline++;}assert.ok(source>30,"Actual letters retain visible source ink");assert.ok(shadow>30,"Their separate glyph-shaped shadow remains visible");return{source,shadow,outline};}
const decode=async({bytes})=>{const image=await loadImage(bytes);return{image,width:image.width,height:image.height,originClean:true};};
test("font-bound public Text shadows preserve rotated multiline glyphs across four backends and offline restore",async()=>{
 let server,browser;const evidence=[];await mkdir(directory,{recursive:true});
 try{
  server=await startStaticServer(root);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,`${server.baseUrl}examples/text-shadows/`,{waitFor:()=>document.querySelector("#status").textContent==="Text shadows rendered"});
  for(const variant of visualVariants){
   const output=new URL(`${variant.variant}/`,directory);await mkdir(output,{recursive:true});
   await ensureVariantMetadata({scope:"charts",capability:"mark-shadows",chart:variant.chart,variant:variant.variant,kind:"primitive",title:variant.title,userFacingCallChain:variant.callChain});
   const p=variant.userFacing(),primitive=variant.primitive(),original=serializeGraphic(p),layers={};
   const png=(await renderToPNGBuffer(p)).buffer,reference=(await renderToPNGBuffer(primitive)).buffer;
   assert.deepEqual(await rgba(png),await rgba(reference));assert.deepEqual((await renderToPNGBuffer(deserializeGraphic(original))).buffer,png);
   await writeFile(new URL("public.png",output),png);await writeFile(new URL("primitive.png",output),reference);layers.png=visibleLayers(await rgba(png),variant.variant);
   for(const pixelRatio of [1,2]){
    const fonts=await prepareFontRendering(p,{register:nativeFontRegistrar(GlobalFonts)}),shadows=await prepareShadowRendering(p,{fonts,createCanvas,decode,pixelRatio});
    try{const canvas=createCanvas(1,1);render(p,canvas.getContext("2d"),{fonts,shadows,pixelRatio});assert.deepEqual(await canvas.encode("png"),(await renderToPNGBuffer(p,{pixelRatio})).buffer);}finally{shadows.dispose();fonts.dispose();}
   }
   for(const[kind,input]of [["public",p],["primitive",primitive]]){
    const pdf=(await renderToPDFBuffer(input)).buffer;await writeFile(new URL(`${kind}.pdf`,output),pdf);
    const images=pdf.toString("latin1").match(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>/g)??[];
    assert.equal(images.length,2);for(const image of images){assert.ok(Number(image.match(/\/Width\s+(\d+)/)?.[1])<220);assert.ok(Number(image.match(/\/Height\s+(\d+)/)?.[1])<160);}
    execFileSync("pdftoppm",["-r","72","-singlefile","-png",fileURLToPath(new URL(`${kind}.pdf`,output)),fileURLToPath(new URL(`${kind}-pdf`,output))],{stdio:"pipe"});
   }
   const pdfPNG=await readFile(new URL("public-pdf.png",output));assert.deepEqual(await rgba(pdfPNG),await rgba(await readFile(new URL("primitive-pdf.png",output))));layers.pdf=visibleLayers(await rgba(pdfPNG),variant.variant);
   for(const pixelRatio of [1,2]){
    const pair=await opened.page.evaluate(async({style,pixelRatio})=>{
     const {createTextShadowExample}=await import("/examples/text-shadows/program.js"),{createTextShadowPrimitive}=await import("/test/charts/mark-shadows/variants/text/primitive.program.js");
     const {prepareFontRendering,prepareShadowRendering,render}=await import("/src/index.js"),{renderToSVG}=await import("/src/renderers/svg.js"),{registerFont}=await import("/examples/font-assets/host.js");
     const createCanvas=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c;};
     const decode=async({bytes,mimeType})=>{const image=await createImageBitmap(new Blob([bytes],{type:mimeType}));return{image,width:image.width,height:image.height,originClean:true};};
     const pair=[];
     for(const p of [createTextShadowExample(style),createTextShadowPrimitive(style)]){
      const fonts=await prepareFontRendering(p,{register:registerFont}),shadows=await prepareShadowRendering(p,{fonts,createCanvas,decode,pixelRatio});
      let canvas,source;
      try{canvas=createCanvas(1,1);render(p,canvas.getContext("2d"),{fonts,shadows,pixelRatio});source=renderToSVG(p,{shadows});}finally{shadows.dispose();fonts.dispose();}
      // After disposing all preparation, the standalone SVG retains its own glyph PNG.
      const image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);await image.decode();const svg=createCanvas(220*pixelRatio,160*pixelRatio);svg.getContext("2d").drawImage(image,0,0,svg.width,svg.height);
      pair.push({canvas:canvas.toDataURL(),svg:svg.toDataURL(),source});
     }return pair;
    },{style:variant.variant,pixelRatio});
    for(const backend of ["canvas","svg"]){const actual=await rgba(bytes(pair[0][backend]));assert.deepEqual(actual,await rgba(bytes(pair[1][backend])),`${variant.variant} Browser ${backend} ${pixelRatio}x exact public/primitive pixels`);layers[`${backend}${pixelRatio}x`]=visibleLayers(actual,variant.variant,pixelRatio);await writeFile(new URL(`browser-${backend}-${pixelRatio}x.png`,output),bytes(pair[0][backend]));}
    await writeFile(new URL(`public-${pixelRatio}x.svg`,output),pair[0].source);
   }
   if(variant.variant==="rotated-outline")for(const layer of Object.values(layers))assert.ok(layer.outline>30,"Actual glyph outline survives the shared sublayer");
   assert.equal(serializeGraphic(p),original);
   evidence.push({variant:variant.variant,exactPrimitivePublic:["PNG","PDF","Browser Canvas 1x/2x","Browser SVG 1x/2x"],offlineGraphicPixels:"exact PNG",rasterScope:"actual glyph source plus shadow, bounded below canvas size",layers});
  }
  await writeFile(new URL("results.json",directory),JSON.stringify({variants:evidence},null,2)+"\n");assertNoBrowserErrors(opened.errors,"Text shadows");await opened.page.close();
 }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

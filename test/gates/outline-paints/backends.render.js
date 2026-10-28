import assert from "node:assert/strict";import test from "node:test";
import {mkdir,readFile,writeFile} from "node:fs/promises";import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";import {fileURLToPath} from "node:url";import path from "node:path";
import {createCanvas,loadImage,PDFDocument,GlobalFonts} from "@napi-rs/canvas";import {chromium} from "playwright";
import {variants,frame} from "./manifest.js";import {fontFamily,fontSHA256} from "./fixture.js";import {expectedColor,samplePoints,expectedBounds} from "./reference.js";
import {startStaticServer} from "../../support/static-server.js";
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from "../../support/browser.js";
import {ensureVariantMetadata} from "../../support/artifact-metadata.js";
const root=fileURLToPath(new URL("../../../",import.meta.url)),directory=path.join(root,".artifacts/test/png/review/outline-paints"),fontPath=path.join(root,"test/fixtures/fonts/metric-fixture.ttf");
const hash=b=>createHash("sha256").update(b).digest("hex"),bytes=s=>Buffer.from(s.split(",")[1],"base64");
async function decode(buffer){const image=await loadImage(buffer);assert.equal(image.width,frame.width);assert.equal(image.height,frame.height);const canvas=createCanvas(frame.width,frame.height);canvas.getContext("2d").drawImage(image,0,0);return canvas;}
function samples(canvas,fixture,backend){return samplePoints(fixture).map(([x,y])=>{const actual=[...canvas.getContext("2d").getImageData(x,y,1,1).data],expected=expectedColor(fixture,x,y);return{backend,pixel:[x,y],expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=(i===3?0:1))};});}
function verifyInkBounds(canvas,fixture,backend){
 const expected=expectedBounds(fixture),context=canvas.getContext("2d"),rgba=context.getImageData(0,0,frame.width,frame.height).data;let inkPixels=0,boundaryTouchPixels=0;const outside=[];
 for(let y=45;y<180;y++)for(let x=20;x<260;x++){const offset=(y*frame.width+x)*4;if(!fixture.underlay.some((value,i)=>Math.abs(value-rgba[offset+i])>1))continue;inkPixels++;if(x+1<expected.left||x>expected.right||y+1<expected.top||y>expected.bottom)outside.push([x,y]);else if(x+1===expected.left||x===expected.right||y+1===expected.top||y===expected.bottom)boundaryTouchPixels++;}
 assert.ok(inkPixels>0);assert.deepEqual(outside,[],`${backend} stays in explicit stroke/clip bounds`);return{backend,expected,inkPixels,boundaryTouchPixels,pixelPolicy:"closed pixel cell intersects exact geometric bounds",outsidePixels:outside.length};
}
async function prepareGroup(variant,output){
 const fixture=variant.fixture;if(fixture.opacity===1)return{};
 const {width,height,x,y}=fixture.group,canvas=createCanvas(width,height),context=canvas.getContext("2d");context.translate(-x,-y);variant.glyph(context,fixture);
 const rgba=context.getImageData(0,0,width,height);for(let i=3;i<rgba.data.length;i+=4)rgba.data[i]=Math.round(rgba.data[i]*fixture.opacity);context.putImageData(rgba,0,0);
 const png=canvas.toBuffer("image/png");await writeFile(path.join(output,"isolated-glyph.png"),png);return{image:await loadImage(png),groupURL:"data:image/png;base64,"+png.toString("base64"),groupHash:hash(png)};
}
test("compares explicit mark and fixed-font text strokes across four primitive paths",async()=>{
 let server,browser,key;const evidence=[];await mkdir(directory,{recursive:true});
 try{
  const font=await readFile(fontPath);assert.equal(hash(font),fontSHA256);key=GlobalFonts.registerFromPath(fontPath,fontFamily);assert.ok(key);const fontURL="data:font/ttf;base64,"+font.toString("base64");
  const measure=createCanvas(1,1).getContext("2d");measure.font=`60px "${fontFamily}"`;assert.equal(measure.measureText("AB").width,84);
  server=await startStaticServer(root);browser=await chromium.launch({headless:true});const opened=await openBrowserPage(browser,`${server.baseUrl}test/gates/outline-paints/browser.html`,{waitFor:()=>document.getElementById("status").textContent==="Ready"});
  for(const variant of variants){
   const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});await ensureVariantMetadata({scope:"review",chart:variant.chart,variant:variant.variant,kind:"primitive",title:variant.title,userFacingCallChain:variant.callChain});
   const prepared=await prepareGroup(variant,output),canvas=createCanvas(frame.width,frame.height);variant.primitive(canvas.getContext("2d"),variant.fixture,prepared.image);const svg=variant.svg(variant.fixture,fontURL,prepared.groupURL);await writeFile(path.join(output,"primitive.png"),canvas.toBuffer("image/png"));await writeFile(path.join(output,"primitive.svg"),svg);
   const doc=new PDFDocument(),context=doc.beginPage(frame.width,frame.height);variant.primitive(context,variant.fixture,prepared.image);doc.endPage();const pdf=doc.close();await writeFile(path.join(output,"primitive.pdf"),pdf);
   const headers=pdf.toString("latin1").match(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>/g)??[];
   if(prepared.image){assert.equal(headers.length,2);for(const h of headers){assert.equal(Number(h.match(/\/Width\s+(\d+)/)?.[1]),variant.fixture.group.width);assert.equal(Number(h.match(/\/Height\s+(\d+)/)?.[1]),variant.fixture.group.height);}}
   else assert.equal(headers.length,0,"Opaque outline and text strokes stay vector in PDF");
   execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf")],{stdio:"pipe"});
   const rendered=await opened.page.evaluate(async({fixture,groupURL,svg})=>{const result=await window.renderOutline({fixture,groupURL});const image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await image.decode();const c=document.createElement("canvas");c.width=image.width;c.height=image.height;c.getContext("2d").drawImage(image,0,0);return{...result,svg:c.toDataURL()};},{fixture:variant.fixture,groupURL:prepared.groupURL,svg});assert.equal(rendered.advance,84);
   const browserPNG=bytes(rendered.dataURL),svgPNG=bytes(rendered.svg);await writeFile(path.join(output,"browser-canvas.png"),browserPNG);await writeFile(path.join(output,"browser-svg.png"),svgPNG);
   const paths=[[canvas,"Native Canvas / PNG"],[await decode(browserPNG),"Browser Canvas"],[await decode(svgPNG),"Browser SVG"],[await decode(await readFile(path.join(output,"pdf.png"))),"Native PDF"]],checks=paths.flatMap(([c,name])=>samples(c,variant.fixture,name)),bounds=paths.map(([c,name])=>verifyInkBounds(c,variant.fixture,name));
   const entry={variant:variant.variant,nativePrimitiveOnly:true,publicPaintIntegration:"pending",fontSHA256,nativeAdvance:84,browserAdvance:rendered.advance,group:prepared.image?{...variant.fixture.group,sha256:prepared.groupHash,opacity:variant.fixture.opacity,policy:"paint stroke+fill at opacity1, then attenuate glyph alpha once"}:null,pdfRasterImages:headers.length,bounds,checks};evidence.push(entry);await writeFile(path.join(output,"evidence.json"),JSON.stringify(entry,null,2)+"\n");
  }
  assert.equal(await opened.page.locator("canvas[aria-label]").count(),variants.length);assertNoBrowserErrors(opened.errors,"Outline primitive review");await opened.page.close();
  const sheet=createCanvas(frame.width*3,(frame.height+20)*Math.ceil(variants.length/3)),context=sheet.getContext("2d");context.fillStyle="#edf2f7";context.fillRect(0,0,sheet.width,sheet.height);for(const[i,v]of variants.entries())context.drawImage(await loadImage(path.join(directory,v.variant,"primitive.png")),i%3*frame.width,Math.floor(i/3)*(frame.height+20)+20);await writeFile(path.join(directory,"contact-sheet.png"),sheet.toBuffer("image/png"));
  await writeFile(path.join(directory,"results.json"),JSON.stringify({nativePrimitiveOnly:true,publicPaintIntegration:"pending",fontSHA256,variants:evidence},null,2)+"\n");assert.deepEqual(evidence.flatMap(v=>v.checks.filter(c=>!c.passed).map(c=>({variant:v.variant,...c}))),[]);
 }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();if(key)GlobalFonts.remove(key);}
});

import assert from "node:assert/strict";
import test from "node:test";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {inflateSync} from "node:zlib";
import path from "node:path";
import {createCanvas,loadImage,ImageData,PDFDocument} from "@napi-rs/canvas";
import {chromium} from "playwright";
import {variants,frame} from "./manifest.js";
import {expectedColor,pixels} from "./reference.js";
import {startStaticServer} from "../../support/static-server.js";
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from "../../support/browser.js";
import {ensureVariantMetadata} from "../../support/artifact-metadata.js";
const root=fileURLToPath(new URL("../../../",import.meta.url)),directory=path.join(root,".artifacts/test/png/review/shadow-paints");
const hash=value=>createHash("sha256").update(value).digest("hex");
const bytes=value=>Buffer.from(value.split(",")[1],"base64");
async function decode(buffer,ratio=1){const image=await loadImage(buffer),canvas=createCanvas(frame.width*ratio,frame.height*ratio);assert.equal(image.width,frame.width*ratio);assert.equal(image.height,frame.height*ratio);canvas.getContext("2d").drawImage(image,0,0);return canvas;}
function samples(canvas,fixture,backend,ratio=1){return pixels.map(([x,y])=>{const physical=[x*ratio+Math.floor(ratio/2),y*ratio+Math.floor(ratio/2)],actual=[...canvas.getContext("2d").getImageData(...physical,1,1).data],expected=expectedColor(fixture,x,y);return {pixel:[x,y],physicalPixel:physical,expected,actual,backend,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=(i===3?0:1))};});}
function verifyPDFImage(pdf,glyph,decodedRGBA){
 const text=pdf.toString("latin1");let alphaImages=0,rgbImages=0;
 for(const match of text.matchAll(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>\s*stream\r?\n/g)){
  const header=match[0],length=Number(header.match(/\/Length\s+(\d+)/)?.[1]),start=match.index+header.length;
  assert.equal(Number(header.match(/\/Width\s+(\d+)/)?.[1]),glyph.width);assert.equal(Number(header.match(/\/Height\s+(\d+)/)?.[1]),glyph.height);
  assert.match(header,/\/Filter\s*\/FlateDecode/);const raw=inflateSync(pdf.subarray(start,start+length));
  if(header.includes("/DeviceGray")){
   alphaImages++;assert.equal(raw.length,glyph.width*glyph.height);
   for(let i=0;i<raw.length;i++)assert.equal(raw[i],glyph.pixels[i*4+3],`PDF alpha byte ${i}`);
  }else{
   rgbImages++;assert.equal(raw.length,glyph.width*glyph.height*3);
   for(let i=0;i<raw.length;i++)if(decodedRGBA[Math.floor(i/3)*4+3])assert.equal(raw[i],decodedRGBA[Math.floor(i/3)*4+i%3],`PDF visible color byte ${i}`);
  }
 }
 assert.equal(alphaImages,1);assert.equal(rgbImages,1);return{alphaImages,rgbImages,alphaBytes:glyph.width*glyph.height,visibleRGB:"exact decoded PNG bytes"};
}
test("uses identical bounded shadow sublayers across four primitive output paths",async()=>{
 let server,browser;const evidence=[];await mkdir(directory,{recursive:true});
 try{
  server=await startStaticServer(root);browser=await chromium.launch({headless:true});
  const opened=await openBrowserPage(browser,`${server.baseUrl}test/gates/shadow-paints/browser.html`,{waitFor:()=>document.querySelector("#status").textContent==="Ready"});
  for(const variant of variants){
   const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});
   await ensureVariantMetadata({scope:"review",chart:variant.chart,variant:variant.variant,kind:"primitive",title:variant.title,userFacingCallChain:variant.callChain});
   const glyph=variant.prepare(variant.fixture),surface=createCanvas(glyph.width,glyph.height);surface.getContext("2d").putImageData(new ImageData(glyph.pixels,glyph.width,glyph.height),0,0);
   const sublayer=surface.toBuffer("image/png"),dataURL=`data:image/png;base64,${sublayer.toString("base64")}`,image=await loadImage(sublayer);
   const canvas=createCanvas(frame.width,frame.height);variant.primitive(canvas.getContext("2d"),variant.fixture,image,glyph);
   const png=canvas.toBuffer("image/png"),svg=variant.svg(variant.fixture,dataURL,glyph);await writeFile(path.join(output,"sublayer.png"),sublayer);await writeFile(path.join(output,"primitive.png"),png);await writeFile(path.join(output,"primitive.svg"),svg);
   const document=new PDFDocument(),context=document.beginPage(frame.width,frame.height);variant.primitive(context,variant.fixture,image,glyph);document.endPage();const pdf=document.close();await writeFile(path.join(output,"primitive.pdf"),pdf);
   const decoded=createCanvas(glyph.width,glyph.height);decoded.getContext("2d").drawImage(image,0,0);const pdfPayload=verifyPDFImage(pdf,glyph,decoded.getContext("2d").getImageData(0,0,glyph.width,glyph.height).data);
   assert.ok(glyph.width<frame.width&&glyph.height<frame.height,"PDF rasterizes only the effect glyph");
   execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf")],{stdio:"pipe"});const pdfPNG=await readFile(path.join(output,"pdf.png"));
   execFileSync("pdftoppm",["-r","288","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf-4x")],{stdio:"pipe"});const pdf4x=await readFile(path.join(output,"pdf-4x.png"));
   const rendered=await opened.page.evaluate(async({fixture,glyph,dataURL,svg})=>{
    const canvas=await window.renderShadow({fixture,glyph,dataURL}),image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await image.decode();const c=document.createElement("canvas");c.width=image.width;c.height=image.height;c.getContext("2d").drawImage(image,0,0);return{canvas,svg:c.toDataURL()};
   },{fixture:variant.fixture,glyph:{x:glyph.x,y:glyph.y,width:glyph.width,height:glyph.height},dataURL,svg});
   const browserPNG=bytes(rendered.canvas),svgPNG=bytes(rendered.svg);await writeFile(path.join(output,"browser-canvas.png"),browserPNG);await writeFile(path.join(output,"browser-svg.png"),svgPNG);
   const checks=[...samples(canvas,variant.fixture,"Native Canvas / PNG"),...samples(await decode(browserPNG),variant.fixture,"Browser Canvas"),...samples(await decode(svgPNG),variant.fixture,"Browser SVG"),...samples(await decode(pdf4x,4),variant.fixture,"Native PDF at 288dpi",4)];
   const diagnostics=samples(await decode(pdfPNG),variant.fixture,"Native PDF at 72dpi; no equality claim");
   const entry={variant:variant.variant,nativePrimitiveOnly:true,publicPaintIntegration:"pending",rasterScope:"effect glyph only",glyph:{x:glyph.x,y:glyph.y,width:glyph.width,height:glyph.height},sublayerSHA256:hash(sublayer),pdfPayload,checks,diagnostics};evidence.push(entry);await writeFile(path.join(output,"evidence.json"),JSON.stringify(entry,null,2)+"\n");
  }
  assert.equal(await opened.page.locator("canvas[aria-label]").count(),variants.length);assertNoBrowserErrors(opened.errors,"Shadow primitive review");await opened.page.close();
  const sheet=createCanvas(frame.width*3,(frame.height+30)*2),context=sheet.getContext("2d");context.fillStyle="#edf2f7";context.fillRect(0,0,sheet.width,sheet.height);
  for(const[index,variant]of variants.entries()){const x=index%3*frame.width,y=Math.floor(index/3)*(frame.height+30);context.drawImage(await loadImage(path.join(directory,variant.variant,"primitive.png")),x,y+30);}
  await writeFile(path.join(directory,"contact-sheet.png"),sheet.toBuffer("image/png"));await writeFile(path.join(directory,"results.json"),JSON.stringify({nativePrimitiveOnly:true,publicPaintIntegration:"pending",variants:evidence},null,2)+"\n");
  assert.deepEqual(evidence.flatMap(e=>e.checks.filter(c=>!c.passed).map(c=>({variant:e.variant,...c}))),[]);
 }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

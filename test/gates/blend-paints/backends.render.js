import assert from "node:assert/strict";import test from "node:test";
import {mkdir,readFile,writeFile} from "node:fs/promises";import {execFileSync} from "node:child_process";
import {inflateSync} from "node:zlib";
import {createHash} from "node:crypto";import {fileURLToPath} from "node:url";import path from "node:path";
import {createCanvas,loadImage,PDFDocument} from "@napi-rs/canvas";import {chromium} from "playwright";
import {encodeGroupPNG} from "./group-png.js";
import {prepareBlendGroup} from "./lowered-group.js";
import {variants,frame} from "./manifest.js";import {expectedColor,expectedGroup,samplePoints} from "./reference.js";
import {startStaticServer} from "../../support/static-server.js";
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from "../../support/browser.js";
import {ensureVariantMetadata} from "../../support/artifact-metadata.js";
const root=fileURLToPath(new URL("../../../",import.meta.url)),directory=path.join(root,".artifacts/test/png/review/blend-paints");
const hash=b=>createHash("sha256").update(b).digest("hex"),bytes=s=>Buffer.from(s.split(",")[1],"base64");
async function decode(buffer){const image=await loadImage(buffer);assert.equal(image.width,frame.width);assert.equal(image.height,frame.height);const canvas=createCanvas(frame.width,frame.height);canvas.getContext("2d").drawImage(image,0,0);return canvas;}
function samples(canvas,fixture,backend){return fixture.panels.flatMap(panel=>samplePoints.map(([x,y])=>{const pixel=[x+panel.x,y+panel.y],actual=[...canvas.getContext("2d").getImageData(...pixel,1,1).data],expected=expectedColor(fixture,panel,x,y);return{backend,isolated:panel.isolated,pixel,expected,actual,passed:actual.every((v,i)=>Math.abs(v-expected[i])<=(i===3?0:1))};}));}
function groupSamples(rgba,fixture,backend){return rgba.map((actual,index)=>{const [x,y]=samplePoints[index],expected=expectedGroup(fixture,x,y,true,false),alpha=actual[3]/255;return{backend,pixel:[x,y],expected,actual,passed:Math.abs(alpha-expected[3])<=1/255&&actual.slice(0,3).every((value,i)=>Math.abs(value/255*alpha-expected[i]*expected[3])<=1/255)};});}
function verifyPDFGroup(pdf,lowered,decoded){
 let alphaImages=0,colorImages=0;
 for(const match of pdf.toString("latin1").matchAll(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>\s*stream\r?\n/g)){
  const header=match[0],length=Number(header.match(/\/Length\s+(\d+)/)?.[1]),start=match.index+header.length;
  assert.match(header,/\/Filter\s*\/FlateDecode/);const bytes=inflateSync(pdf.subarray(start,start+length));
  if(header.includes("/DeviceGray")){alphaImages++;assert.equal(bytes.length,lowered.width*lowered.height);for(let i=0;i<bytes.length;i++)assert.equal(bytes[i],lowered.rgba[i*4+3]);}
  else{colorImages++;assert.equal(bytes.length,lowered.width*lowered.height*3);for(let i=0;i<bytes.length;i++)if(decoded[Math.floor(i/3)*4+3])assert.equal(bytes[i],decoded[Math.floor(i/3)*4+i%3]);}
 }
 assert.equal(alphaImages,1);assert.equal(colorImages,1);return{alphaBytes:lowered.width*lowered.height,alpha:"exact canonical RGBA8",color:"exact decoded common PNG"};
}
test("compares final blend output across four paths and preserves raw group diagnostics",async()=>{
 let server,browser;const evidence=[];await mkdir(directory,{recursive:true});
 try{
  server=await startStaticServer(root);browser=await chromium.launch({headless:true});const opened=await openBrowserPage(browser,`${server.baseUrl}test/gates/blend-paints/browser.html`,{waitFor:()=>document.getElementById("status").textContent==="Ready"});
  for(const variant of variants){
   const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});await ensureVariantMetadata({scope:"review",chart:variant.chart,variant:variant.variant,kind:"primitive",title:variant.title,userFacingCallChain:variant.callChain});
   const group=createCanvas(variant.fixture.group.width,variant.fixture.group.height);variant.group(group.getContext("2d"),variant.fixture,{isolated:true});await writeFile(path.join(output,"native-isolated-group.png"),group.toBuffer("image/png"));
   const lowered=prepareBlendGroup(variant.fixture),groupPNG=encodeGroupPNG(lowered),dataURL="data:image/png;base64,"+groupPNG.toString("base64");await writeFile(path.join(output,"isolated-group.png"),groupPNG);
   const image=await loadImage(groupPNG),canvas=createCanvas(frame.width,frame.height);variant.primitive(canvas.getContext("2d"),variant.fixture,image);const png=canvas.toBuffer("image/png"),svg=variant.svg(variant.fixture,dataURL);await writeFile(path.join(output,"primitive.png"),png);await writeFile(path.join(output,"primitive.svg"),svg);
   const doc=new PDFDocument(),context=doc.beginPage(frame.width,frame.height);variant.primitive(context,variant.fixture,image);doc.endPage();const pdf=doc.close();await writeFile(path.join(output,"primitive.pdf"),pdf);
   const decoded=createCanvas(lowered.width,lowered.height);decoded.getContext("2d").drawImage(image,0,0);const pdfPayload=verifyPDFGroup(pdf,lowered,decoded.getContext("2d").getImageData(0,0,lowered.width,lowered.height).data);
   const mode=variant.fixture.mode;if(mode!=="source-over")assert.match(pdf.toString("latin1"),new RegExp(`/BM /${mode[0].toUpperCase()+mode.slice(1)}\\b`));
   const imageHeaders=pdf.toString("latin1").match(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>/g)??[];assert.ok(imageHeaders.length>0);for(const header of imageHeaders){assert.equal(Number(header.match(/\/Width\s+(\d+)/)?.[1]),variant.fixture.group.width);assert.equal(Number(header.match(/\/Height\s+(\d+)/)?.[1]),variant.fixture.group.height);}
   execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf")],{stdio:"pipe"});const pdfPNG=await readFile(path.join(output,"pdf.png"));
   const rendered=await opened.page.evaluate(async({fixture,samplePoints,svg,dataURL})=>{const result=await window.renderBlend({fixture,samples:samplePoints,dataURL});const image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await image.decode();const c=document.createElement("canvas");c.width=image.width;c.height=image.height;c.getContext("2d").drawImage(image,0,0);return{...result,svg:c.toDataURL()};},{fixture:variant.fixture,samplePoints,svg,dataURL});
   const browserPNG=bytes(rendered.canvas),svgPNG=bytes(rendered.svg);await writeFile(path.join(output,"browser-canvas.png"),browserPNG);await writeFile(path.join(output,"browser-svg.png"),svgPNG);await writeFile(path.join(output,"browser-isolated-group.png"),bytes(rendered.group));
   const checks=[...samples(canvas,variant.fixture,"Native Canvas / PNG"),...samples(await decode(browserPNG),variant.fixture,"Browser Canvas"),...samples(await decode(svgPNG),variant.fixture,"Browser SVG"),...samples(await decode(pdfPNG),variant.fixture,"Native PDF")];
   const groups=[...groupSamples(samplePoints.map(([x,y])=>[...group.getContext("2d").getImageData(x,y,1,1).data]),variant.fixture,"Native Canvas"),...groupSamples(rendered.samples,variant.fixture,"Browser Canvas")];
   const entry={variant:variant.variant,nativePrimitiveOnly:true,publicPaintIntegration:"pending",pdfPayload,groupComparison:"diagnostic; differences retained without tolerance expansion",pdfLowering:{opaquePanel:"native vector blend",transparentPanel:"shared Float64 premultiplied group, one final RGBA8 quantization",groupBytes:lowered.rgba.length,groupOpacity:variant.fixture.groupOpacity,groupSHA256:hash(groupPNG)},checks,groups};evidence.push(entry);await writeFile(path.join(output,"evidence.json"),JSON.stringify(entry,null,2)+"\n");
  }
  assert.equal(await opened.page.locator("canvas[aria-label]").count(),variants.length);assertNoBrowserErrors(opened.errors,"Blend primitive review");await opened.page.close();
  const sheet=createCanvas(frame.width*3,(frame.height+20)*Math.ceil(variants.length/3)),context=sheet.getContext("2d");context.fillStyle="#edf2f7";context.fillRect(0,0,sheet.width,sheet.height);for(const [i,v]of variants.entries())context.drawImage(await loadImage(path.join(directory,v.variant,"primitive.png")),i%3*frame.width,Math.floor(i/3)*(frame.height+20)+20);await writeFile(path.join(directory,"contact-sheet.png"),sheet.toBuffer("image/png"));
  await writeFile(path.join(directory,"results.json"),JSON.stringify({nativePrimitiveOnly:true,publicPaintIntegration:"pending",acceptedFinalOutputChecks:evidence.reduce((n,v)=>n+v.checks.filter(c=>c.passed).length,0),rawGroupDiagnostics:{total:evidence.reduce((n,v)=>n+v.groups.length,0),failed:evidence.flatMap(v=>v.groups.filter(c=>!c.passed).map(c=>({variant:v.variant,...c})))},variants:evidence},null,2)+"\n");assert.deepEqual(evidence.flatMap(v=>v.checks.filter(c=>!c.passed).map(c=>({variant:v.variant,...c}))),[]);
 }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

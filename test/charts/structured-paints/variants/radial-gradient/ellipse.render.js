import assert from "node:assert/strict";
import test from "node:test";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {createCanvas,loadImage,PDFDocument} from "@napi-rs/canvas";
import {chromium} from "playwright";
import {ellipseVariant as variant} from "./ellipse.manifest.js";
import {ellipseSamples} from "./ellipse-reference.js";
import {startStaticServer} from "../../../../support/static-server.js";
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from "../../../../support/browser.js";
import {ensureVariantMetadata} from "../../../../support/artifact-metadata.js";

const root=fileURLToPath(new URL("../../../../../",import.meta.url));
const output=path.join(root,".artifacts/test/png/charts/paint/radial-gradient",variant.variant);
const bytes=value=>Buffer.from(value.split(",")[1],"base64");
async function decode(buffer){
  const image=await loadImage(buffer);assert.equal(image.width,variant.width);assert.equal(image.height,variant.height);
  const canvas=createCanvas(image.width,image.height);canvas.getContext("2d").drawImage(image,0,0);return canvas;
}
test("renders the non-square radial ellipse across four primitive paths",async()=>{
  let server,browser;await mkdir(output,{recursive:true});
  try{
    await ensureVariantMetadata({scope:"charts",capability:"paint",chart:variant.chart,variant:variant.variant,kind:"primitive",title:variant.title,userFacingCallChain:variant.callChain});
    const canvas=createCanvas(variant.width,variant.height);variant.primitive(canvas.getContext("2d"),variant.fixture,{lowerOpacity:true,clipCone:true});
    const png=canvas.toBuffer("image/png"),svg=variant.svg(variant.fixture);
    await writeFile(path.join(output,"primitive.png"),png);await writeFile(path.join(output,"primitive.svg"),svg);
    const document=new PDFDocument(),context=document.beginPage(variant.width,variant.height);variant.primitive(context,variant.fixture,{lowerOpacity:true,clipCone:true});document.endPage();const pdf=document.close();
    assert.match(pdf.toString("latin1"),/\/ShadingType 3\b/);assert.doesNotMatch(pdf.toString("latin1"),/\/Subtype\s*\/Image\b/);await writeFile(path.join(output,"primitive.pdf"),pdf);
    execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf")],{stdio:"pipe"});
    server=await startStaticServer(root);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,`${server.baseUrl}test/charts/structured-paints/variants/radial-gradient/ellipse.html`,{waitFor:()=>document.getElementById("status").textContent==="Ready"});
    const rendered=await opened.page.evaluate(async svg=>{
      const source=document.querySelector("canvas"),image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await image.decode();const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;canvas.getContext("2d").drawImage(image,0,0);
      return {canvas:source.toDataURL(),svg:canvas.toDataURL(),width:source.width,height:source.height,label:source.getAttribute("aria-label")};
    },svg);
    assert.equal(rendered.width,variant.width);assert.equal(rendered.height,variant.height);assert.match(rendered.label,/ellipse/);assertNoBrowserErrors(opened.errors,"Radial ellipse primitive review");await opened.page.close();
    const canvasPNG=bytes(rendered.canvas),svgPNG=bytes(rendered.svg);await writeFile(path.join(output,"browser-canvas.png"),canvasPNG);await writeFile(path.join(output,"browser-svg.png"),svgPNG);
    const paths=[["Native PNG",png],["Browser Canvas",canvasPNG],["Browser SVG",svgPNG],["Native PDF",await readFile(path.join(output,"pdf.png"))]],checks=[];
    for(const[backend,buffer]of paths){
      const decoded=await decode(buffer),c=decoded.getContext("2d");
      for(const sample of ellipseSamples()){
        const actual=[...c.getImageData(...sample.pixel,1,1).data];
        const passed=actual.every((value,index)=>backend==="Native PDF"?value>=sample.min[index]-(index===3?0:1)&&value<=sample.max[index]+(index===3?0:1):Math.abs(value-sample.expected[index])<=(index===3?0:1));
        checks.push({backend,...sample,actual,passed});
      }
    }
    const evidence={state:"ready-for-review",publicIntegration:"pending",source:variant.source,callChain:variant.callChain,authored:{center:{x:.5,y:.5},radius:.5},bounds:variant.fixture.bounds,ellipseRadii:[110,70],pdfRasterImages:0,pdfSamplePolicy:"analytic unit-pixel footprint plus one RGB byte",checks};
    await writeFile(path.join(output,"evidence.json"),JSON.stringify(evidence,null,2)+"\n");
    assert.deepEqual(checks.filter(check=>!check.passed),[]);
  }catch(error){await saveBrowserEvidence(browser,error);throw error;}
  finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

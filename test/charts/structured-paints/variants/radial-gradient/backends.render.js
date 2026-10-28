import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createCanvas, loadImage, PDFDocument } from "@napi-rs/canvas";
import { chromium } from "playwright";
import { variants, frame } from "./manifest.js";
import { samplePixels } from "./reference.js";
import { drawRadialVectorPrimitive, RADIAL_BANDS } from "./vector.program.js";
import { startStaticServer } from "../../../../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../../../../support/browser.js";
import { ensureVariantMetadata } from "../../../../support/artifact-metadata.js";
const root = fileURLToPath(new URL("../../../../../", import.meta.url)), directory = path.join(root,".artifacts/test/png/charts/paint/radial-gradient");
const hash = value => createHash("sha256").update(value).digest("hex");
const bytes = value => Buffer.from(value.split(",")[1], "base64");
async function decode(buffer) {
  const image = await loadImage(buffer), canvas = createCanvas(frame.width, frame.height);
  assert.equal(image.width, frame.width); assert.equal(image.height, frame.height);
  canvas.getContext("2d").drawImage(image,0,0);return canvas;
}
function samples(canvas, fixture, backend) {
  return samplePixels(fixture).map(sample => {
    const actual = [...canvas.getContext("2d").getImageData(...sample.pixel,1,1).data];
    return { ...sample, actual, backend, passed: actual.every((value,index)=>backend.includes("PDF")
      ? value >= sample.footprint.min[index] - (index===3?0:1) && value <= sample.footprint.max[index] + (index===3?0:1)
      : Math.abs(value-sample.expected[index]) <= (index===3?0:1)) };
  });
}
test("compares native radial primitive interiors across four output paths", async () => {
  let server, browser; const evidence=[];
  await mkdir(directory,{recursive:true});
  try {
    server=await startStaticServer(root);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,`${server.baseUrl}test/charts/structured-paints/variants/radial-gradient/browser.html`,{waitFor:()=>document.querySelector("#status").textContent==="Ready"});
    for(const variant of variants){
      const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});
      await ensureVariantMetadata({scope:"charts",capability:"paint",chart:variant.chart,variant:variant.variant,kind:"primitive",title:variant.title,userFacingCallChain:variant.callChain});
      const canvas=createCanvas(frame.width,frame.height);variant.primitive(canvas.getContext("2d"),variant.fixture,{lowerOpacity:true,clipCone:true});
      const png=canvas.toBuffer("image/png"),svg=variant.svg(variant.fixture);
      const document=new PDFDocument(),context=document.beginPage(frame.width,frame.height);variant.primitive(context,variant.fixture,{lowerOpacity:true,clipCone:true});document.endPage();const pdf=document.close();
      assert.match(pdf.toString("latin1"), /\/ShadingType 3\b/, "PDF retains vector radial shading");
      assert.doesNotMatch(pdf.toString("latin1"), /\/Subtype\s*\/Image\b/, "PDF contains no image raster fallback");
      await writeFile(path.join(output,"primitive.png"),png);await writeFile(path.join(output,"primitive.svg"),svg);await writeFile(path.join(output,"primitive.pdf"),pdf);
      execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf")],{stdio:"pipe"});
      const pdfPNG=await readFile(path.join(output,"pdf.png"));
      const diagnostics=[];
      for(const mode of ["native-unlowered","rejected-annuli"]){
        const document=new PDFDocument(),context=document.beginPage(frame.width,frame.height);
        if(mode==="native-unlowered")variant.primitive(context,variant.fixture);else drawRadialVectorPrimitive(context,variant.fixture);
        document.endPage();await writeFile(path.join(output,`${mode}.pdf`),document.close());
        execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,`${mode}.pdf`),path.join(output,mode)],{stdio:"pipe"});
        diagnostics.push({mode,accepted:false,...(mode==="rejected-annuli"?{bands:RADIAL_BANDS}:{}),checks:samples(await decode(await readFile(path.join(output,`${mode}.png`))),variant.fixture,`${mode} PDF`)});
      }
      const rendered=await opened.page.evaluate(async({id,svg})=>{
        const source=document.getElementById(id),canvas=document.createElement("canvas"),image=new Image();image.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await image.decode();canvas.width=image.width;canvas.height=image.height;canvas.getContext("2d").drawImage(image,0,0);
        return{canvas:source.toDataURL(),svg:canvas.toDataURL(),label:source.getAttribute("aria-label")};
      },{id:variant.variant,svg});
      assert.ok(rendered.label.includes(variant.variant));const browserPNG=bytes(rendered.canvas),svgPNG=bytes(rendered.svg);
      await writeFile(path.join(output,"browser-canvas.png"),browserPNG);await writeFile(path.join(output,"browser-svg.png"),svgPNG);
      const checks=[...samples(canvas,variant.fixture,"Native Canvas / PNG"),...samples(await decode(browserPNG),variant.fixture,"Browser Canvas"),...samples(await decode(svgPNG),variant.fixture,"Browser SVG"),...samples(await decode(pdfPNG),variant.fixture,"Native PDF")];
      const entry={variant:variant.variant,nativePrimitiveOnly:true,publicPaintIntegration:"pending",pdfLowering:"stop alpha times opacity once, explicit edge cone clip",pdfSamplePolicy:"analytic unit-pixel footprint plus one RGB byte",checks,diagnostics,sha256:{png:hash(png),svg:hash(svg),pdf:hash(pdf),browser:hash(browserPNG)}};
      evidence.push(entry);await writeFile(path.join(output,"evidence.json"),JSON.stringify(entry,null,2)+"\n");
    }
    assertNoBrowserErrors(opened.errors,"Radial primitive review");await opened.page.close();
    const sheet=createCanvas(frame.width*3,(frame.height+30)*2),context=sheet.getContext("2d");context.fillStyle="#edf2f7";context.fillRect(0,0,sheet.width,sheet.height);
    for(const[index,variant]of variants.entries()){const x=index%3*frame.width,y=Math.floor(index/3)*(frame.height+30);context.drawImage(await loadImage(path.join(directory,variant.variant,"primitive.png")),x,y+30);}
    await writeFile(path.join(directory,"contact-sheet.png"),sheet.toBuffer("image/png"));
    await writeFile(path.join(directory,"results.json"),JSON.stringify({nativePrimitiveOnly:true,publicPaintIntegration:"pending",variants:evidence},null,2)+"\n");
    const failures=evidence.flatMap(entry=>entry.checks.filter(check=>!check.passed).map(check=>({variant:entry.variant,...check})));
    assert.deepEqual(failures,[]);
  }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

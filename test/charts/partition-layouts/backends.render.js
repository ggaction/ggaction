import assert from "node:assert/strict";
import test from "node:test";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {createCanvas,loadImage} from "@napi-rs/canvas";
import {chromium} from "playwright";
import {renderToPNGBuffer} from "../../../src/renderers/png.js";
import {renderToPDFBuffer} from "../../../src/renderers/pdf.js";
import {renderToSVG} from "../../../src/renderers/svg.js";
import {startStaticServer} from "../../support/static-server.js";
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from "../../support/browser.js";
import {ensureVariantMetadata} from "../../support/artifact-metadata.js";
import {variants,frame} from "./reference-values.js";
import {createPartition} from "../../../examples/partition-layouts/program.js";
import {partitionFixture} from "./primitive.program.js";
import {samplePoints} from "./reference.js";

const root=fileURLToPath(new URL("../../../",import.meta.url));
const directory=path.join(root,".artifacts/test/png/charts/partition-backends/partition-layouts");
const hash=value=>createHash("sha256").update(value).digest("hex");
const bytes=dataURL=>Buffer.from(dataURL.split(",")[1],"base64");
async function decode(buffer){
  const image=await loadImage(buffer);assert.equal(image.width,frame.width);assert.equal(image.height,frame.height);
  const canvas=createCanvas(frame.width,frame.height);canvas.getContext("2d").drawImage(image,0,0);return canvas;
}
function compareCalculation(actual,expected){
  if(typeof expected==="number"){assert.ok(Number.isFinite(actual));const delta=Math.abs(actual-expected);assert.ok(delta<1e-10);return delta;}
  if(expected===null||typeof expected!=="object"){assert.equal(actual,expected);return 0;}
  assert.deepEqual(Object.keys(actual),Object.keys(expected));let maximum=0;
  for(const key of Object.keys(expected))maximum=Math.max(maximum,compareCalculation(actual[key],expected[key]));
  return maximum;
}
test("renders public partition variants through native PNG, browser Canvas, SVG and vector PDF",async()=>{
  let server,browser;const evidence=[];await mkdir(directory,{recursive:true});
  try{
    server=await startStaticServer(root);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,`${server.baseUrl}test/charts/partition-layouts/browser.html`,{waitFor:()=>document.getElementById("status").textContent==="Ready"});
    for(const variant of variants){
      const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});
      await ensureVariantMetadata({scope:"charts",capability:"partition-backends",chart:variant.chart,variant:variant.variant,kind:"user-facing",title:variant.title,userFacingCallChain:`createPartition(${JSON.stringify(variant.variant)});`});
      const program=createPartition(variant.variant),fixture=partitionFixture(variant.variant);
      const png=await renderToPNGBuffer(program),pdf=await renderToPDFBuffer(program),svg=renderToSVG(program);
      await writeFile(path.join(output,"primitive.png"),png.buffer);await writeFile(path.join(output,"primitive.pdf"),pdf.buffer);await writeFile(path.join(output,"primitive.svg"),svg);
      const rasterImages=(pdf.buffer.toString("latin1").match(/\/Subtype\s*\/Image\b/g)??[]).length;assert.equal(rasterImages,0,"Partition PDF stays vector");
      execFileSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,"primitive.pdf"),path.join(output,"pdf")],{stdio:"pipe"});
      const concrete=JSON.parse(JSON.stringify(program.graphicSpec));
      const rendered=await opened.page.evaluate(input=>window.renderPartition(input),{id:variant.variant,graphicSpec:concrete});
      assert.equal(rendered.width,frame.width);assert.equal(rendered.height,frame.height);assert.deepEqual(rendered.graphicSpec,concrete);
      const sourceCalculationMaximumDelta=compareCalculation(rendered.calculated,concrete);
      const browserPNG=bytes(rendered.canvas),svgPNG=bytes(rendered.svg);await writeFile(path.join(output,"browser-canvas.png"),browserPNG);await writeFile(path.join(output,"browser-svg.png"),svgPNG);
      const backends=[["Native PNG",png.buffer],["Browser Canvas",browserPNG],["Browser SVG",svgPNG],["Native PDF",await readFile(path.join(output,"pdf.png"))]];
      const checks=[],ink=[];
      for(const[backend,buffer]of backends){
        const canvas=await decode(buffer),context=canvas.getContext("2d");
        const pixels=context.getImageData(20,60,440,260).data;let inkPixels=0;
        for(let i=0;i<pixels.length;i+=4)if(pixels[i]<250||pixels[i+1]<250||pixels[i+2]<250)inkPixels++;
        if(variant.input==="zero")assert.equal(inkPixels,0);else assert.ok(inkPixels>1000);
        ink.push({backend,region:{x:20,y:60,width:440,height:260},inkPixels});
        for(const sample of samplePoints(variant)){
          const actual=[...context.getImageData(sample.x,sample.y,1,1).data];
          checks.push({backend,pixel:[sample.x,sample.y],label:sample.label,expected:sample.rgba,actual,passed:actual.every((value,i)=>Math.abs(value-sample.rgba[i])<=(i===3?0:1))});
        }
      }
      const entry={variant:variant.variant,publicSource:"examples/partition-layouts/program.js",publicIntegration:"implemented",graphicSHA256:hash(JSON.stringify(program.graphicSpec)),rendererInput:"identical concrete graphicSpec",sourceCalculationMaximumDelta,visibleNodes:fixture.shapes.length,retainedNodes:fixture.view.nodes.length,breadcrumbKeys:fixture.view.breadcrumbKeys,diagnostics:fixture.view.diagnostics,pdfRasterImages:rasterImages,ink,checks};
      evidence.push(entry);await writeFile(path.join(output,"evidence.json"),JSON.stringify(entry,null,2)+"\n");
    }
    assert.equal(await opened.page.locator("canvas[aria-label]").count(),variants.length);assertNoBrowserErrors(opened.errors,"Partition public renderers");await opened.page.close();
    const sheet=createCanvas(frame.width*3,frame.height*Math.ceil(variants.length/3)),context=sheet.getContext("2d");context.fillStyle="#e2e8f0";context.fillRect(0,0,sheet.width,sheet.height);
    for(const[index,variant]of variants.entries())context.drawImage(await loadImage(path.join(directory,variant.variant,"primitive.png")),index%3*frame.width,Math.floor(index/3)*frame.height);
    await writeFile(path.join(directory,"contact-sheet.png"),sheet.toBuffer("image/png"));
    await writeFile(path.join(directory,"results.json"),JSON.stringify({publicIntegration:"implemented",variants:evidence},null,2)+"\n");
    assert.deepEqual(evidence.flatMap(entry=>entry.checks.filter(check=>!check.passed).map(check=>({variant:entry.variant,...check}))),[]);
  }catch(error){await saveBrowserEvidence(browser,error);throw error;}
  finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

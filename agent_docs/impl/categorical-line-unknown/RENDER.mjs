// Development qualification; no image inspection or external requests.
import assert from "node:assert/strict";
import {mkdir, writeFile, readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {createHash} from "node:crypto";
import {createCanvas, loadImage, PDFDocument} from "@napi-rs/canvas";
import {chart} from "../../../src/index.js";
import {renderToSVG} from "../../../src/renderers/svg.js";
import {renderToPNGBuffer} from "../../../src/renderers/png.js";
import {renderToPDFBuffer} from "../../../src/renderers/pdf.js";

const output = path.resolve(".artifacts/categorical-line-unknown-render");
await mkdir(output, {recursive: true});
const rows = [undefined, null, "Reference"].flatMap(kind => [0, 1].map(x => ({x, y: x, ...(kind === undefined ? {} : {kind})})));
const program = chart().createCanvas({width:440, height:220, margin:{left:20, right:160, top:10, bottom:20}})
  .createData({values:rows}).createLinePlot({id:"paths", x:"x", y:"y", guides:false})
  .encodeColor({field:"kind", scale:{domain:["Regression","Reference"], range:["firebrick","black"], unknown:"transparent"}});
function drawPrimitive(context) {
  context.fillStyle="white"; context.fillRect(0,0,440,220);
  context.strokeStyle="black"; context.lineWidth=2;
  context.beginPath(); context.moveTo(20,200); context.lineTo(280,10); context.stroke();
}
async function pixels(buffer) {
  const context=createCanvas(440,220).getContext("2d");
  context.drawImage(await loadImage(buffer),0,0);
  return context.getImageData(0,0,440,220).data;
}
const primitive=createCanvas(440,220);drawPrimitive(primitive.getContext("2d"));
const png=await renderToPNGBuffer(program), pdf=await renderToPDFBuffer(program), svg=renderToSVG(program);
const expected=primitive.getContext("2d").getImageData(0,0,440,220).data;
assert.deepEqual(await pixels(png.buffer),expected);
assert.ok([...expected].filter((v,i)=>i%4!==3&&v<255).length>0);
assert.equal(program.graphicSpec.objects.paths.items.length,3);
assert.equal((svg.match(/stroke="transparent"/g)??[]).length,2);
assert.match(svg,/stroke="black"/);
const primitivePdf=new PDFDocument();drawPrimitive(primitivePdf.beginPage(440,220));primitivePdf.endPage();
for(const [name,buffer] of [["public.pdf",pdf.buffer],["primitive.pdf",primitivePdf.close()],["public.png",png.buffer],["primitive.png",await primitive.encode("png")]]) {
  await writeFile(path.join(output,name),buffer);
}
await writeFile(path.join(output,"public.svg"),svg);
for(const name of ["public","primitive"]) {
  const result=spawnSync("pdftoppm",["-r","72","-singlefile","-png",path.join(output,`${name}.pdf`),path.join(output,`${name}-pdf`)],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
}
const pdfPublic=await pixels(await readFile(path.join(output,"public-pdf.png")));
const pdfPrimitive=await pixels(await readFile(path.join(output,"primitive-pdf.png")));
assert.deepEqual(pdfPublic,pdfPrimitive);
const digest=data=>createHash("sha256").update(data).digest("hex");
const report={status:"pass",dimensions:[440,220],rawRows:rows.length,paths:3,transparentPaths:2,normalReferencePaths:1,
  nativePngDecodedPrimitiveExact:true,nativePdfDecodedPrimitiveExact:true,svgTransparentPathCount:2,
  nativePngPixelsSha256:digest(expected),nativePdfPixelsSha256:digest(pdfPublic),pixelTolerance:0,
  chartPixelsInspected:false,schoolRequests:0};
await writeFile(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));

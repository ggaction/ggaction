import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../../src/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { geographicLandProgram, landCanvas, landChecks } from "../../support/geographic-land.js";
const directory=new URL("../../../.artifacts/test/png/charts/geographic-marks/land-winding/",import.meta.url);
test("explicit clockwise world land keeps literal land and ocean pixels in Canvas PNG and PDF",async()=>{
  const values=JSON.parse(await readFile(new URL("../../../scripts/chart-gallery/data/land-110m.geojson",import.meta.url)));
  const p=geographicLandProgram(values), records={};
  await mkdir(directory,{recursive:true});
  const canvas=createCanvas(landCanvas.width,landCanvas.height);render(p,canvas.getContext("2d"));
  const png=await renderToPNGBuffer(p),pdf=await renderToPDFBuffer(p);
  await writeFile(new URL("land.png",directory),png.buffer);await writeFile(new URL("land.pdf",directory),pdf.buffer);
  const stem=fileURLToPath(new URL("land",directory));execFileSync("pdftoppm",["-r","72","-singlefile","-png",`${stem}.pdf`,`${stem}-pdf`],{stdio:"pipe"});
  for(const [backend,image] of [["Canvas",canvas],["PNG",await loadImage(png.buffer)],["PDF",await loadImage(`${stem}-pdf.png`)]]){
    const copy=createCanvas(landCanvas.width,landCanvas.height),context=copy.getContext("2d");context.drawImage(image,0,0);
    records[backend]=landChecks.map(({point:[x,y],expected,region})=>{const actual=[...context.getImageData(x,y,1,1).data];assert.deepEqual(actual,expected,`${backend}: ${region}`);return{region,actual,expected};});
  }
  assert.equal((pdf.buffer.toString("latin1").match(/\/Subtype\s*\/Image\b/g)??[]).length,0,"Geographic paths remain vector");
  await writeFile(new URL("pixels.json",directory),JSON.stringify(records,null,2));
});

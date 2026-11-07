import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../../src/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { comparableSVG } from "../../support/identity-equivalence.js";
import { visualVariants as marginal } from "./manifest.js";
import { visualVariants as bullet } from "../bullet/manifest.js";
import { visualVariants as linked } from "../linked-composition/manifest.js";
for (const variant of [...marginal,...bullet,linked[0]]) test(`${variant.chart} preserves primitive and offline Canvas, SVG, PNG, PDF and scene output`, async () => {
  const publicProgram=variant.userFacing(), programs=[variant.primitive(),publicProgram,deserializeGraphic(serializeGraphic(publicProgram))];
  const directory=await mkdtemp(path.join(tmpdir(),"composition-recipes-"));
  const pixels=canvas=>Buffer.from(canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data);
  try {
    const png=[],pdf=[];
    for (const [i,p] of programs.entries()) {
      assert.equal(comparableSVG(p),comparableSVG(programs[0]));
      const native=createCanvas(1,1); render(p,native.getContext("2d"));
      const image=await loadImage((await renderToPNGBuffer(p)).buffer), decoded=createCanvas(image.width,image.height);
      decoded.getContext("2d").drawImage(image,0,0); png.push(pixels(decoded)); assert.deepEqual(pixels(native),png.at(-1));
      const stem=path.join(directory,String(i)); await writeFile(`${stem}.pdf`,(await renderToPDFBuffer(p)).buffer);
      execFileSync("pdftoppm",["-r","72","-singlefile","-png",`${stem}.pdf`,stem],{stdio:"pipe"});
      const pdfImage=await loadImage(`${stem}.png`),pdfCanvas=createCanvas(pdfImage.width,pdfImage.height);
      pdfCanvas.getContext("2d").drawImage(pdfImage,0,0);pdf.push(pixels(pdfCanvas));
    }
    assert.deepEqual(png[1],png[0]);assert.deepEqual(png[2],png[1]);assert.deepEqual(pdf[1],pdf[0]);assert.deepEqual(pdf[2],pdf[1]);
    const scene=createTransitionScene(programs[2],{format:"canvas"}),canvas=createCanvas(1,1);renderTransitionScene(scene,canvas.getContext("2d"));
    assert.deepEqual(pixels(canvas),png[1]);
  } finally {await rm(directory,{recursive:true,force:true});}
});

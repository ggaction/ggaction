import test from "node:test";
import assert from "node:assert/strict";
import { mkdir,readFile,writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas,loadImage,GlobalFonts } from "@napi-rs/canvas";
import { prepareFontRendering,render } from "../../../../../src/index.js";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { renderToSVG } from "../../../../../src/renderers/svg.js";
import { nativeAxisReflowFontFrame } from "../../../../support/animation-axis-reflow-node.js";

for(const dependencies of [false,true]) test(`dynamic axis lines${dependencies?" and dependent title/legend":""} use current native font layout in Canvas, PNG, SVG and vector PDF`,async()=>{
  const {frame,expected}=await nativeAxisReflowFontFrame({dependencies}),width=dependencies?470:330,height=dependencies?400:300,directory=new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/axis-label-reflow/${dependencies?"dependencies":"labels"}/`,import.meta.url);
  await mkdir(directory,{recursive:true});
  const fonts=await prepareFontRendering(frame,{register:request=>{
    const key=GlobalFonts.register(request.bytes,request.family);assert.ok(key);
    return {...Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(k=>[k,request[k]])),dispose:()=>assert.ok(GlobalFonts.remove(key))};
  }});
  try {
    const canvas=createCanvas(1,1);render(frame,canvas.getContext("2d"),{fonts});
    const actual=await renderToPNGBuffer(frame),native=await renderToPNGBuffer(expected);
    assert.deepEqual(actual.buffer,native.buffer);assert.deepEqual(actual.buffer,await canvas.encode("png"));
    const pixels=async input=>{const image=await loadImage(input),c=createCanvas(width,height);c.getContext("2d").drawImage(image,0,0);return c.getContext("2d").getImageData(0,0,width,height).data;};
    await writeFile(new URL("middle.png",directory),actual.buffer);
    for(const [name,input] of [["middle",frame],["native",expected]]){
      const svg=renderToSVG(input),pdf=(await renderToPDFBuffer(input)).buffer;
      assert.equal((svg.match(/>AB AB<\/text>/g)??[]).length,3);assert.ok(Buffer.from(pdf).includes(Buffer.from("/ToUnicode")));
      await writeFile(new URL(`${name}.svg`,directory),svg);await writeFile(new URL(`${name}.pdf`,directory),pdf);
      const prefix=fileURLToPath(new URL(name,directory));execFileSync("pdftoppm",["-r","72","-singlefile","-png",`${prefix}.pdf`,`${prefix}-pdf`],{stdio:"pipe"});
    }
    assert.deepEqual(await pixels(await readFile(new URL("middle-pdf.png",directory))),await pixels(await readFile(new URL("native-pdf.png",directory))));
    assert.ok((await pixels(actual.buffer)).some((value,index)=>index%4===3&&value>0));
  }finally{fonts.dispose();}
});

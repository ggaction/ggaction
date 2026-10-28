import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {createCanvas,loadImage} from "@napi-rs/canvas";
import {render} from "../../../src/index.js";
import {renderToPDFBuffer} from "../../../src/renderers/pdf.js";
import {createBlendProgram} from "../../support/bar-blend-program.js";

// Requires Poppler's pdftoppm. CI installs it explicitly before renderer tests.
test("PDF blend glyphs retain opaque RGB and bounded alpha quantization",async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),"ggaction-pdf-blend-"));
  try{
    for(const blend of ["difference","multiply","screen"])for(const background of ["#ffffff","#808080","#336699","none"])for(const opacity of [1,.5]){
      const program=createBlendProgram({background,opacity,blend});
      const png=createCanvas(1,1),context=png.getContext("2d");render(program,context);
      // PDF is viewed on white paper; composite the PNG page onto the same paper.
      const paper=createCanvas(200,200).getContext("2d");paper.fillStyle="white";paper.fillRect(0,0,200,200);paper.drawImage(png,0,0);
      const pdf=await renderToPDFBuffer(program);
      assert.match(pdf.buffer.toString("latin1"),new RegExp(`/BM /${blend[0].toUpperCase()+blend.slice(1)}\\b`));
      const file=path.join(directory,"chart.pdf"),base=path.join(directory,"page");
      await writeFile(file,pdf.buffer);
      execFileSync("pdftoppm",["-r","72","-singlefile","-png",file,base],{stdio:"pipe"});
      const image=await loadImage(base+".png"),decoded=createCanvas(200,200).getContext("2d");decoded.drawImage(image,0,0);
      for(const [x,y] of [[100,100],[100,42],[100,37]]){
        const actual=[...decoded.getImageData(x,y,1,1).data],expected=[...paper.getImageData(x,y,1,1).data];
        for(let c=0;c<4;c++)assert.ok(Math.abs(actual[c]-expected[c])<=(opacity===1||c===3?0:1),JSON.stringify({blend,background,opacity,x,y,c,actual,expected}));
      }
    }
  }finally{await rm(directory,{recursive:true,force:true});}
});

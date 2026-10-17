import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,rm}from'node:fs/promises';
import {tmpdir}from'node:os';
import path from'node:path';
import {execFileSync}from'node:child_process';
import {createCanvas,loadImage,PDFDocument}from'@napi-rs/canvas';
import {renderToPDFBuffer}from'../../../src/renderers/pdf.js';
import {normalGlyphScene,independentGlyphReference}from'../../oracles/glyph-opacity.js';
test('PDF normal glyph sources equal independent native PDF embedding without a color tolerance',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-normal-glyph-pdf-'));
 try{
  for(const type of ['circle','rect','path'])for(const opacity of [0,.7,1])for(const background of ['white','#556677','transparent']){
   const fill='rgba(255,0,0,0.4)',stroke='rgba(0,0,255,0.6)',scene=normalGlyphScene(type,opacity,fill,stroke);scene.graphicSpec.objects.canvas.properties.background=background;
   const actual=await renderToPDFBuffer(scene);
   const {source,left,top}=independentGlyphReference(createCanvas,{type,opacity,fill,stroke,background,surfaceOnly:true});
   const doc=new PDFDocument(),c=doc.beginPage(80,80);c.fillStyle=background;c.fillRect(0,0,80,80);c.drawImage(source,left,top);doc.endPage();
   const results=[];
   for(const [label,buffer]of[['actual',actual.buffer],['expected',doc.close()]]){
    const file=path.join(directory,label+'.pdf'),base=path.join(directory,label);await writeFile(file,buffer);
    execFileSync('pdftoppm',['-r','72','-singlefile','-png',file,base],{stdio:'pipe'});
    const canvas=createCanvas(80,80),ctx=canvas.getContext('2d');ctx.drawImage(await loadImage(base+'.png'),0,0);results.push(ctx.getImageData(0,0,80,80).data);
   }
   assert.equal(results[0].every((value,index)=>value===results[1][index]),true,JSON.stringify({type,opacity,background}));
  }
 }finally{await rm(directory,{recursive:true,force:true});}
});

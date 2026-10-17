import assert from 'node:assert/strict';import test from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir}from'node:os';import path from 'node:path';import{execFileSync}from'node:child_process';
import{PDFDocument,createCanvas,loadImage}from'@napi-rs/canvas';
import{renderToPDFBuffer}from'../../../src/renderers/pdf.js';
import{createPublicProgram}from'./manifest.js';
test('combined numeric legend PDF matches independently drawn literal circles and labels',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-combined-pdf-'));
 try{
  const actual=await renderToPDFBuffer(createPublicProgram()),doc=new PDFDocument(),c=doc.beginPage(600,300);
  c.fillStyle='white';c.fillRect(0,0,600,300);
  for(const[x,y,r,fill]of[[10,290,1,'#000000'],[205,150,2,'#808080'],[400,10,3,'#ffffff'],[433.5,48.5,1,'#000000'],[433.5,66.5,2,'#808080'],[433.5,84.5,3,'#ffffff']]){
   c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fillStyle=fill;c.fill();if(x===433.5){c.strokeStyle='#777';c.lineWidth=1;c.stroke();}
  }
  c.font='normal 12px sans-serif';c.fillStyle='#334155';c.textAlign='left';c.textBaseline='top';
  c.fillText('0',449,42.5);c.fillText('5',449,60.5);c.fillText('10',449,78.5);
  c.font='600 13px sans-serif';c.fillStyle='#0f172a';c.fillText('Value',430,10);doc.endPage();
  const outputs=[];
  for(const[label,buffer]of[['public',actual.buffer],['literal',doc.close()]]){
   const file=path.join(directory,label+'.pdf'),out=path.join(directory,label);await writeFile(file,buffer);
   execFileSync('pdftoppm',['-r','72','-singlefile','-png',file,out],{stdio:'pipe'});
   const canvas=createCanvas(600,300),ctx=canvas.getContext('2d');ctx.drawImage(await loadImage(out+'.png'),0,0);outputs.push(ctx.getImageData(0,0,600,300).data);
  }
  assert.deepEqual(...outputs);
 }finally{await rm(directory,{recursive:true,force:true});}
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCanvas,loadImage,PDFDocument} from '@napi-rs/canvas';
import {chart,render} from '../../../src/index.js';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';
import {drawSampleWindow} from '../../oracles/sample-window.js';
test('public sample window has exact native PNG and PDF cropped-circle geometry',async()=>{
 const p=chart().createCanvas({width:600,height:400,margin:150}).createData({values:[{v:0},{v:10}]}).createPointMark({id:'p'})
  .encodeSize({field:'v',scale:{domain:[0,10],range:[1600*Math.PI,1600*Math.PI]}}).createLegend({channels:['size'],values:[0],clipHeight:30})
  .editLegendBlock({target:'p',channel:'size',symbol:{fill:'red',stroke:'blue',strokeWidth:2,opacity:1}});
 const glyph=p.graphicSpec.objects[p.graphicSpec.objects[p.graphicSpec.objects.sizeLegendSymbols.children[0]].children[0]];assert.equal(glyph.properties.radius,40);
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-window-pdf-'));
 try{for(const background of ['white','#556677'])for(const[dx,dy]of[[0,0],[.5,.25]]){
  const scene={graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:100,height:100,background},children:['window']},window:{type:'canvas',properties:{x:9+dx,y:35+dy,width:82,height:30},children:['glyph']},glyph},order:['canvas']}};
  for(const pixelRatio of [1,1.5,2]){
   const a=createCanvas(1,1),b=createCanvas(1,1);render(scene,a.getContext('2d'),{pixelRatio});
   assert.deepEqual(a.getContext('2d').getImageData(0,0,a.width,a.height).data,drawSampleWindow(b.getContext('2d'),{background,dx,dy,pixelRatio}));
  }
  const actual=await renderToPDFBuffer(scene),doc=new PDFDocument(),c=doc.beginPage(100,100);
  c.fillStyle=background;c.fillRect(0,0,100,100);c.save();c.translate(9+dx,35+dy);c.beginPath();c.rect(0,0,82,30);c.clip();
  c.beginPath();c.arc(41,15,40,0,2*Math.PI);c.fillStyle='red';c.fill();c.lineWidth=2;c.strokeStyle='blue';c.stroke();c.restore();doc.endPage();
  const results=[];for(const[label,buffer]of[['public',actual.buffer],['native',doc.close()]]){
   const file=path.join(directory,label+'.pdf'),out=path.join(directory,label);await writeFile(file,buffer);
   execFileSync('pdftoppm',['-r','72','-singlefile','-png',file,out],{stdio:'pipe'});
   const a=createCanvas(100,100),ctx=a.getContext('2d');ctx.drawImage(await loadImage(out+'.png'),0,0);results.push(ctx.getImageData(0,0,100,100).data);
  }assert.deepEqual(...results);
 }}finally{await rm(directory,{recursive:true,force:true});}
});

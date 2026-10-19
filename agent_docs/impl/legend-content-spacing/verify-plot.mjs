import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '@napi-rs/canvas';

const directory=process.argv[2];assert(directory,'Supply a previously rendered target directory');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),samples=[];
for(const[suffix,ratio]of[['png',1],['dpr2.png',2]]){
  const rgba=[];
  for(const name of['uniform-control','content-spacing-primitive-target']){
    const image=await loadImage(await fs.readFile(directory+'/'+name+'.'+suffix));
    const canvas=createCanvas(image.width,image.height),context=canvas.getContext('2d');
    context.drawImage(image,0,0);rgba.push(context.getImageData(0,0,canvas.width,canvas.height).data);
  }
  let ink=0,differences=0;const plot=[];
  for(let y=30*ratio;y<190*ratio;y++)for(let x=40*ratio;x<180*ratio;x++){
    const index=(y*320*ratio+x)*4,a=rgba[0].slice(index,index+4),b=rgba[1].slice(index,index+4);
    assert.deepEqual(b,a);plot.push(...b);
    if(b[3]>0&&b[0]+b[1]+b[2]<740)ink++;
  }
  assert(ink>100*ratio*ratio);
  for(let index=0;index<rgba[0].length;index++)if(rgba[0][index]!==rgba[1][index])differences++;
  assert(differences>0);
  samples.push({ratio,plotInkPixels:ink,unchangedPlotRgbaSha256:sha(new Uint8Array(plot)),
    wholeImageChannelDifferences:differences,plotRgbaExact:true});
}
const result={status:'pass',targetProofSha256:sha(await fs.readFile(directory+'/target-proof.json')),
  verificationScriptSha256:sha(await fs.readFile(import.meta.filename)),samples,schoolCalls:0,chartPixelsInspected:false};
await fs.writeFile(directory+'/plot-ink-proof.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));

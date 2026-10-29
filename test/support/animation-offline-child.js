import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { prepareFontRendering, prepareImageRendering, render } from '../../src/index.js';
import { deserializeAnimation, exportAnimationFrames } from '../../src/animation.js';
import { renderToSVG } from '../../src/renderers/svg.js';
import { renderToPNGBuffer } from '../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../src/renderers/pdf.js';

export const animationOfflineChildURL = new URL(import.meta.url);

async function main() {
let networkCalls=0;
const deny=()=>{networkCalls++;throw new Error('Network forbidden during offline animation replay');};
globalThis.fetch=deny;
for(const module of [http,https]){module.get=deny;module.request=deny;}
net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;
syncBuiltinESMExports();
const sha=value=>createHash('sha256').update(value).digest('hex');
let text='';for await(const chunk of process.stdin)text+=chunk;
const {plan,playback}=deserializeAnimation(text),records=[];
for(const frame of exportAnimationFrames(plan,{timesMs:[0,50,100]})){
  let registered=0,removed=0,decoded=0;
  const fonts=await prepareFontRendering(frame,{register:request=>{
    const key=GlobalFonts.register(request.bytes,request.family);if(!key)throw Error('font decode');registered++;
    return {...Object.fromEntries(['contentHash','family','style','weight','metricsProviderVersion'].map(k=>[k,request[k]])),
      dispose(){if(!GlobalFonts.remove(key))throw Error('font cleanup');removed++;}};
  }});
  try{
    const images=await prepareImageRendering(frame,{decode:async({bytes})=>{decoded++;const image=await loadImage(bytes);
      return {image,width:image.width,height:image.height,originClean:true};}});
    const canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'),{fonts,images});
    const svg=renderToSVG(frame),png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);
    fonts.dispose();
    records.push({timeMs:frame.timeMs,sceneHash:sha(JSON.stringify(frame.scene)),svgHash:sha(svg),
      pngHash:sha(png.buffer),canvasHash:sha(await canvas.encode('png')),pdfSignature:Buffer.from(pdf.buffer).subarray(0,4).toString(),
      registered,removed,decoded,pixels:[[20,20],[40,20],[23,62],[52,62],[168,100]].map(([x,y])=>[...canvas.getContext('2d').getImageData(x,y,1,1).data])});
  }finally{fonts.dispose();}
}
process.stdout.write(JSON.stringify({records,networkCalls,playback}));

}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

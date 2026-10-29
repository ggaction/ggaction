import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { planTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from '../../../../../src/animation.js';
import { renderToPNGBuffer } from '../../../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../../../src/renderers/pdf.js';
import { renderToSVG } from '../../../../../src/renderers/svg.js';
import { animationAssetEndpoints } from '../../../../support/animation-asset-frame.js';

test('offline exported frames retain embedded image and glyph interiors in PNG and PDF',async()=>{
  const directory=new URL('../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/',import.meta.url);
  await mkdir(directory,{recursive:true});
  const bytes=await readFile(new URL('../../../../fixtures/fonts/metric-fixture.ttf',import.meta.url));
  const font={contentHash:createHash('sha256').update(bytes).digest('hex'),mimeType:'font/ttf',byteLength:bytes.length,
    family:'ggaction Metric Fixture',style:'normal',weight:400,metricsProviderVersion:'fixture@1',payload:{encoding:'base64',data:bytes.toString('base64')}};
  const {from,to}=animationAssetEndpoints(font,bytes=>Buffer.from(bytes).toString('base64'));
  const restored=deserializeAnimation(serializeAnimation(planTransition({from,to,options:{durationMs:100,easing:'linear'}})));
  const results=[];
  for(const frame of exportAnimationFrames(restored.plan,{timesMs:[0,50,100]})){
    const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame),prefix=fileURLToPath(new URL(`offline-${frame.timeMs}`,directory));
    await writeFile(`${prefix}.png`,png.buffer);await writeFile(`${prefix}.pdf`,pdf.buffer);await writeFile(`${prefix}.svg`,renderToSVG(frame));
    execFileSync('pdftoppm',['-r','72','-singlefile','-png',`${prefix}.pdf`,`${prefix}-pdf`],{stdio:'pipe'});
    const samples=[];
    for(const value of [png.buffer,await readFile(`${prefix}-pdf.png`)]){
      const image=await loadImage(value),canvas=createCanvas(300,200),context=canvas.getContext('2d');context.drawImage(image,0,0);
      samples.push([[20,20],[40,20],[23,62],[52,62],[168,100]].map(([x,y])=>[...context.getImageData(x,y,1,1).data]));
    }
    samples[0].forEach((pixel,i)=>pixel.forEach((value,c)=>assert.ok(Math.abs(value-samples[1][i][c])<=1,JSON.stringify({time:frame.timeMs,samples}))));
    if(frame.timeMs===0)assert.deepEqual(samples[0].slice(0,4),[[255,0,0,255],[0,0,255,255],[0,128,0,255],[255,255,255,255]]);
    if(frame.timeMs===50)assert.deepEqual(samples[0][4],[255,0,0,255]);
    results.push({timeMs:frame.timeMs,samples});
  }
  await writeFile(new URL('offline-pixels.json',directory),JSON.stringify(results,null,2));
});

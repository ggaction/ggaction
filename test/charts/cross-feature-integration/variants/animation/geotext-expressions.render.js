import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';
import {render} from '../../../../../src/index.js';
import {renderToSVG} from '../../../../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../../../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../../../../src/renderers/pdf.js';
import {geoTextExpressionFrame,geoTextExpressionVariants,expectedGeoTextFrame} from '../../../../support/animation-geotext-expressions.js';

for(const variant of geoTextExpressionVariants)test(`Geo Text ${variant} expressions preserve current camera across four backends`,async()=>{
  const {frame,nativeFrom,nativeTo}=geoTextExpressionFrame(variant),dir=new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/geotext-expressions/${variant}/`,import.meta.url);
  await mkdir(dir,{recursive:true});
  const expected=expectedGeoTextFrame(nativeFrom,nativeTo),png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame),canvas=createCanvas(1,1);
  assert.deepEqual(png.buffer,(await renderToPNGBuffer(expected)).buffer);render(frame,canvas.getContext('2d'));
  assert.deepEqual(png.buffer,await canvas.encode('png'));
  const output=fileURLToPath(new URL('current',dir));await writeFile(output+'.png',png.buffer);await writeFile(output+'.pdf',pdf.buffer);await writeFile(output+'.svg',renderToSVG(frame));
  execFileSync('pdftoppm',['-r','72','-singlefile','-png',output+'.pdf',output+'-pdf'],{stdio:'pipe'});
  await writeFile(output+'-expected.pdf',(await renderToPDFBuffer(expected)).buffer);
  execFileSync('pdftoppm',['-r','72','-singlefile','-png',output+'-expected.pdf',output+'-expected-pdf'],{stdio:'pipe'});
  assert.deepEqual(await readFile(output+'-pdf.png'),await readFile(output+'-expected-pdf.png'));
  const native=[nativeFrom,nativeTo].map(p=>{const c=createCanvas(1,1);render(p,c.getContext('2d'));return c.getContext('2d').getImageData(0,0,400,300).data;});
  const data=canvas.getContext('2d').getImageData(0,0,400,300).data;let compared=0;
  const solid=i=>native[0][i]===255&&native[0][i+1]===0&&native[0][i+2]===0&&native[1][i]===0&&native[1][i+1]===0&&native[1][i+2]===255;
  if(variant!=='layout')for(let i=0;i<data.length;i+=4)if(solid(i)){for(const [channel,expected]of[188,0,188,255].entries())assert.ok(data[i+channel]===expected,`${i/4} channel ${channel}: ${data[i+channel]} vs ${expected}`);compared++;}
  if(variant!=='layout')assert.ok(compared>20);
  assert.match(renderToSVG(frame),/linearRGB/);assert.match(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image\b/);
  await writeFile(output+'.json',JSON.stringify({variant,compared,lowering:'per-item weighted Text raster; native source and frame remain concrete'},null,2));
});

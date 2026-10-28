import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCanvas, loadImage, PDFDocument } from '@napi-rs/canvas';
import { chromium } from 'playwright';
import { renderToPNGBuffer } from '../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../src/renderers/pdf.js';
import { renderToSVG } from '../../../src/renderers/svg.js';
import { variants, frame } from './manifest.js';
import { assetSVG } from './fixture.js';
import { samples } from './reference.js';
import { startStaticServer } from '../../support/static-server.js';
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from '../../support/browser.js';
import { ensureVariantMetadata } from '../../support/artifact-metadata.js';
const root=fileURLToPath(new URL('../../../',import.meta.url)),directory=path.join(root,'.artifacts/test/png/charts/image-assets');
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=value=>Buffer.from(value.split(',')[1],'base64');
async function decode(buffer) {
  const image=await loadImage(buffer),canvas=createCanvas(frame.width,frame.height);
  assert.equal(image.width,frame.width);assert.equal(image.height,frame.height);
  canvas.getContext('2d').drawImage(image,0,0);return canvas;
}
function checks(canvas,fixture,backend) {
  return samples(fixture).map(sample=>{
    const actual=[...canvas.getContext('2d').getImageData(...sample.pixel,1,1).data];
    return {...sample,actual,backend,passed:actual.every((value,i)=>Math.abs(value-sample.expected[i])<=(i===3?0:1))};
  });
}
test('offline image primitives preserve fit, clip and alpha across four output paths',async()=>{
  let server,browser;const evidence=[];
  await mkdir(directory,{recursive:true});
  try {
    const source=await loadImage(Buffer.from(assetSVG));
    server=await startStaticServer(root);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,`${server.baseUrl}examples/image-assets/`,{waitFor:()=>document.querySelector('#status').textContent==='Ready'});
    for(const variant of variants){
      const output=path.join(directory,variant.variant);await mkdir(output,{recursive:true});
      await ensureVariantMetadata({scope:'charts',capability:'image-assets',chart:variant.chart,variant:variant.variant,kind:'primitive',title:variant.title,userFacingCallChain:variant.callChain});
      const canvas=createCanvas(frame.width,frame.height);variant.native(canvas.getContext('2d'),variant.fixture,source);
      const publicProgram=variant.userFacing(variant.fixture),primitiveProgram=variant.primitive(variant.fixture);
      const png=(await renderToPNGBuffer(publicProgram)).buffer,primitivePNG=(await renderToPNGBuffer(primitiveProgram)).buffer,svg=renderToSVG(publicProgram);
      assert.deepEqual((await decode(png)).getContext('2d').getImageData(0,0,frame.width,frame.height).data,(await decode(primitivePNG)).getContext('2d').getImageData(0,0,frame.width,frame.height).data);
      await writeFile(path.join(output,'public.png'),png);await writeFile(path.join(output,'public.svg'),svg);
      const publicPDF=(await renderToPDFBuffer(publicProgram)).buffer;await writeFile(path.join(output,'public.pdf'),publicPDF);
      
      const document=new PDFDocument(),context=document.beginPage(frame.width,frame.height);variant.native(context,variant.fixture,source);document.endPage();const nativePDF=document.close(),pdf=publicPDF;
      await writeFile(path.join(output,'primitive.png'),primitivePNG);await writeFile(path.join(output,'native-oracle.pdf'),nativePDF);await writeFile(path.join(output,'primitive.svg'),svg);await writeFile(path.join(output,'primitive.pdf'),pdf);
      execFileSync('pdftoppm',['-r','72','-singlefile','-png',path.join(output,'primitive.pdf'),path.join(output,'pdf')],{stdio:'pipe'});
      const pdfPNG=await readFile(path.join(output,'pdf.png'));
      const rendered=await opened.page.evaluate(async({id,svg})=>{
        const source=document.getElementById(id),canvas=document.createElement('canvas'),image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);
        return{canvas:source.toDataURL(),svg:canvas.toDataURL(),label:source.getAttribute('aria-label'),width:source.width,height:source.height};
      },{id:variant.variant,svg});
      assert.equal(rendered.width,frame.width);assert.equal(rendered.height,frame.height);assert.ok(rendered.label.includes(variant.variant));
      const browserPNG=bytes(rendered.canvas),svgPNG=bytes(rendered.svg);await writeFile(path.join(output,'browser-canvas.png'),browserPNG);await writeFile(path.join(output,'browser-svg.png'),svgPNG);
      const pixels=canvas.getContext('2d').getImageData(50,60,100,100).data;let ink=0;
      for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-226)+Math.abs(pixels[i+1]-232)+Math.abs(pixels[i+2]-240)>30)ink++;
      assert.ok(ink>2500,`${variant.variant}: image region ink`);
      const entry={variant:variant.variant,publicImageIntegration:'implemented',assetSha256:hash(assetSVG),logicalRectangle:variant.fixture.rect,inkPixels:ink,
        samplePolicy:'literal interiors; RGB tolerance one byte; alpha exact',
        checks:[...checks(canvas,variant.fixture,'Native Canvas / PNG'),...checks(await decode(browserPNG),variant.fixture,'Browser Canvas'),...checks(await decode(svgPNG),variant.fixture,'Browser SVG'),...checks(await decode(pdfPNG),variant.fixture,'PDF')],
        sha256:{png:hash(png),svg:hash(svg),pdf:hash(pdf),canvas:hash(browserPNG),browserSVG:hash(svgPNG)}};
      evidence.push(entry);await writeFile(path.join(output,'evidence.json'),JSON.stringify(entry,null,2)+'\n');
    }
    assertNoBrowserErrors(opened.errors,'Image primitive review');await opened.page.close();
    const sheet=createCanvas(frame.width*3,frame.height*2),context=sheet.getContext('2d');
    for(const[index,variant]of variants.entries())context.drawImage(await loadImage(path.join(directory,variant.variant,'primitive.png')),index%3*frame.width,Math.floor(index/3)*frame.height);
    await writeFile(path.join(directory,'contact-sheet.png'),sheet.toBuffer('image/png'));
    await writeFile(path.join(directory,'results.json'),JSON.stringify({nativePrimitiveOracle:true,exactPublicPrimitivePixels:true,publicImageIntegration:'implemented',variants:evidence},null,2)+'\n');
    assert.deepEqual(evidence.flatMap(entry=>entry.checks.filter(check=>!check.passed).map(check=>({variant:entry.variant,...check}))),[]);
  }catch(error){await saveBrowserEvidence(browser,error);throw error;}finally{await closeBrowserWithEvidence(browser);await server?.close();}
});

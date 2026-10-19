import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{createCanvas,loadImage}from'@napi-rs/canvas';import{chromium}from'playwright';
import{baselineProgram,rows}from'./baseline.mjs';
import{chart}from'../../../src/index.js';
import{renderToSVG}from'../../../src/renderers/svg.js';import{renderToPNGBuffer}from'../../../src/renderers/png.js';import{renderToPDFBuffer}from'../../../src/renderers/pdf.js';import{serializeProgram}from'../../../src/persistence.js';
const output=path.resolve(process.argv[2]??'.artifacts/test/png/review/plot-guide-underlays/repro');await fs.mkdir(output,{recursive:true});
const hash=v=>createHash('sha256').update(v).digest('hex'),base=baselineProgram(),before=serializeProgram(base);
const desired=['horizontalGridLines','plotBorder','xAxisLine','barPlot'];
assert.deepEqual(base.graphicSpec.objects['plot-main'].children,['horizontalGridLines','barPlot','plotBorder','xAxisLine']);
const literal=structuredClone(base.graphicSpec);literal.objects['plot-main'].children=desired;
const parents=new Map();for(const [id,o] of Object.entries(literal.objects))for(const child of o.children??[])parents.set(child,id);
const declared=new Set(),calls=[];
for(const [id,o]of Object.entries(literal.objects)){
 const parent=parents.get(id),siblings=parent===undefined?literal.order:literal.objects[parent].children;
 const next=siblings.slice(siblings.indexOf(id)+1).find(other=>declared.has(other));
 calls.push(['createGraphics',{id,type:o.type,...(o.items!==undefined&&o.type!=='collection'?{length:0}:{}),...(parent===undefined?{}:{parent}),...(next===undefined?{}:{before:next})}]);
 declared.add(id);
 for(const [property,value] of Object.entries(o.properties??{}))calls.push(['editGraphics',{target:id,property,value}]);
 if(o.items!==undefined)calls.push(['editGraphics',{target:id,property:'items',value:o.items.map(item=>({type:item.type??o.type,properties:item.properties}))}]);
 if(o.clip!==undefined)calls.push(['editGraphics',{target:id,property:'clip',value:o.clip}]);
}
const code="import {chart} from '../../../src/index.js';\n\n// Literal two-bar scene with guides below difference-composited marks.\nexport function createPrimitiveProgram(){\n  return chart()\n"+calls.map(([op,args])=>'    .'+op+'('+JSON.stringify(args)+')').join('\n')+';\n}\n';
const file=new URL('target.primitive.mjs',import.meta.url);try{await fs.writeFile(file,code,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(await fs.readFile(file,'utf8'),code);}
const {createPrimitiveProgram}=await import(pathToFileURL(file.pathname).href),primitive=createPrimitiveProgram();
assert.deepEqual(primitive.graphicSpec,literal);assert.equal(JSON.stringify(primitive.graphicSpec),JSON.stringify(literal));
const pixel=async bytes=>{const canvas=createCanvas(240,180),ctx=canvas.getContext('2d');ctx.drawImage(await loadImage(bytes),0,0);let ink=0;const pixels=ctx.getImageData(0,0,240,180).data;
for(let y=20;y<140;y++)for(let x=40;x<220;x++){const i=(y*240+x)*4;if(pixels[i]+pixels[i+1]+pixels[i+2]<740&&pixels[i+3]>0)ink++;}
return{at:[85,139],rgba:[...ctx.getImageData(85,139,1,1).data],plotInk:ink};};
const outputs=[];const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();
for(const [name,p,expected]of [['overlay-control',base,[136,136,136,255]],['underlay-target',primitive,[119,119,136,255]]]){
 const svg=renderToSVG(p),png=await renderToPNGBuffer(p,{pixelRatio:1}),png2=await renderToPNGBuffer(p,{pixelRatio:2}),pdf=await renderToPDFBuffer(p);
 for(const [ext,bytes]of [['svg',svg],['png',png.buffer],['dpr2.png',png2.buffer],['pdf',pdf.buffer]])await fs.writeFile(path.join(output,name+'.'+ext),bytes);
 const pngProbe=await pixel(png.buffer);assert.deepEqual(pngProbe.rgba,expected);assert.ok(pngProbe.plotInk>5000);
 execFileSync('pdftoppm',['-r','72','-singlefile','-png',path.join(output,name+'.pdf'),path.join(output,name+'-pdf')],{stdio:'pipe'});
 const pdfProbe=await pixel(await fs.readFile(path.join(output,name+'-pdf.png')));assert.deepEqual(pdfProbe.rgba,expected);
 const svgProbe=await page.evaluate(async svg=>{const canvas=document.createElement('canvas');canvas.width=240;canvas.height=180;const ctx=canvas.getContext('2d'),image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));image.src=url;await image.decode();ctx.drawImage(image,0,0);URL.revokeObjectURL(url);return[...ctx.getImageData(85,139,1,1).data];},svg);assert.deepEqual(svgProbe,expected);
 outputs.push({name,width:png.width,height:png.height,svgSha256:hash(svg),pngSha256:hash(png.buffer),pngDpr2Sha256:hash(png2.buffer),pdfSha256:hash(pdf.buffer),nodeProbe:pngProbe,pdfProbe,chromiumSvgProbe:svgProbe});
}
}finally{await browser.close();}
const rejectChecks=[];for(const[name,fn]of[
 ['whole-axis-create',()=>base.removeXAxis().createXAxis({underlay:true})],['whole-axis-edit',()=>base.editXAxis({underlay:true})],
 ['border-create',()=>chart().createCanvas({width:240,height:180,plotBorder:{underlay:true}})],
 ['border-edit',()=>base.editCanvas({plotBorder:{underlay:true}})],
 ['container-child-order',()=>base.editGraphics({target:'plot-main',property:'children',value:desired})]
]){let error;try{fn();}catch(e){error=e.message;}assert.ok(error,name+' must reject before implementation');assert.match(error,/Unknown|unsupported/i);rejectChecks.push({name,error});}
assert.equal(serializeProgram(base),before);
const evidence={status:'independent-old-primitive-target-pass-before-public-api-implementation',baselineCommit:'8e1c809c78d0b50336e53db11439e3f194d83725',canvas:{width:240,height:180},sourceRows:rows,sourceRowsSha256:hash(JSON.stringify(rows)),onlyPlotChildOrderChanged:true,defaultOrder:base.graphicSpec.objects['plot-main'].children,targetOrder:desired,primitiveCalls:calls.length,primitiveSha256:hash(code),outputs,baselineRejectChecks:rejectChecks,previousProgramUnchanged:true,schoolCalls:0,chartPixelsInspected:false};
await fs.writeFile(new URL('TARGET_EVIDENCE.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:evidence.status,calls:calls.length,outputs,baselineRejectChecks:rejectChecks},null,2));

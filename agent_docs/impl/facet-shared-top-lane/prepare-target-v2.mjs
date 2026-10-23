// Review-only literal graphics target; proposed public API is not implemented.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {baselineParent,sourceUnit,sourceRelativeText,days,rows} from './baseline.mjs';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const parent=baselineParent(),scene=structuredClone(parent.graphicSpec),delta=39.609375;
assert.equal(scene.objects.canvas.properties.width,508);assert.equal(scene.objects.canvas.properties.height,302);
// Independently specified target: unchanged136x262 children at global plot y43,
// title DOM3..18, header DOM20..32, upper endpoint DOM36.5..48.5.
scene.objects.canvas.properties.height=262;
const childRoots=scene.objects.canvas.children.filter(id=>scene.objects[id].type==='canvas');
assert.equal(childRoots.length,8);
for(const id of childRoots){assert.equal(scene.objects[id].properties.y,delta);scene.objects[id].properties.y=0;}
const headers=scene.objects['facet-headers'];assert.equal(headers.items.length,7);
for(let i=0;i<7;i++){assert.equal(headers.items[i].properties.x,60+62*i);assert.equal(headers.items[i].properties.y,67);headers.items[i].properties.y=27.390625;}
const directory=process.argv[2]??'.artifacts/test/png/review/facet-shared-top-lane/compact-v2';await fs.mkdir(directory,{recursive:true});
const lines=["import {chart} from '../../../src/index.js';",'',
  '// Literal review primitive: plots40x200 at(40+62*i,43), Canvas508x262.',
  '// Native unit paint/axes/legend recipe is frozen; only parent slot reservations differ.',
  'export function createPrimitiveProgram() {','  return chart()'];
const push=(name,args)=>lines.push('    .'+name+'('+JSON.stringify(args)+')');
const parentById=new Map(Object.entries(scene.objects).flatMap(([id,o])=>(o.children??[]).map(child=>[child,id]))),emitted=new Set();
function emit(id){
  const o=scene.objects[id],parentId=parentById.get(id);assert(parentId===undefined||emitted.has(parentId));
  const siblings=parentId===undefined?scene.order:scene.objects[parentId].children,index=siblings.indexOf(id);
  const before=siblings.find((s,i)=>i>index&&emitted.has(s));
  push('createGraphics',{id,type:o.type,...(parentId===undefined?{}:{parent:parentId}),...(before===undefined?{}:{before}),...(o.items&&o.type!=='collection'?{length:o.items.length}:{})});
  for(const[property,value]of Object.entries(o.properties??{}))push('editGraphics',{target:id,property,value});
  if(o.items?.length){
    if(o.type==='collection')push('editGraphics',{target:id,property:'items',value:o.items.map(({type,properties})=>({type,properties}))});
    else{const keys=Object.keys(o.items[0].properties);for(const item of o.items)assert.deepEqual(Object.keys(item.properties),keys);
      for(const property of keys)push('editGraphics',{target:id,property,value:o.items.map(item=>item.properties[property])});}
  }
  emitted.add(id);
}
for(const id of Object.keys(scene.objects))emit(id);lines[lines.length-1]+=';';lines.push('}','');
const file='agent_docs/impl/facet-shared-top-lane/target-v2.primitive.mjs';try { await fs.writeFile(file,lines.join('\n'),{flag:'wx'}); } catch(error) { if(error.code!=='EEXIST')throw error;assert.equal(await fs.readFile(file,'utf8'),lines.join('\n'),'Committed literal target must reproduce exactly'); }
const {createPrimitiveProgram}=await import(pathToFileURL(process.cwd()+'/'+file)),primitive=createPrimitiveProgram();assert.deepEqual(primitive.graphicSpec,scene);assert.equal(JSON.stringify(primitive.graphicSpec),JSON.stringify(scene));
const svg=renderToSVG(primitive),dom=await sourceRelativeText(svg);
for(const[label,top,bottom]of[['Grouped Bar Chart',3,18],['Sun',20,32],['50',36.5,48.5]]){const matches=dom.filter(t=>t.text===label);assert.equal(matches.length,1);assert.equal(matches[0].bounds.top,top);assert.equal(matches[0].bounds.bottom,bottom);}
const previous=JSON.parse(await fs.readFile('agent_docs/impl/facet-shared-top-lane/TARGET_EVIDENCE.json')),before=previous.before;
const outputs=[];
for(const[name,p]of[['stacked-control',parent],['shared-top-primitive-target',primitive]]){
 const s=renderToSVG(p),png=await renderToPNGBuffer(p),png2=await renderToPNGBuffer(p,{pixelRatio:2}),pdf=await renderToPDFBuffer(p);
 const c=createCanvas(png.width,png.height),cx=c.getContext('2d');cx.drawImage(await loadImage(png.buffer),0,0);const rgba=cx.getImageData(0,0,png.width,png.height).data;
 let plotInk=0;const y0=name==='stacked-control'?82.609375:43;for(let y=Math.ceil(y0);y<y0+200;y++)for(let x=40;x<452;x++){const i=(y*png.width+x)*4;if(rgba[i]<240||rgba[i+1]<240||rgba[i+2]<240)plotInk++;}
 assert(plotInk>5000);assert.equal(png.width,508);assert.equal(png2.width,1016);assert.equal(pdf.pages,1);assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');
 for(const[extension,data]of[['svg',s],['png',png.buffer],['dpr2.png',png2.buffer],['pdf',pdf.buffer],['graphic.json',JSON.stringify(p.graphicSpec,null,2)+'\n']])await fs.writeFile(directory+'/'+name+'.'+extension,data,{flag:'wx'});
 outputs.push({name,width:png.width,height:png.height,svgSha256:sha(s),pngSha256:sha(png.buffer),pngDpr2Sha256:sha(png2.buffer),pdfSha256:sha(pdf.buffer),plotInk});
}
assert.equal(outputs[1].height,262);assert.equal(outputs[1].pngSha256,previous.outputs[1].pngSha256,'Approved PNG must remain byte-exact');assert.equal(outputs[1].pngDpr2Sha256,previous.outputs[1].pngDpr2Sha256,'Approved DPR2 PNG must remain byte-exact');
const variant={capability:'facet-shared-top-lane',chart:'compact-weekday-bars',variant:'shared-top',title:'Shared facet top margin',canvas:{width:508,height:262},publicCallChain:'sourceUnit().facet({field:"panel",values:days}).editFacetGuides({axes:"outer",legend:"shared"}).editCompositionLayout({spacing:"plot",gap:22,topLane:"shared"}).editFacetHeaders({fontSize:10,fontWeight:400,offset:10.609375}).createTitle({text:"Grouped Bar Chart",align:"left",offset:-2.953125,titleStyle:{fontSize:13,fontWeight:700,color:"black"}})',publicTargetFlowAwaitingFullValidation:true};
await fs.writeFile(directory+'/variant.json',JSON.stringify(variant,null,2)+'\n',{flag:'wx'});
const evidence={status:'same-visual-target-with-baseline-object-declaration-order-and-default-svg-id-alignment',runtimeBaselineCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),canvas:{width:508,height:262},baselineCanvas:{width:508,height:302},unitCanvas:{width:136,height:262,margin:{left:40,right:56,top:43,bottom:19}},plotOrigins:days.map((_,i)=>({x:40+62*i,y:43,width:40,height:200})),sourceRows:rows,sourceRowsUnchanged:true,targetDelta:delta,sourceAxisEndpointLabelPreserved:true,domRequired:dom.filter(t=>['Grouped Bar Chart','Sun','50'].includes(t.text)),fullPrimitiveGraphicSpecExactToIndependentLiteralPlacement:true,primitiveCodeSha256:sha(await fs.readFile(file)),baselineProbe:'agent_docs/impl/facet-shared-top-lane/baseline.mjs',primitive:file,outputs,before,baselineRejectChecksReusedFromTargetV1:true,targetCorrection:{originalReviewCommit:'f131d7bb3bfcdb2a0856859e2e65818565dfeebd',originalPrimitive:'target.primitive.mjs',sourceOfDeclarationOrder:'Existing stacked baseline object order, not proposed public implementation',allVisualGeometryPaintTextAndDrawOrderUnchanged:true,originalPngAndDpr2PngByteExact:true,rendererUnchanged:true,acceptanceToleranceUnchanged:true},schoolCalls:0,chartPixelsInspected:false,baselineProbeHistory:'Initial uncalibrated inferred-legend probe658x304 preserved; explicit unit legend produces intended508width. Original baseline-v2 invocation failed on an incorrect private serialization helper before DOM capture; corrected baseline-v3 uses public serializeProgram. No runtime API implemented or acceptance claimed through those probes.'};
await fs.writeFile(process.argv[3]??'agent_docs/impl/facet-shared-top-lane/TARGET_V2_EVIDENCE.json',JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(evidence,null,2));

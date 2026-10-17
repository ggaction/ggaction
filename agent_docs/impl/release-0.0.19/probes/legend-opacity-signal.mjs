import assert from 'node:assert/strict';
import {createHash}from'node:crypto';
import {readFile,writeFile}from'node:fs/promises';
import {createCanvas}from'@napi-rs/canvas';
import {chart,render}from'../../../../src/index.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
const base=chart().createCanvas({width:700,height:500,margin:180})
 .createData({values:[{x:1,y:1,v:1,g:'A'},{x:2,y:2,v:2,g:'B'}]})
 .createPointMark({id:'p'}).encodeX({field:'x'}).encodeY({field:'y'})
 .encodeSize({field:'v',scale:{domain:[1,2],range:[5000,6000]}});
const seed=base.createLegend({channels:['size'],values:[1]});
const fallback=seed.editLegendBlock({target:'p',channel:'size',symbol:{fill:'red',stroke:'blue',strokeWidth:10}});
const supplied=seed.editLegendBlock({target:'p',channel:'size',symbol:{fill:'red',stroke:'blue',strokeWidth:10,opacity:.7}});
assert.deepEqual(fallback.graphicSpec,supplied.graphicSpec);
assert.notDeepEqual(fallback.materializationConfigs,supplied.materializationConfigs);
const glyph=fallback.graphicSpec.objects.sizeLegendSymbols.items[0];
assert.equal(glyph.properties.opacity,.7);
const scene={graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:700,height:500,background:'white'},children:['glyph']},glyph:{type:'circle',properties:glyph.properties}},order:['canvas']}};
const actual=createCanvas(700,500),actualContext=actual.getContext('2d');render(scene,actualContext);
const source=createCanvas(700,500),s=source.getContext('2d'),p=glyph.properties;
s.fillStyle='red';s.strokeStyle='blue';s.lineWidth=10;s.beginPath();s.arc(p.x,p.y,p.radius,0,Math.PI*2);s.fill();s.stroke();
const expected=createCanvas(700,500),e=expected.getContext('2d');e.fillStyle='white';e.fillRect(0,0,700,500);e.globalAlpha=.7;e.drawImage(source,0,0);
const sample={x:Math.floor(p.x+p.radius-2),y:Math.floor(p.y)};
const pixel=ctx=>[...ctx.getImageData(sample.x,sample.y,1,1).data];
assert.notDeepEqual(pixel(actualContext),pixel(e));
const intrinsicSourceRGBA=pixel(s);
const direct=createCanvas(700,500),d=direct.getContext('2d');d.fillStyle='white';d.fillRect(0,0,700,500);d.globalAlpha=.7;d.fillStyle='blue';d.fillRect(0,0,700,500);
const directSinglePaintRGBA=pixel(d);
assert.deepEqual(intrinsicSourceRGBA,[0,0,255,255]);
assert.deepEqual(directSinglePaintRGBA,[77,77,255,255]);
const nativeImageAlphaChannelDelta=pixel(e).map((v,i)=>v-directSinglePaintRGBA[i]);
assert.deepEqual(nativeImageAlphaChannelDelta,[-2,-2,0,0]);
let currentRecipeError;
const proposedPublicCall='program.createLegend({channels:["shape"],symbol:{layers:[{type:"point",fill:"red",stroke:"blue",strokeWidth:10,opacity:0.7}]}})';
try{base.encodeShape({field:'g'}).createLegend({channels:['shape'],symbol:{layers:[{type:'point',fill:'red',stroke:'blue',strokeWidth:10,opacity:.7}]}});}catch(error){currentRecipeError=error.message;}
assert.match(currentRecipeError,/opacity/);
const normalAlphaCandidates=[];
for(const opacity of [0,.2,.5,.7,1]){
 const opaque=createCanvas(20,20),o=opaque.getContext('2d');o.fillStyle='blue';o.fillRect(0,0,20,20);
 const attenuated=createCanvas(20,20),a=attenuated.getContext('2d');a.drawImage(opaque,0,0);a.globalCompositeOperation='destination-in';a.globalAlpha=opacity;a.fillStyle='white';a.fillRect(0,0,20,20);
 const directSource=createCanvas(20,20),q=directSource.getContext('2d');q.globalAlpha=opacity;q.fillStyle='blue';q.fillRect(0,0,20,20);
 const composite=(surface,alpha=1)=>{const canvas=createCanvas(20,20),c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,20,20);c.globalAlpha=alpha;c.drawImage(surface,0,0);return [...c.getImageData(10,10,1,1).data];};
 const sourcePixel=[...a.getImageData(10,10,1,1).data],directSourcePixel=[...q.getImageData(10,10,1,1).data];
 assert.deepEqual(sourcePixel,directSourcePixel);
 assert.deepEqual(composite(attenuated),composite(directSource));
 normalAlphaCandidates.push({opacity,opaqueSourceRGBA:[...o.getImageData(10,10,1,1).data],drawImageAlphaRGBA:composite(opaque,opacity),directSourceRGBA:directSourcePixel,destinationInSourceRGBA:sourcePixel,destinationInOverWhiteRGBA:composite(attenuated),directSourceOverWhiteRGBA:composite(directSource),premultipliedDestinationIn:sourcePixel.map((v,i)=>i===3?v:v*sourcePixel[3]/255),straightRGBAReadback:true});
}
const files=['src/renderers/canvas/circle.js','src/renderers/canvas/stroke.js','src/renderers/canvas/index.js','agent_docs/impl/release-0.0.19/probes/legend-opacity-signal.mjs'];
const bindings=Object.fromEntries(await Promise.all(files.map(async path=>[path,sha(await readFile(new URL('../../../../'+path,import.meta.url)))])));
const output={status:'pass',kind:'legend-explicit-opacity-concrete-signal-gate-v1',newVisualTarget:false,
 purpose:'An explicit concrete signal preserves the already approved whole-glyph opacity appearance; it does not infer semantics from identical opacity numbers.',
 proposedPublicCall,currentRecipeError,
 actualExistingPublicCalls:{fallback:'seed.editLegendBlock({target:"p",channel:"size",symbol:{fill:"red",stroke:"blue",strokeWidth:10}})',supplied:'seed.editLegendBlock({target:"p",channel:"size",symbol:{fill:"red",stroke:"blue",strokeWidth:10,opacity:0.7}})'},
 historicalAndSuppliedConcreteExactlyEqual:true,
 fallbackOverride:fallback.guideConfigs.legend.size.blockOverrides,
 suppliedOverride:supplied.guideConfigs.legend.size.blockOverrides,
 identicalConcreteGlyph:glyph,sample,legacySeparatePaintRGBA:pixel(actualContext),independentSourceOnceRGBA:pixel(e),
 intrinsicSourceRGBA,directSinglePaintRGBA,nativeImageAlphaChannelDelta,normalAlphaCandidates,
 nativeImageAlphaLimitation:'This native drawImage/globalAlpha probe differs by two RGB steps from direct one-paint alpha at opacity 0.7. It is not an approved quantization allowance or renderer correctness proof; the normal implementation must resolve and independently test its alpha behavior.',
 fullLegacyPixelSha256:sha(actualContext.getImageData(0,0,700,500).data),fullSourceOncePixelSha256:sha(e.getImageData(0,0,700,500).data),
 proofLimit:'The existing block override is a numeric information-loss witness. New recipe-layer opacity remains rejected until the approved #208 implementation and concrete-signal decision. No marker implementation is present.',
 approvedOmissionUnchanged:true,bindings};
const destination=new URL('../evidence/legend-opacity-signal.json',import.meta.url);
await writeFile(destination,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:output.status,sample,legacy:pixel(actualContext),sourceOnce:pixel(e),currentRecipeError}));

import assert from'node:assert/strict';import fs from'node:fs/promises';import{createHash}from'node:crypto';import{chart}from'../../../src/index.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
// Synthetic public API only; no imported reference chart or drawing primitives.
const base=chart().createCanvas({width:440,height:280,margin:{left:60,top:20,right:60,bottom:60}})
 .createData({values:[{x:0,left:1,right:100},{x:1,left:3,right:160},{x:2,left:2,right:200}]})
 .createLinePlot({x:{field:'x',scale:{domain:[0,2]}},y:{field:'left',scale:{domain:[0,4]}},guides:false})
 .editLineMark({stroke:'teal',strokeWidth:2})
 .createLineMark({id:'secondary',stroke:'purple',strokeWidth:2})
 .encodeX({target:'secondary',field:'x',fieldType:'quantitative'})
 .encodeY({target:'secondary',field:'right',scale:{id:'secondaryY',domain:[0,200]}});
const left=base.createYAxis({ticksAndLabels:{values:[0,1,2,3,4],labels:{fontSize:10,offset:7}},title:{text:'Left quantity',fontSize:11,offset:35}});
const old=JSON.stringify({semantic:left.semanticSpec,graphic:left.graphicSpec});
const rightArgs={scale:'secondaryY',position:'right',ticksAndLabels:{values:[0,50,100,150,200],labels:{fontSize:10,offset:7}},title:{text:'Right quantity',fontSize:11,offset:35}};
let rejection;assert.throws(()=>left.createYAxis(rightArgs),e=>{rejection={name:e.name,message:e.message};return /requires a missing y-axis line/.test(e.message);});
const right=left.removeYAxis().createYAxis(rightArgs);
assert.equal(JSON.stringify({semantic:left.semanticSpec,graphic:left.graphicSpec}),old);
assert.equal(left.semanticSpec.guides.axis.y.scale,'y');assert.equal(right.semanticSpec.guides.axis.y.scale,'secondaryY');
assert.equal(left.graphicSpec.objects.yAxisLine.properties.x1,60);assert.equal(right.graphicSpec.objects.yAxisLine.properties.x1,380);
const lines=Object.entries(right.graphicSpec.objects).filter(([id])=>/yAxisLine/.test(id));assert.equal(lines.length,1);
const evidence={reviewer:'codex',gate:'ready-for-review',runtimeCommit:'7971cc4cd9a1e5f26aa690e2d2083a60df8bb0a2',syntheticRows:3,publicIndependentPositionScalesWork:true,simultaneousAxisGuideResources:false,currentBehavior:'Second complete Y-axis throws because the canonical y-axis line already exists. Removing that axis before creating the right one leaves only the right guide; simultaneous independent guide resources cannot be expressed.',rejection,before:{binding:left.semanticSpec.guides.axis.y,line:left.graphicSpec.objects.yAxisLine,title:left.graphicSpec.objects.yAxisTitle},after:{binding:right.semanticSpec.guides.axis.y,line:right.graphicSpec.objects.yAxisLine,title:right.graphicSpec.objects.yAxisTitle,yAxisLineCount:lines.length},priorImmutableProgramUnchanged:true,additionalIndependentMarkPreserved:right.semanticSpec.layers.some(l=>l.id==='secondary'&&l.encoding.y.scale==='secondaryY'),owningFiles:['src/actions/guides/axes/lines.js','src/actions/guides/axes/ticks.js','src/actions/guides/axes/labels.js','src/actions/guides/axes/titles.js','src/actions/guides/axes/axis.js'],reproSha256:sha(await fs.readFile(new URL('./reproduce.mjs',import.meta.url))),modelCalls:0,chartPixelsInspected:false};
await fs.writeFile(new URL('./replacement-evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({currentBehavior:evidence.currentBehavior,leftX:60,rightX:380,remainingYGuideLines:lines.length,priorImmutableProgramUnchanged:true}));

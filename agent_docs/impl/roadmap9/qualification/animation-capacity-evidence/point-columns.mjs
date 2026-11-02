import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const base=process.env.AUDIT_SOURCE_ROOT??process.cwd();await mkdir('.artifacts/animation-capacity-audit',{recursive:true});
const {chart}=await import(pathToFileURL(base+'/src/index.js'));
const {encodeAnimationEnvelope,decodeAnimationEnvelope}=await import(pathToFileURL(base+'/src/animation/envelopeCodec.js'));
const {mapContinuousScaleValues}=await import(pathToFileURL(base+'/src/grammar/scales/mapping.js'));
const n=100000,side=Math.ceil(Math.sqrt(n)),rows=Array.from({length:n},(_,id)=>({id,x:(id%side+1)/(side+1),y:(Math.floor(id/side)+1)/(side+1)}));
const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',keyField:'id',values:rows}).createPointMark({id:'points',maxItems:100000}).encodeX({field:'x',scale:{id:'x',domain:[0,1],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}});
const to=from.editScale({id:'x',domain:[0,2],nice:false});
const vectors=[],vectorKeys=new Map();
function vector(values){const key=JSON.stringify(values);let index=vectorKeys.get(key);if(index===undefined){index=vectors.length;vectors.push(values);vectorKeys.set(key,index)}return index;}
function lower(program){const owner=program.graphicSpec.objects.points,first=owner.items[0],properties=Object.keys(first.properties),constantProperties={},columns={};for(const key of properties){if(owner.items.every(item=>JSON.stringify(item.properties[key])===JSON.stringify(first.properties[key])))constantProperties[key]=first.properties[key];else columns[key]=vector(owner.items.map(item=>item.properties[key]));}
 const identity=first.identity,common={...identity,lineage:{...identity.lineage}};delete common.key;delete common.lineage.rowKeys;
 const metadata={...owner};delete metadata.items;
 const graphic={...program.graphicSpec,objects:{...program.graphicSpec.objects}};delete graphic.objects.points;
 const positionValues={x:vector(rows.map(row=>row.x)),y:vector(rows.map(row=>row.y))};
 const scales=Object.fromEntries(['x','y'].map(channel=>{const resolved=program.resolvedScales[channel];return[channel,Object.fromEntries(['type','domain','range','clamp'].filter(key=>Object.hasOwn(resolved,key)).map(key=>[key,resolved[key]]))]}));
 for(const channel of ['x','y']){const mapped=mapContinuousScaleValues(vectors[positionValues[channel]],scales[channel]);mapped.forEach((value,i)=>assert.equal(value,owner.items[i].properties[channel]));}
 return {kind:'point-columns-candidate@1',graphic,owner:'points',metadata,count:owner.items.length,itemFields:Object.keys(first),propertyFields:properties,constantProperties,columns,commonIdentity:common,ids:vector(owner.items.map(item=>item.id)),keys:vector(owner.items.map(item=>item.identity.key)),rowKeys:vector(owner.items.map(item=>{assert.equal(item.identity.lineage.rowKeys.length,1);return item.identity.lineage.rowKeys[0]})),positionValues,scales};}
function restore(endpoint,tables){const items=Array.from({length:endpoint.count},(_,i)=>Object.fromEntries(endpoint.itemFields.map(field=>[field,field==='id'?tables[endpoint.ids][i]:field==='properties'?Object.fromEntries(endpoint.propertyFields.map(key=>[key,Object.hasOwn(endpoint.columns,key)?tables[endpoint.columns[key]][i]:endpoint.constantProperties[key]])):{...endpoint.commonIdentity,key:tables[endpoint.keys][i],lineage:{...endpoint.commonIdentity.lineage,rowKeys:[tables[endpoint.rowKeys][i]]}}])));return{...endpoint.graphic,objects:{...endpoint.graphic.objects,[endpoint.owner]:{...endpoint.metadata,items}}};}
const payload={plan:{kind:'transition-plan',version:4,capacity:{maxEndpointNodes:200002,maxOutputNodes:100001},durationMs:100,easing:'linear',from:lower(from),to:lower(to),vectors},playback:{rate:1,repeat:0,reducedMotion:false}};
assert.deepEqual(restore(payload.plan.from,vectors),from.graphicSpec);assert.deepEqual(restore(payload.plan.to,vectors),to.graphicSpec);
console.log('candidate lowered',vectors.length,vectors.map(v=>v.length),process.memoryUsage());
const text=encodeAnimationEnvelope(payload),decoded=decodeAnimationEnvelope(text);
assert.deepEqual(restore(decoded.plan.from,decoded.plan.vectors),from.graphicSpec);assert.deepEqual(restore(decoded.plan.to,decoded.plan.vectors),to.graphicSpec);
let decodedValues=0,encodedValues=0;const stack=[payload];while(stack.length){const value=stack.pop();decodedValues++;if(value&&typeof value==='object'){const entries=Object.entries(value);encodedValues+=3+(Array.isArray(value)?0:entries.length*2);for(const[,child]of entries)stack.push(child);}else encodedValues+=value===undefined?2:1;}
const result={scope:'Candidate lossless columnar transport feasibility only. Existing encode/decodeAnimationEnvelope64MiB/1M-value guards unchanged. Candidate version4 is not supported by product restoreTransitionPlan; no product source modified.',n,inputSHA256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),vectorCount:vectors.length,vectorLengths:vectors.map(v=>v.length),rawPayloadBytes:Buffer.byteLength(JSON.stringify(payload)),envelopeBytes:Buffer.byteLength(text),decodedValues,encodedValues,allSourceAndTargetGraphicsVerified:n*2,allRawForwardMappingsVerified:n*4,memory:process.memoryUsage()};
await writeFile('.artifacts/animation-capacity-audit/point-columns-100000.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

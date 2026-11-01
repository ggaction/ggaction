import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const sourceRoot=process.env.AUDIT_SOURCE_ROOT??process.cwd();
const proofRoot=process.env.AUDIT_POSITION_PROOF_ROOT??sourceRoot;
const folder=path.resolve('.artifacts/animation-capacity-audit');await mkdir(folder,{recursive:true});
const kind=process.argv[2]??'points', n=Number(process.argv[3]??100000);
const hash=x=>createHash('sha256').update(x).digest('hex');
const source=await readFile(path.join(sourceRoot,'src/core/validation.js'),'utf8');
const rootProof=await readFile(path.join(proofRoot,'src/grammar/animation/positions.js'),'utf8');
assert.match(rootProof,/const preparedPositions = new WeakSet/);
const needle='  if (value > maximum) {';assert.equal(source.split(needle).length,2);
const observed=source.replace(needle,`  if(typeof label==='string'&&(label.startsWith('Animation ')||label.startsWith('Partition animation ')||label==='Native partition animation nodes')){
 const r=globalThis.__audit.guards[label]??={calls:0,maximum:0,originalLimit:maximum};r.calls++;r.maximum=Math.max(r.maximum,value);
 const ceiling=maximum===10000000?200000000:200002;
 if(!Number.isSafeInteger(value)||value<0||value>ceiling)throw Error('Diagnostic ceiling '+label+': '+value);return value;
 }
${needle}`);
let proof=rootProof.replace('export function normalizePositionEndpoint(input) {','export function normalizePositionEndpoint(input) { globalThis.__audit.normalizePosition++;');
proof=proof.replace('export function preparePositionInterpolation(fromInput, toInput) {','export function preparePositionInterpolation(fromInput, toInput) { globalThis.__audit.preparePosition++;');
proof=proof.replace('  const prepared = preparedPositions.has(plan) ? plan : preparePositionInterpolation(plan.from, plan.to);','  globalThis.__audit.samplePosition++; if(preparedPositions.has(plan))globalThis.__audit.proofHit++;\n  const prepared = preparedPositions.has(plan) ? plan : preparePositionInterpolation(plan.from, plan.to);');
await build({stdin:{contents:"export {chart} from './src/index.js';export {planTransition,sampleTransition,serializeAnimation,exportAnimationFrames} from './src/animation.js';export {exportTransitionPlan,restoreTransitionPlan} from './src/animation/planner.js';export {transitionEndpointPositions} from './src/animation/planner.js';",resolveDir:sourceRoot,sourcefile:'animation-capacity-audit.mjs'},bundle:true,format:'esm',platform:'node',outfile:folder+'/instrumented-no-rebase.mjs',plugins:[{name:'read-only-bounded-animation-diagnostic',setup(b){b.onLoad({filter:/\/core\/validation\.js$/},()=>({contents:observed,loader:'js'}));b.onLoad({filter:/\/grammar\/animation\/positions\.js$/},()=>({contents:proof,loader:'js'}));}}]});
const measured=await import(pathToFileURL(folder+'/instrumented-no-rebase.mjs'));
const product=await import(pathToFileURL(path.join(sourceRoot,'src/index.js')));
const productionAnimation=await import(pathToFileURL(path.join(sourceRoot,'src/animation.js')));
const reset=()=>globalThis.__audit={guards:{},normalizePosition:0,preparePosition:0,samplePosition:0,proofHit:0};reset();
const stage=name=>{console.log(JSON.stringify({stage:name,kind,n,memory:process.memoryUsage()}));writeFileSync(folder+`/${kind}-${n}-partial.json`,JSON.stringify(result,null,2)+'\n');};
function input(){if(kind==='partition')return[{key:'root',parent:null,value:0},...Array.from({length:n-1},(_,key)=>({key,parent:'root',value:1}))];const side=Math.ceil(Math.sqrt(n));return Array.from({length:n},(_,id)=>({id,x:(id%side+1)/(side+1),y:(Math.floor(id/side)+1)/(side+1)}));}
function endpoints(api,rows){let from=api.chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',keyField:kind==='partition'?'key':'id',values:rows});if(kind==='partition'){from=from.createHierarchyData({id:'hierarchy',key:'key',parent:'parent',value:'value'}).layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition',labels:false,cells:{strokeWidth:0}});return{from,to:from.editCanvas({width:600})};}from=from.createPointMark({id:'points',maxItems:100000}).encodeX({field:'x',scale:{id:'x',domain:[0,1],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}});return {from,to:from.editScale({id:'x',domain:[0,2],nice:false})};}
const rows=input(),result={scope:'Read-only diagnostic. Only Animation/Partition animation labels temporarily admit 200002 nodes / 200M work. Product global bounds, codec64MiB/1M values, fixture cardinality and SLO are unchanged. Not P95 qualification.',kind,n,node:process.version,inputSHA256:hash(JSON.stringify(rows)),validationSourceSHA256:hash(source),rootPositionProofSourceSHA256:hash(rootProof),phases:{}};
stage('native-products');
{const native=endpoints(product,rows);try{productionAnimation.planTransition({...native,options:{durationMs:100,easing:'linear'}});result.product={status:'admitted'};}catch(e){result.product={status:'rejected',name:e.name,message:e.message};}}
if(globalThis.gc)globalThis.gc();
stage('diagnostic-endpoints');const pair=endpoints(measured,rows);reset();
let start=performance.now(),plan=measured.planTransition({...pair,options:{durationMs:100,easing:'linear'}});result.phases.prepare={ms:performance.now()-start,audit:structuredClone(globalThis.__audit),memory:process.memoryUsage()};stage('prepared');
reset();start=performance.now();let frame=measured.sampleTransition(plan,50);result.phases.sample={ms:performance.now()-start,audit:structuredClone(globalThis.__audit),memory:process.memoryUsage()};
const nodes=frame.scene.nodes.filter(node=>kind==='points'?node.type==='circle':node.properties.fill==='#3b82f6');assert.equal(nodes.length,n);assert.equal(frame.decisions.filter(d=>d.kernel===(kind==='points'?'cartesian-point':'partition')).length,n);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);
for(let i=0;i<n;i++){if(kind==='points'){close(nodes[i].properties.x,20+360*rows[i].x/1.5);close(nodes[i].properties.y,380-360*rows[i].y);}else{const x=i===0?20:20+460*(i-1)/(n-1),y=i===0?20:200,w=i===0?460:460/(n-1);const expected=[[x,y],[x+w,y],[x+w,y+180],[x,y+180]];assert.equal(nodes[i].properties.commands.length,5);expected.forEach(([ex,ey],j)=>{close(nodes[i].properties.commands[j].x,ex);close(nodes[i].properties.commands[j].y,ey)});}}
assert.equal(measured.sampleTransition(plan,0).graphicSpec,pair.from.graphicSpec);assert.equal(measured.sampleTransition(plan,100).graphicSpec,pair.to.graphicSpec);result.verified={rawRows:rows.length,allNativeItems:n,endpoints:[plan.from.scene.nodes.length,plan.to.scene.nodes.length],sampledNodes:frame.scene.nodes.length};stage('all-coordinates-verified');
const transport=measured.exportTransitionPlan(plan);
function size(value){const pending=[value];let decoded=0,encoded=0;while(pending.length){const v=pending.pop();decoded++;if(v&&typeof v==='object'){const arr=Array.isArray(v),entries=Object.entries(v);encoded+=3+(arr?0:2*entries.length);for(const [,child]of entries)pending.push(child);}else encoded+=v===undefined?2:(typeof v==='number'&&(!Number.isFinite(v)||Object.is(v,-0))||typeof v==='bigint')?3:1;}return{jsonBytes:Buffer.byteLength(JSON.stringify(value)),decodedValues:decoded,encodedValues:encoded};}
result.transport={total:size(transport),fromGraphics:size(transport.from.graphicSpec??transport.from.scene),toGraphics:size(transport.to.graphicSpec??transport.to.scene),fromPositions:size(transport.from.positions),toPositions:size(transport.to.positions)};
const uniqueScales=new Set(),scaleSignatures=new Set();let scaleOccurrences=0;for(const side of ['from','to'])for(const p of transport[side].positions)for(const channel of ['x','y'])if(p[channel]?.scale){scaleOccurrences++;uniqueScales.add(p[channel].scale);scaleSignatures.add(JSON.stringify(p[channel].scale));}result.scaleStorage={scaleOccurrences,uniqueObjects:uniqueScales.size,uniqueDefinitions:scaleSignatures.size};
try{const text=measured.serializeAnimation(plan);result.codec={status:'admitted',bytes:Buffer.byteLength(text)};}catch(e){result.codec={status:'rejected',name:e.name,message:e.message};}
stage('transport-measured');
result.rebase={status:'not-completed',reason:'Separate original diagnostic is still CPU-bound after 20 minutes; no rebase success claimed.'};
/* reset();start=performance.now();try{const rebased=measured.planTransition({from:frame,to:pair.to,options:{durationMs:100,easing:'linear'}});const next=measured.sampleTransition(rebased,50);assert.equal(next.scene.nodes.length,n+1);result.rebase={status:'admitted',ms:performance.now()-start,audit:structuredClone(globalThis.__audit),transport:size(measured.exportTransitionPlan(rebased))};}catch(e){result.rebase={status:'rejected',name:e.name,message:e.message};}
*/
result.peakFinalMemory=process.memoryUsage();
await writeFile(folder+`/${kind}-${n}-without-rebase.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

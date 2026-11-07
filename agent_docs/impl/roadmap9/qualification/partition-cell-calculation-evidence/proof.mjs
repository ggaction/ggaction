import './loader.mjs';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
let identity=0;globalThis.crypto.randomUUID=()=> '00000000-0000-4000-8000-'+String(++identity).padStart(12,'0');
const root=new URL('../../../../../',import.meta.url),module=p=>import(new URL(p,root));
const {partitionBendCellGeometry}=await module('src/grammar/hierarchy/partitionCell.js');
const {bendPartitionPoint,insetPartitionBendCell}=await module('src/grammar/hierarchy/partitionBend.js');
const {mapPartitionBendPoint,partitionBendSegments}=await module('src/grammar/hierarchy/partitionAdapter.js');
const {partitionRadius}=await module('src/grammar/hierarchy/partitionMapping.js');
const {cloneAndFreeze,freezeOwned}=await module('src/core/immutable.js');
const {chart}=await module('src/index.js');
const {planTransition,sampleTransition,serializeAnimation,deserializeAnimation}=await module('src/animation.js');
const {resolvePartitionAnimationGeometry}=await module('src/materialization/animation/partitionGeometry.js');
const {renderToSVG}=await module('src/svg.js').catch(()=>module('src/renderers/svg.js'));
const hash=x=>createHash('sha256').update(JSON.stringify(x,(_k,v)=>Object.is(v,-0)?{$negativeZero:true}:v)).digest('hex');
const rows=[];
function frozen(value){if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));for(const item of Object.values(value))frozen(item);}}
function capture(name,fn,{generic=false,expectError=false,checkFreeze=true}={}){globalThis.partitionAudit={active:true,owned:0,ownData:0,math:0,inverseIterations:0,work:[]};let result,error;try{result=fn();}catch(e){assert.notEqual(e.name,'AssertionError');error=Object.fromEntries(['name',...Object.getOwnPropertyNames(e).filter(k=>k!=='stack')].map(k=>[k,e[k]]));}globalThis.partitionAudit.active=false;if(expectError)assert.ok(error,name);if(!error&&checkFreeze)frozen(result);const a=globalThis.partitionAudit;rows.push({name,generic,...(error?{error}:{result:hash(result)}),math:a.math,inverseIterations:a.inverseIterations,work:hash(a.work),workCount:a.work.length,ownData:a.ownData,owned:a.owned});return result;}
const kernel={width:300,height:100,innerRadius:20,outerRadius:100,radiusPolicy:'equal-depth',sweep:2*Math.PI};
const frame={origin:[240,180],angle:0,handedness:1,kernel,gap:[0,0]},cell={u0:0,u1:1,v0:0,v1:1};
const cells=[cell,{u0:.1,u1:.7,v0:.2,v1:.9},{u0:0,u1:0,v0:0,v1:1},{u0:.1,u1:.1+Number.EPSILON,v0:.3,v1:.3+Number.EPSILON}];
let index=0;
for(const radiusPolicy of['equal-depth','equal-depth-area'])for(const bend of[0,-0,Number.MIN_VALUE,1e-300,1e-12,.37,.9,1])for(const angle of[0,1e18])for(const handedness of[-1,1])for(const bounds of cells)for(const gap of[[0,0],[4,6],[1000,1000]]){
 const current={...frame,angle,handedness,gap,kernel:{...kernel,radiusPolicy}};capture('cell-'+index++,()=>partitionBendCellGeometry(bounds,current,bend));
}
for(const [name,patch,bend,segments]of [
 ['subnormal',{width:Number.MIN_VALUE,height:Number.MIN_VALUE,innerRadius:0,outerRadius:Number.MIN_VALUE},Number.MIN_VALUE,1],
 ['huge',{width:1e300,height:1e300,innerRadius:0,outerRadius:1e300},Number.MIN_VALUE,1],
 ['max',{width:Number.MAX_VALUE,height:Number.MAX_VALUE,innerRadius:0,outerRadius:Number.MAX_VALUE},.5,1],
 ['missing-sweep',{sweep:undefined},.5,1],['null-sweep',{sweep:null},.5,1],['default-radius',{radiusPolicy:undefined},.37,1],['negative-zero',{height:-0,innerRadius:-0},-0,1]
])capture(name,()=>partitionBendCellGeometry(cell,{...frame,kernel:{...kernel,...patch}},bend,segments));
for(const segment of[1,4096,null,0,4097,1.5,Infinity])capture('segments-'+segment,()=>partitionBendCellGeometry(cell,frame,.37,segment),{expectError:![1,4096].includes(segment)});
for(const [name,mutate]of [
 ['frame-extra',x=>x.frame.extra=true],['frame-origin',x=>x.frame.origin=[0]],['frame-angle',x=>x.frame.angle=NaN],['frame-hand',x=>x.frame.handedness=0],['kernel-extra',x=>x.frame.kernel.extra=true],['kernel-width',x=>x.frame.kernel.width=0],['kernel-height',x=>x.frame.kernel.height=-1],['kernel-radius',x=>x.frame.kernel.innerRadius=101],['kernel-policy',x=>x.frame.kernel.radiusPolicy='bad'],['kernel-sweep',x=>x.frame.kernel.sweep=7],['cell-order',x=>x.cell.u0=2],['cell-unknown',x=>x.cell.extra=true],['gap-short',x=>x.frame.gap=[]],['gap-negative',x=>x.frame.gap=[-1,0]],['cell-gap-order',x=>{x.cell.u0=2;x.frame.gap=[-1,0];}],['frame-cell-order',x=>{x.frame.angle=NaN;x.cell.u0=2;}],['bend-cell-order',x=>{x.bend=2;x.cell.u0=2;}]
]){const x={frame:structuredClone(frame),cell:structuredClone(cell),bend:.37};mutate(x);for(const owned of[false,true])capture(name+'-'+owned,()=>{const v=owned?cloneAndFreeze(x):x;return partitionBendCellGeometry(v.cell,v.frame,v.bend,4);},{expectError:true});}
let reads=0;for(const owner of['frame','kernel','cell','gap']){const x={frame:structuredClone(frame),cell:structuredClone(cell)};const value=owner==='frame'?x.frame:owner==='kernel'?x.frame.kernel:owner==='cell'?x.cell:x.frame.gap;Object.defineProperty(value,owner==='frame'?'angle':owner==='kernel'?'width':owner==='cell'?'u0':'0',{enumerable:true,get(){reads++;return 0;}});capture('accessor-'+owner,()=>partitionBendCellGeometry(x.cell,x.frame,.37,4),{expectError:true});assert.equal(reads,0);}
for(const transform of[x=>x,x=>Object.freeze(x),x=>freezeOwned(x),x=>Object.assign(Object.create(null),x)]){const f=transform(structuredClone(frame)),before=hash(f),result=capture('caller-'+index++,()=>partitionBendCellGeometry(cell,f,.37));assert.equal(hash(f),before);if(!Object.isFrozen(f.origin))f.origin[0]=999;assert.notEqual(result.anchor.x,999);}
// Generic wrappers retain their complete validation and deep-owned results.
for(const bend of[-0,Number.MIN_VALUE,.37,1,2])for(const v of[0,.5,1,2]){
 capture('generic-bend-'+index++,()=>bendPartitionPoint({u:.3,v,bend},kernel),{generic:true});
 const {gap,...basis}=frame;capture('generic-map-'+index++,()=>mapPartitionBendPoint(basis,{u:.3,v,bend}),{generic:true});
 capture('generic-inset-'+index++,()=>insetPartitionBendCell({...cell,v1:v},kernel,bend,[4,6]),{generic:true});
}
for(const v of[-0,Number.MIN_VALUE,.5,1,2])capture('generic-radius-'+index++,()=>partitionRadius(v,{innerRadius:20,outerRadius:100,radiusPolicy:'equal-depth-area'}),{generic:true});
for(const bend of[-1,0,.5,1])for(const tolerance of[.2,0,Number.MIN_VALUE])capture('generic-segments-'+index++,()=>partitionBendSegments({compatible:true,kernel},bend,tolerance),{generic:true});
const n=1000,values=[{key:'root',parent:null,value:0},...Array.from({length:n-1},(_,key)=>({key,parent:'root',value:1}))];
const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',keyField:'key',values}).createHierarchyData({id:'hierarchy',key:'key',parent:'parent',value:'value'}).layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition',labels:false,cells:{strokeWidth:0}}),to=from.editCanvas({width:600});
const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),middle=capture('public-1k',()=>sampleTransition(plan,50));
const nodes=middle.scene.nodes.filter(x=>x.properties.fill==='#3b82f6');assert.equal(nodes.length,n);assert.equal(middle.decisions.filter(d=>d.kernel==='partition').length,n);
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b)));
nodes.forEach((node,i)=>{const x=i===0?20:20+460*(i-1)/(n-1),y=i===0?20:200,width=i===0?460:460/(n-1),expected=[[x,y],[x+width,y],[x+width,y+180],[x,y+180]],commands=node.properties.commands;assert.equal(commands.length,5);assert.equal(commands[4].op,'Z');expected.forEach(([x,y],j)=>{close(commands[j].x,x);close(commands[j].y,y);});});
capture('public-svg',()=>renderToSVG(middle),{checkFreeze:false});
const reverse=planTransition({from:middle,to:from,options:{durationMs:100,easing:'linear'}});capture('public-rebase',()=>sampleTransition(reverse,37));
const offline=deserializeAnimation(serializeAnimation(plan)).plan;capture('public-offline',()=>sampleTransition(offline,50));
// Exact existing work formula is checked before any cell construction.
const group={meaning:{state:{frame,bend:0,nodes:Array(51021).fill({key:'hidden',visible:false})}}};capture('geometry-work-over-limit',()=>resolvePartitionAnimationGeometry(group),{expectError:true});
const hidden={meaning:{state:{frame:{...frame,angle:NaN},bend:0,nodes:[{key:'hidden',visible:false}]}}};capture('hidden-no-new-admission',()=>[...resolvePartitionAnimationGeometry(hidden)],{checkFreeze:false});
writeFileSync(process.argv[2],JSON.stringify({mode:process.env.PARTITION_PROOF_MODE,rawNodes:n,verifiedCells:n,inputSHA256:hash(values),rows},null,2)+'\n');console.log(JSON.stringify({mode:process.env.PARTITION_PROOF_MODE,cases:rows.length,errors:rows.filter(r=>r.error).length}));

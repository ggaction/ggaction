import {validatePointAnimationPosition} from '../../../src/grammar/animation/pointState.js';
import {mapContinuousScaleValues} from '../../../src/grammar/scales/mapping.js';
import {writeFile} from 'node:fs/promises';
let getterReads=0;
const records=[],identity={role:'body',lineage:{rowKeys:['a']}},cases=[];
for(const type of ['linear','time','log','pow','sqrt','symlog'])for(const reverse of [false,true])for(const clamp of [false,true])for(const value of [-0,0,1,10,100]){
 const domain=type==='log'?[1,100]:[-10,100];if(reverse)domain.reverse();const scale={type,domain,range:[-0,400],clamp};const p={value,scale};cases.push({id:`${type}/${reverse}/${clamp}/${Object.is(value,-0)?'-0':value}`,p});
}
for(const [id,mutate] of Object.entries({value:p=>p.value=NaN,domain:p=>p.scale.domain=[0,Infinity],range:p=>p.scale.range=[0],clamp:p=>p.scale.clamp=1,type:p=>p.scale.type='band',extra:p=>p.scale.extra=0,undefined:p=>p.scale.clamp=undefined,getter:p=>Object.defineProperty(p,'value',{get(){getterReads++;throw Error('GETTER RAN')},enumerable:true}),hole:p=>p.scale.domain=[,1],base:p=>{p.scale.type='log';p.scale.base=1},negative:p=>{p.scale.type='log';p.scale.domain=[-1,1]},constant:p=>{p.scale.type='symlog';p.scale.constant=0},exponent:p=>{p.scale.type='pow';p.scale.exponent=-1},empty:p=>p.scale.domain=[0,0],overflow:p=>p.scale.range=[-Number.MAX_VALUE,Number.MAX_VALUE]})){
 const p={value:1,scale:{type:'linear',domain:[0,2],range:[0,400]}};mutate(p);cases.push({id,p});
}
for(const {id,p} of cases){let xy=0;try{if(id!=='getter')xy=mapContinuousScaleValues([p.value],p.scale)[0]}catch{}const beforeGetter=getterReads;const node={type:'circle',properties:{x:xy,y:xy}},start=globalThis.__ownedCount??0;let outcome;try{validatePointAnimationPosition({x:p,y:p},identity,node);outcome={ok:true};}catch(e){outcome={name:e.name,message:e.message};}records.push({id,outcome,getterReads:getterReads-beforeGetter,registrations:(globalThis.__ownedCount??0)-start});}
const p={value:.5,scale:{type:'linear',domain:[0,1],range:[0,400]}};const start=globalThis.__ownedCount??0;for(let i=0;i<1000;i++)validatePointAnimationPosition({x:p,y:p},identity,{type:'circle',properties:{x:200,y:200}});const rowRegistrations=(globalThis.__ownedCount??0)-start;
await writeFile(`.artifacts/format6/validation-only/${process.env.PROTOTYPE==='yes'?'candidate':'control'}.json`,JSON.stringify({records,rowRegistrations},null,2)+'\n');

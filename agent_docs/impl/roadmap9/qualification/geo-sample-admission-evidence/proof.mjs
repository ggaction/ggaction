import './loader.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
let identity=0;globalThis.crypto.randomUUID=()=> '00000000-0000-4000-8000-'+String(++identity).padStart(12,'0');
const root=new URL('../../../../../',import.meta.url);
const {chart,hconcat}=await import(new URL('src/index.js',root));
const {cloneAndFreeze,freezeOwned,isOwned}=await import(new URL('src/core/immutable.js',root));
const {projectAnimationEndpoint}=await import(new URL('src/animation/endpoints.js',root));
const pmod=await import(new URL('src/materialization/animation/geoPresentation.js',root));
const {prepareGeoTracks,sampleGeoTracks}=await import(new URL('src/animation/geoTracks.js',root));
const {planTransition,sampleTransition,serializeAnimation,deserializeAnimation}=await import(new URL('src/animation.js',root));
const candidate=process.env.GEO_C1_MODE==='candidate', rows=[];
const digest=value=>createHash('sha256').update(JSON.stringify(value,(_key,item)=>Object.is(item,-0)?{$negativeZero:true}:item)).digest('hex');
const reset=()=>{globalThis.geoC1={active:true,events:[],admissionDepth:0,counts:{presentation:0,group:0,stream:0}};};
const freezeCheck=value=>{if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));for(const item of Object.values(value))freezeCheck(item);}};
const errorValue=e=>({name:e.name,message:e.message,...Object.fromEntries(Object.getOwnPropertyNames(e).filter(k=>!['stack','name','message'].includes(k)).map(k=>[k,e[k]]))});
function capture(name,fn,{generic=false,expectError=false}={}){reset();let result,error;try{result=fn();}catch(e){error=errorValue(e);}globalThis.geoC1.active=false;if(expectError)assert.ok(error, name+' must fail');if(!error)freezeCheck(result);
 const audit=globalThis.geoC1,events=generic?audit.events:audit.events.filter(e=>e[0]===0);
 rows.push({name, ...(error?{error}:{result:digest(result)}),events:digest(events),eventCount:events.length,counts:audit.counts});return result;}
const feature=(id,type,coordinates)=>({type:'Feature',id,properties:{},geometry:{type,coordinates}});
function make(features,projection={},mark='createGeoPointMark',capacity=false){return chart().createCanvas({width:400,height:300,margin:0,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:projection.type==='identity'?'planar':'geographic',featureKey:'id',values:{type:'FeatureCollection',features}}).createProjection({id:'projection',type:'equirectangular',scalePx:100,translatePx:[200,150],...projection}).createCoordinate({type:'geo'})[mark]({id:'map',...(capacity?{capacity:{maxProjectedPoints:200000,maxPathCommands:200000}}:{})});}
const state=(p,capacity=false)=>pmod.projectGeoAnimationPresentations(p,projectAnimationEndpoint(p),capacity);
function combined(input,capacity=false){if(candidate)return pmod.resolveSampledGeoPresentation(input,capacity);const presentation=pmod.normalizeGeoAnimationPresentation(input);return{presentation,resolved:pmod.resolveGeoAnimationPresentation(presentation,capacity)};}
function combinedFrozen(input,capacity){const result=combined(input,capacity);assert.ok(isOwned(result.presentation));assert.ok(isOwned(result.resolved));return Object.freeze(result);}
const base=make([feature('front','Point',[0,0]),feature('back','Point',[180,0])],{type:'orthographic'}),original=state(base).groups[0].presentation;
for(const [name,input] of [['mutable',structuredClone(original)],['owned',original],['shallow-owned',freezeOwned(structuredClone(original))],['frozen-unowned',Object.freeze(structuredClone(original))],['null-prototype',Object.assign(Object.create(null),structuredClone(original))]]){
 const before=digest(input),result=capture(name,()=>combinedFrozen(input));assert.equal(digest(input),before);if(!Object.isFrozen(input.geometry))input.geometry.features[0].geometry.coordinates[0]=40;assert.equal(result.presentation.geometry.features[0].geometry.coordinates[0],0);
 capture('generic-'+name,()=>pmod.resolveGeoAnimationPresentation(result.presentation),{generic:true});
}
const aliases=structuredClone(original);aliases.styles[1]=aliases.styles[0];const aliasResult=capture('aliases',()=>combinedFrozen(aliases));assert.notEqual(aliasResult.presentation.styles[0],aliasResult.presentation.styles[1]);
const mutations=[
 ['extra',v=>v.extra=true],['projection-kind',v=>v.geometry.projection.kind='geometry'],['negative-scale',v=>v.geometry.parameters.scalePx=-1],['latitude',v=>v.geometry.features[1].geometry.coordinates[1]=91],['extra-geometry',v=>v.geometry.features[0].geometry.extra=true],['style-count',v=>v.styles=[]],['style-radius',v=>v.styles[0].radiusPx=2],['style-required',v=>delete v.styles[0].opacity],['frame-offset',v=>v.frame.offset=[0]],['plot-origin',v=>v.plotOrigin=[Infinity,0]],['duplicate-feature',v=>v.geometry.features[1].key=v.geometry.features[0].key],['noncanonical-key',v=>v.geometry.key='[ [], "map" ]'],['invalid-both-group-style',v=>{v.geometry.parameters.scalePx=-1;v.styles=[];}],['invalid-style-stream',v=>{v.styles=[];v.geometry.parameters.scalePx=Number.MAX_VALUE;}],['array-maxValues',v=>v.styles=new Array(2000001)],['work-10000000',v=>v.geometry.logicalId='x'.repeat(10000000)],['work-9999999',v=>v.geometry.logicalId='x'.repeat(9999999)],['depth',v=>{let a=v.extra={};for(let i=0;i<129;i++)a=a.child={};}],['cycle',v=>v.extra=v]
];
for(const [name,mutate]of mutations){const input=structuredClone(original);mutate(input);capture(name,()=>combinedFrozen(input),{expectError:true});capture('generic-'+name,()=>pmod.resolveGeoAnimationPresentation(input),{generic:true,expectError:true});if(!['cycle','array-maxValues','work-10000000','work-9999999','depth'].includes(name))capture('owned-'+name,()=>combinedFrozen(cloneAndFreeze(input)),{expectError:true});}
let reads=0;const getter=structuredClone(original);Object.defineProperty(getter,'styles',{enumerable:true,get(){reads++;return[];}});capture('accessor',()=>combinedFrozen(getter),{expectError:true});assert.equal(reads,0);
const cases=[['hidden',base,base.editProjection({rotateDeg:[120,0,0]}),false],['seam',make([feature('line','LineString',[[170,0],[-170,0]])],{},'createGeoLineMark'),null,false],['planar-hole',make([feature('shape','Polygon',[[[0,0],[100,0],[100,100],[0,100],[0,0]],[[25,25],[25,75],[75,75],[75,25],[25,25]]])],{type:'identity',scalePx:1,translatePx:[0,0]},'createGeoShapeMark'),null,false],['canonical-1k',make([feature('line','LineString',Array.from({length:1000},(_,i)=>[-30+60*i/999,(i%2?1:-1)*5]))],{},'createGeoLineMark',true),null,true]];
for(const [name,from,target,capacity]of cases){const to=target??from.editProjection({scalePx:200,...(name==='planar-hole'?{}:{rotateDeg:[30,0,0]})});const prepared=prepareGeoTracks(state(from,capacity),state(to,capacity),capacity);
 for(const t of [0,.37,1]){const account=[];capture(`${name}-${t}`,()=>sampleGeoTracks(prepared.state,t,work=>account.push(work)));rows.at(-1).account=account;}
 const native=planTransition({from,to,options:{durationMs:100,easing:'linear',...(capacity?{formatVersion:5}:{})}}),middle=capture(`${name}-public`,()=>sampleTransition(native,37));
 const rebase=planTransition({from:middle,to:from,options:{durationMs:100,easing:'linear',...(capacity?{formatVersion:5}:{})}});capture(`${name}-rebase`,()=>sampleTransition(rebase,50));
 const restored=deserializeAnimation(serializeAnimation(native)).plan;capture(`${name}-offline`,()=>sampleTransition(restored,37));
}
const pair=p=>hconcat({id:'pair',programs:[{id:'left',program:p},{id:'right',program:p}]});
const pairState=prepareGeoTracks(state(pair(base)),state(pair(base.editProjection({rotateDeg:[80,0,0]}))));
for(const name of ['multi-group','timeline','timeline-invalid','aggregate-callback']){const work=[];capture(name,()=>sampleGeoTracks(pairState.state,.5,amount=>{work.push(amount);if(name==='aggregate-callback'&&work.length===2)throw new RangeError('original aggregate callback sentinel');},name.startsWith('timeline')?{progress:()=>.37,geoStyle:()=>({opacity:name==='timeline-invalid'?-1:.25})}:undefined),{expectError:name==='timeline-invalid'||name==='aggregate-callback'});rows.at(-1).account=work;}
// Small fault injection tests the unchanged aggregate owner at its original
// numeric boundaries. These rows are not native workload or performance claims.
for(const [name,override,fail]of [['work-at-limit',{work:2500000},false],['work-over-limit',{work:2500001},true],['points-at-limit',{outputPoints:2500},false],['points-over-limit',{outputPoints:2501},true]]){
 globalThis.geoC1Override=override;const account=[];capture('synthetic-'+name,()=>sampleGeoTracks(pairState.state,.5,amount=>account.push(amount)),{expectError:fail});rows.at(-1).account=account;rows.at(-1).syntheticDiagnostics=override;delete globalThis.geoC1Override;
}
writeFileSync(process.argv[2],JSON.stringify({mode:process.env.GEO_C1_MODE,rows},null,2)+'\n');console.log(JSON.stringify({mode:process.env.GEO_C1_MODE,cases:rows.length,errors:rows.filter(r=>r.error).length}));

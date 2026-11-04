import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../src/index.js';
import {chart as basic} from '../../../src/basic.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from '../../../src/animation.js';
import {sampleTransitionWithBudget} from '../../../src/animation/sample.js';
import {exportTransitionPlan,restoreTransitionPlan,transitionResources} from '../../../src/animation/planner.js';
import {animationResourceAccounting,createOfflineResourceScope} from '../../../src/animation/resources.js';
import {prepareAnimationColumnsV2,restoreAnimationColumnsV2} from '../../../src/animation/columnCodec.js';
import {animationCartesianFrame,cartesianFrameVariants} from '../../support/animation-cartesian-frame.js';
import {animationPolarFrame,polarFrameVariants} from '../../support/animation-polar-frame.js';
import {animationGraphFrame} from '../../support/animation-graph-frame.js';
import {animationPartitionFrame} from '../../support/animation-partition-frame.js';
import {animationGuideFrame,guideFrameVariants} from '../../support/animation-guide-frame.js';
import {animationGeoTextFrame,geoTextFrameVariants} from '../../support/animation-geo-text-frame.js';
const options={durationMs:100,easing:'linear',formatVersion:5};
const prepare=(from,to=from,extra={})=>planTransition({from,to,options:{...options,...extra}});
const points=(make=chart)=>make().createCanvas({width:200,height:160,margin:20,plotBorder:false})
 .createData({id:'rows',keyField:'id',values:[{id:0,x:0,y:1},{id:1,x:1,y:0}]})
 .createPointMark({id:'points'}).encodeX({field:'x',scale:{id:'x',domain:[0,1],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}});
const geo=(capacity,count=3)=>chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
 .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:count},(_,i)=>[-30+60*i/(count-1),(i%2?1:-1)*5])}}]}})
 .createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5})
 .createCoordinate({type:'geo'}).createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,...(capacity===undefined?{}:{capacity})});
function raw(wire){return restoreAnimationColumnsV2({kind:'animation-columns',version:2,root:{object:[['from',wire.from],['to',wire.to]]},vectors:wire.vectors},createOfflineResourceScope(wire.limits));}
function replaceEndpoints(wire,endpoints){const value=structuredClone(wire),packed=prepareAnimationColumnsV2(endpoints,createOfflineResourceScope(wire.limits)).compact;Object.assign(value,Object.fromEntries(packed.root.object),{vectors:packed.vectors});return value;}

test('explicit format5 preserves point Basic timeline offline and current frame meaning with default node limits',()=>{
 for(const make of[chart,basic]){
  const from=points(make),to=from.encodeX({field:'x',scale:{id:'x',domain:[0,2],nice:false}}),plan=prepare(from,to),wire=exportTransitionPlan(plan);
  assert.equal(plan.version,5);assert.equal(wire.kernels.columns,'animation-columns@2');assert.equal(wire.kernels.transition,5);
  assert.deepEqual(wire.limits,{maxEndpointNodes:10000,maxOutputNodes:10000});
  const text=serializeAnimation(plan),restored=deserializeAnimation(text).plan;
  assert.equal(animationResourceAccounting(transitionResources(restored)).native,false);assert.equal(serializeAnimation(restored),text);
  const previous=planTransition({from,to,options:{durationMs:100,easing:'linear'}});
  for(const time of[0,19,50,100]){assert.deepEqual(sampleTransition(plan,time),sampleTransition(previous,time));assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));}
  const frame=sampleTransition(plan,37),rebase=prepare(frame,to);assert.equal(sampleTransition(rebase,0),frame);
  const offline=deserializeAnimation(serializeAnimation(rebase)).plan;for(const time of[0,50,100])assert.deepEqual(sampleTransition(offline,time),sampleTransition(rebase,time));
  const ownerKey=sampleTransition(plan,50).decisions.find(d=>d.ownerKey).ownerKey;
  const timeline=prepare(from,to,{tracks:[{target:{ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}]}],markers:[{id:'half',timeMs:50}]});
  const copy=deserializeAnimation(serializeAnimation(timeline)).plan;for(const time of[0,25,50,100])assert.deepEqual(sampleTransition(copy,time),sampleTransition(timeline,time));
 }
});

test('numeric format selection and closed header reject invalid values without invoking accessors',()=>{
 const from=points();for(const formatVersion of[undefined,null,3,4,7,'5',NaN,Infinity])assert.throws(()=>prepare(from,from,{formatVersion}),/formatVersion/);
 let reads=0;assert.throws(()=>planTransition({from,to:from,options:{durationMs:100,get formatVersion(){reads++;return 5;}}}),/accessor/);assert.equal(reads,0);
 const wire=exportTransitionPlan(prepare(from));
 for(const mutate of[w=>delete w.kernels.columns,w=>w.kernels.columns='animation-columns@1',w=>w.kernels.transition=4,w=>w.version=4,w=>w.kernels.geo='native-geo-camera@2',w=>w.limits.maxOutputNodes=100002,w=>w.extra=true]){const changed=structuredClone(wire);mutate(changed);assert.throws(()=>restoreTransitionPlan(changed));}
 assert.throws(()=>prepare(from,from,{maxEndpointNodes:1}),/endpoint/);
});

test('format5 capacity Geo preserves native geometry path declaration offline and rebase',()=>{
 for(const capacity of[undefined,{maxProjectedPoints:200000,maxPathCommands:200000}]){
  const from=geo(capacity,1000),to=from.editProjection({scalePx:200}),plan=prepare(from,to),wire=exportTransitionPlan(plan);
  assert.equal(wire.kernels.geo,capacity===undefined?'native-geo-camera@1':'native-geo-camera@2');
  assert.ok(wire.vectors.some(v=>v.kind==='float64-le'&&v.length===1999));
  const frame=sampleTransition(plan,50);assert.equal(frame.decisions[1].kernel,'native-geo');
  assert.equal(frame.scene.nodes[1].properties.maxCommands,capacity?.maxPathCommands);
  assert.equal(frame.scene.nodes[1].properties.commands.length,1999);
  const restored=deserializeAnimation(serializeAnimation(plan)).plan;for(const time of[0,19,50,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));
  const rebase=prepare(frame,to),offline=deserializeAnimation(serializeAnimation(rebase)).plan;assert.equal(sampleTransition(rebase,0),frame);
  for(const time of[0,50,100])assert.deepEqual(sampleTransition(offline,time),sampleTransition(rebase,time));
  const endpoints=raw(wire);endpoints.from.geos.groups[0].presentation.geometry.parameters.scalePx*=2;
  assert.throws(()=>restoreTransitionPlan(replaceEndpoints(wire,endpoints)),/differs|geometry|projection|camera|Geographic/);
 }
});

test('capacity groups retain independent limits and default groups retain aggregate point admission',()=>{
 const from=geo({maxProjectedPoints:200000,maxPathCommands:200000},6000),to=from.editProjection({scalePx:200});
 const plan=prepare(from,to),frame=sampleTransition(plan,50),native=from.editProjection({scalePx:Math.sqrt(100*200)});
 assert.equal(frame.scene.nodes[1].properties.commands.length,11999);
 for(const [i,command] of frame.scene.nodes[1].properties.commands.entries()){const expected=native.graphicSpec.objects.coast.items[0].properties.commands[i];assert.equal(command.op,expected.op);assert.ok(Math.abs(command.x-expected.x)<1e-10);assert.ok(Math.abs(command.y-expected.y)<1e-10);}
 const state=raw(exportTransitionPlan(plan));state.from.geos.groups[0].presentation.geometry.binding.capacity.maxProjectedPoints=10000;
 assert.throws(()=>restoreTransitionPlan(replaceEndpoints(exportTransitionPlan(plan),state)),/limit|maximum|exceeds|points/);
 const declarations=raw(exportTransitionPlan(plan));declarations.from.graphicSpec.objects.coast.items[0].properties.maxCommands=199999;
 assert.throws(()=>restoreTransitionPlan(replaceEndpoints(exportTransitionPlan(plan),declarations)),/capacity|differs/);
 assert.throws(()=>planTransition({from:frame,to,options:{durationMs:100}}),/limit|maximum|exceeds|points/);
 const defaults=geo(undefined,3001).createGeoLineMark({id:'second',stroke:'#ef4444'});
 assert.throws(()=>prepare(defaults,defaults.editProjection({scalePx:200})),/Animation Geo state points/);
 const mixed=geo(undefined,3001).createGeoLineMark({id:'second',stroke:'red',capacity:{maxProjectedPoints:20000,maxPathCommands:20000}});
 assert.deepEqual(sampleTransition(prepare(mixed,mixed.editProjection({scalePx:200})),50).scene.nodes.filter(n=>n.type==='path').map(n=>n.properties.maxCommands),[undefined,20000]);
 const separate=geo({maxProjectedPoints:1000,maxPathCommands:1000}).createGeoLineMark({id:'second',stroke:'red',capacity:{maxProjectedPoints:2000,maxPathCommands:2000}}),separatePlan=prepare(separate,separate.editProjection({scalePx:200}));
 assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(separatePlan)).plan,50).scene.nodes.filter(n=>n.type==='path').map(n=>n.properties.maxCommands),[1000,2000]);
 const mismatch=geo({maxProjectedPoints:1000,maxPathCommands:1000}),other=mismatch.editGeoLineMark({capacity:{maxProjectedPoints:2000,maxPathCommands:2000}});
 const fallback=sampleTransition(prepare(mismatch,other),50);assert.ok(fallback.decisions.some(d=>d.reason==='geo-binding'));
 const mixedRebase=prepare(fallback,other),mixedCopy=deserializeAnimation(serializeAnimation(mixedRebase)).plan;
 for(const time of[0,50,100])assert.deepEqual(sampleTransition(mixedCopy,time),sampleTransition(mixedRebase,time));
});

test('numeric geographic transport preserves every original sampled work callback',()=>{
 const from=geo(undefined,1000),to=from.editProjection({scalePx:200}),records=[];
 for(const extra of[{}, {maxOutputNodes:10000}, {formatVersion:5}]){const plan=planTransition({from,to,options:{durationMs:100,easing:'linear',...extra}}),charges=[];sampleTransitionWithBudget(plan,50,amount=>charges.push(amount));records.push(charges);}
 assert.deepEqual(records[1],records[0]);assert.deepEqual(records[2],records[0]);assert.equal(records[0].reduce((a,b)=>a+b,0),18916);
});

const familyCases=[...cartesianFrameVariants.map(v=>['cartesian-'+v,()=>animationCartesianFrame(v)]),...polarFrameVariants.map(v=>['polar-'+v,()=>animationPolarFrame(v)]),...guideFrameVariants.map(v=>['guide-'+v,()=>animationGuideFrame(v)]),...geoTextFrameVariants.map(v=>['geo-text-'+v,()=>animationGeoTextFrame(v)]),['graph',()=>animationGraphFrame()],['route',()=>animationGraphFrame(false,true)],['partition',()=>animationPartitionFrame()],['partition-rebase',()=>animationPartitionFrame(true)]];
for(const [name,factory]of familyCases)test('numeric format preserves prepared '+name+' endpoints and offline current-frame replay',()=>{
 const {from,to,plan:legacy}=factory(),plan=prepare(from,to),offline=deserializeAnimation(serializeAnimation(plan)).plan;
 for(const time of[0,37,50,100]){assert.deepEqual(sampleTransition(plan,time),sampleTransition(legacy,time));assert.deepEqual(sampleTransition(offline,time),sampleTransition(plan,time));}
 const current=sampleTransition(plan,37),rebased=prepare(current,to),copy=deserializeAnimation(serializeAnimation(rebased)).plan;assert.equal(sampleTransition(rebased,0),current);
 for(const time of[0,50,100])assert.deepEqual(sampleTransition(copy,time),sampleTransition(rebased,time));
});

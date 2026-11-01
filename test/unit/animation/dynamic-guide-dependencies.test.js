import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { exportTransitionPlan, restoreTransitionPlan } from '../../../src/animation/planner.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { resolveSceneNodeOccupiedBounds } from '../../../src/grammar/schemas/graphicBounds.js';
import { collectAnimationFrameViews } from '../../../src/animation/frames.js';
import { sampleTransitionWithBudget } from '../../../src/animation/sample.js';
import { projectAnimationEndpoint } from '../../../src/animation/endpoints.js';
import { nativeAxisReflowFontFrame } from '../../support/animation-axis-reflow-node.js';
import { cloneAndFreeze } from '../../../src/core/immutable.js';
import { resolveLegendAxisLaneEntries, prepareLegendAxisLaneInterpolation, sampleLegendAxisLaneInterpolation } from '../../../src/materialization/animation/legendAxisLaneState.js';
import { guideAnimationKey } from '../../../src/grammar/animation/guideState.js';
import { axisTitleAnimationItems } from '../../../src/materialization/animation/axisTitleGuides.js';
import { axisLabelDependencySnapshot, axisLabelDependencyKeys } from '../../../src/materialization/animation/axisLabelDependencies.js';

const options={durationMs:100,easing:'linear'};
const prepare=(from,to,extra={})=>planTransition({from,to,options:{...options,...extra}});
const roundtrip=plan=>{const restored=deserializeAnimation(serializeAnimation(plan)).plan;for(const t of [0,25,50,75,100])assert.deepEqual(sampleTransition(restored,t),sampleTransition(plan,t));};
function native(width=450, {empty=false,inferred=false,clip,maxWidth=300}={}) {
  let program=chart().createCanvas({width,height:900,margin:150,responsive:{minPlotSize:{width:40,height:40}}})
    .createData({values:[{x:'Alpha Beta Gamma Delta',y:1,g:'A'},{x:'Epsilon Zeta Eta Theta',y:2,g:'B'}]})
    .createBarPlot({id:'bars',x:'x',y:'y',color:'g',guides:{axes:{x:{ticksAndLabels:{labels:{maxWidth,responsive:{maxLines:4},color:'black',...(empty?{labelMap:[{value:'Alpha Beta Gamma Delta',label:''},{value:'Epsilon Zeta Eta Theta',label:''}]}:{})}},title:{text:'Category',...(inferred?{}:{offset:{from:'labels',gap:8}})}},y:false},legend:false}})
    ;
  if (clip) program=program.editGraphics({target:'xAxisLabels',property:'clip',value:clip});
  return program.createLegend({channels:['color'],position:'bottom',title:'Series'});
}
const selected=frame=>frame.decisions.flatMap((d,i)=>d.role==='guide-title'||d.role?.startsWith('guide-legend-')?[{decision:d,node:frame.scene.nodes[i]}]:[]);
const owned=frame=>selected(frame).map(({node})=>({type:node.type,properties:node.properties}));
const nativeOwned=program=>{const e=projectAnimationEndpoint(program);return e.scene.nodes.filter((_,i)=>e.sources[i].graphicId==='xAxisTitle'||e.sources[i].graphicId.startsWith('colorLegend')).map(({type,properties})=>({type,properties}));};
const geometry=(ownerKey,value)=>({target:{ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value},{timeMs:100,value:1}]});

test('dynamic title and lane refs replay actual native wrapping without storing another label layout',()=>{
  const from=native(),to=native(1100),plan=prepare(from,to),payload=exportTransitionPlan(plan);
  assert.equal(payload.kernels.guide,'native-guide-values@13');
  const title=payload.from.guides.find(s=>s?.kind==='title-layout'),lane=payload.from.guides.find(s=>s?.kind==='legend-axis-lane');
  assert.deepEqual(title.layout.labels,{group:'[[],"x"]'});assert.deepEqual(lane.labelGroups,['[[],"x"]']);
  for(const t of [25,50,75]){
    const frame=sampleTransition(plan,t);assert.ok(selected(frame).every(({decision})=>decision.kernel==='guide-geometry'));
    assert.deepEqual(owned(frame),nativeOwned(native(450+650*t/100)));
  }
  const middle=sampleTransition(plan,50),titleNode=selected(middle).find(x=>x.decision.role==='guide-title').node;
  assert.deepEqual([titleNode.properties.x,titleNode.properties.y],[387.5,794.5]);
  roundtrip(plan);const next=prepare(middle,to);assert.strictEqual(sampleTransition(next,0),middle);roundtrip(next);
});

test('native group references include empty raw owners and preserve nested scope and rebase',()=>{
  const child=width=>native(width,{empty:true,inferred:true});
  const panel=width=>hconcat({id:'panels',programs:[{id:'empty',program:child(width)},{id:'visible',program:native(width)}]});
  const plan=prepare(panel(450),panel(1100)),middle=sampleTransition(plan,50),proof=animationFrameProvenance(middle);
  const empty=proof.axislabels.groups.find(g=>g.scope.namespaces[0]==='panels-empty');
  assert.equal(proof.axislabels.items.filter(x=>x?.group===proof.axislabels.groups.indexOf(empty)).length,0);
  assert.deepEqual(axisLabelDependencyKeys(proof.axislabels,['panels-empty'],'bottom'),['[["panels-empty"],"x"]']);
  assert.ok(selected(middle).every(x=>x.decision.kernel==='guide-geometry'));
  roundtrip(plan);roundtrip(prepare(middle,panel(1100)));
});

test('independent axis and lane clocks use current native label ink once',()=>{
  const from=native(),to=native(1100),plan=prepare(from,to,{tracks:[geometry('[[],"x"]',.25),geometry('[[],"bars"]',.75)]});
  const frame=sampleTransition(plan,50),title=selected(frame).find(x=>x.decision.role==='guide-title');
  const expected=native(612.5).graphicSpec.objects.xAxisTitle.properties;
  assert.equal(title.node.properties.x,expected.x);assert.equal(title.node.properties.y,expected.y);
  assert.ok(selected(frame).every(x=>x.decision.kernel==='guide-geometry'));
  const proof=animationFrameProvenance(frame);assert.equal(proof.axislabels.groups[0].layout.canvas.width,612.5);
  assert.equal(proof.guides.find(s=>s?.kind==='legend-axis-lane').layout.frame.canvas.width,937.5);
  roundtrip(plan);roundtrip(prepare(frame,to));
});

test('per-line style disagreement preserves current drawing and fades only dependent typed owners',()=>{
  const from=native().editXAxisLabels({maxWidth:50}),to=native(600).editXAxisLabels({maxWidth:50}),ordinary=prepare(from,to),base=sampleTransition(ordinary,50);
  const first=base.decisions.find(d=>d.kernel==='native-axis-label').guideKey;
  const plan=prepare(from,to,{tracks:[{target:{guideKey:first},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:'black'},{timeMs:50,value:'red'},{timeMs:100,value:'black'}]}]});
  const frame=sampleTransition(plan,50);assert.ok(frame.decisions.some(d=>d.kernel==='native-axis-label'));
  assert.equal(animationFrameProvenance(frame).axislabels.groups[0].reason,'guide-edited');
  assert.ok(selected(frame).every(x=>x.decision.kind==='crossfade'&&x.decision.reason==='guide-layout'));
  roundtrip(plan);roundtrip(prepare(frame,to));
});

test('strict dynamic refs reject foreign, missing, duplicated and stale group meaning',()=>{
  const from=native(),payload=exportTransitionPlan(prepare(from,native(1100)));
  for(const mutate of [p=>p.kernels.guide='native-guide-values@11',p=>p.kernels.guide='native-guide-values@12',
    p=>p.from.guides.find(s=>s?.kind==='title-layout').layout.labels.group='[[],"other"]',
    p=>p.from.guides.find(s=>s?.kind==='legend-axis-lane').labelGroups=[],
    p=>p.from.guides.find(s=>s?.kind==='legend-axis-lane').labelGroups.push('[[],"x"]'),
    p=>delete p.from.axislabels,
    p=>p.from.guides.find(s=>s?.kind==='title-layout').layout.labels.layout=p.from.axislabels.groups[0].layout,
    p=>p.from.axislabels.groups[0].reason='guide-edited']){
    const copy=structuredClone(payload);mutate(copy);assert.throws(()=>restoreTransitionPlan(copy));
  }
  let reads=0;const bad=structuredClone(payload),labels=bad.from.guides.find(s=>s?.kind==='title-layout').layout.labels;
  Object.defineProperty(labels,'group',{enumerable:true,get(){reads++;return '[[],"x"]';}});assert.throws(()=>restoreTransitionPlan(bad));assert.equal(reads,0);
});

test('changed wrap policy remains a native dependency fallback with exact offline replay',()=>{
  const from=native(),to=from.editXAxisLabels({maxWidth:120}),plan=prepare(from,to),frame=sampleTransition(plan,50);
  assert.ok(selected(frame).every(x=>x.decision.kind==='crossfade'));
  roundtrip(plan);roundtrip(prepare(frame,to));
});


test('current dynamic label stroke and clip feed native lane ink in translated scopes',()=>{
  const make=width=>native(width,{inferred:true,maxWidth:50,clip:{x:0,y:0,width:1200,height:780}});
  const panels=width=>hconcat({id:'pair',programs:[{id:'first',program:native(width)},{id:'clipped',program:make(width)}]});
  const from=panels(600),to=panels(800),base=prepare(from,to),payload=exportTransitionPlan(base);
  const labels=payload.to.guides.filter(s=>s?.identity.component==='labels'&&s.identity.namespaces[0]==='pair-clipped');
  const keys=labels.map(s=>JSON.stringify(['guide',s.identity.namespaces,s.identity.owner,s.identity.component,s.identity.value,s.identity.line]));
  // Use the public keys of actual endpoint labels, including wrapped lines.
  const endpoint=sampleTransition(base,99),guideKeys=[...new Set(endpoint.decisions.filter(d=>d.kernel==='native-axis-label'&&d.ownerKey==='[["pair-clipped"],"x"]').map(d=>d.guideKey))];
  assert.ok(keys.length>0&&guideKeys.length>0);
  const tracks=guideKeys.map(guideKey=>({target:{guideKey},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:'black'},{timeMs:50,value:'red'},{timeMs:100,value:'black'}]}));
  const line=endpoint.decisions.find(d=>d.role==='guide-line'&&d.ownerKey==='[["pair-clipped"],"x"]');
  tracks.push({target:{guideKey:line.guideKey},property:'strokeWidth',kernel:'number',keyframes:[{timeMs:0,value:1},{timeMs:50,value:8},{timeMs:100,value:1}]});
  const plan=prepare(from,to,{tracks}),frame=sampleTransition(plan,50),proof=animationFrameProvenance(frame);
  const group=proof.axislabels.groups.find(g=>g.scope.namespaces[0]==='pair-clipped');assert.equal(group.reason,undefined);
  assert.ok(selected(frame).filter(x=>x.decision.ownerKey==='[["pair-clipped"],"bars"]').every(x=>x.decision.kernel==='guide-geometry'));
  const nodes=frame.scene.nodes.filter((_,i)=>frame.decisions[i]?.kernel==='native-axis-label'&&frame.decisions[i]?.ownerKey==='[["pair-clipped"],"x"]');
  assert.ok(nodes.every(n=>n.offset[0]>0));assert.equal(frame.scene.nodes[frame.decisions.findIndex(d=>d.guideKey===line.guideKey)].properties.strokeWidth,8);
  assert.ok(nodes.every(n=>{const bounds=resolveSceneNodeOccupiedBounds(n,group.layout.metrics);return bounds===undefined||bounds.bottom<=780;}));
  roundtrip(plan);roundtrip(prepare(frame,to));
});

test('missing source or target dynamic groups keep dependent whole-frame transport honest',()=>{
  const withGroup=native(600,{inferred:true}),without=withGroup.editXAxis({labels:false});
  for(const [from,to] of [[withGroup,without],[without,withGroup]]){
    const plan=prepare(from,to),frame=sampleTransition(plan,50);
    assert.ok(selected(frame).some(x=>x.decision.kind==='crossfade'));
    roundtrip(plan);roundtrip(prepare(frame,to));
  }
});

test('dependent current group work participates in atomic frame-export bounds',()=>{
  const from=native(),to=native(1100),plan=prepare(from,to);let work=0;
  const frame=sampleTransitionWithBudget(plan,50,amount=>work+=amount);assert.deepEqual(frame,sampleTransition(plan,50));assert.ok(work>0);
  const total=work+Math.max(1,frame.scene.nodes.length);
  assert.equal(collectAnimationFrameViews([50],(t,account)=>{account(10_000_000-total);return sampleTransitionWithBudget(plan,t,account);}).length,1);
  let result;assert.throws(()=>{result=collectAnimationFrameViews([50],(t,account)=>{account(10_000_001-total);return sampleTransitionWithBudget(plan,t,account);});},/exceeds|work/i);assert.equal(result,undefined);
});


test('exact prepared font dependencies share native midpoint geometry and immutable replay',async()=>{
  const {from,to,native:expected,plan,frame}=await nativeAxisReflowFontFrame({dependencies:true});
  assert.equal(from.graphicSpec.objects.xAxisLabels.items.length,6);assert.equal(to.graphicSpec.objects.xAxisLabels.items.length,3);
  assert.ok(selected(frame).every(x=>x.decision.kernel==='guide-geometry'));
  assert.deepEqual(owned(frame),nativeOwned(expected));roundtrip(plan);roundtrip(prepare(frame,to));
});

test('occupied bounds charge multiline, font and clip structures without changing their geometry',()=>{
  const node={type:'text',properties:{text:'AB AB',x:10,y:10,fontSize:10,lines:[{text:'AB',x:10,y:10},{text:'AB',x:10,y:22}]},offset:[5,0],clip:[0,0,100,100],clips:[{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:100,y:0},{op:'L',x:100,y:100},{op:'Z'}]}]};
  let work=0;const actual=resolveSceneNodeOccupiedBounds(node,undefined,n=>work+=n);
  assert.deepEqual(actual,resolveSceneNodeOccupiedBounds(node));assert.equal(work,33);
  const limit=new RangeError('work bound');assert.throws(()=>resolveSceneNodeOccupiedBounds(node,undefined,()=>{throw limit;}),error=>error===limit);
});

test('native dependency caching charges the first layout once and propagates budget errors',()=>{
  const payload=exportTransitionPlan(prepare(native(),native(1100))),endpoint=projectAnimationEndpoint(native());
  // Use one exact endpoint: logical dataset identity is irrelevant to guides.
  const state=payload.from.guides.find(s=>s?.kind==='legend-axis-lane');
  const dependencies=cloneAndFreeze(payload.from.guides.flatMap((s,i)=>s&&state.axes.includes(guideAnimationKey(s.identity))?[{state:s,node:endpoint.scene.nodes[i]}]:[]));
  const groups=cloneAndFreeze(payload.from.axislabels.groups.map(g=>({key:JSON.stringify([g.scope.namespaces,g.scope.owner]),current:axisLabelDependencySnapshot(g)})));
  const laneNode=endpoint.scene.nodes[payload.from.guides.indexOf(state)];let work=0;
  const entries=resolveLegendAxisLaneEntries(state,dependencies,laneNode,groups,n=>work+=n);assert.ok(work>0);const first=work;
  assert.strictEqual(resolveLegendAxisLaneEntries(state,dependencies,laneNode,groups,n=>work+=n),entries);assert.equal(work,first);
  const plan=prepareLegendAxisLaneInterpolation(state,payload.to.guides.find(s=>s?.kind==='legend-axis-lane'));
  const limit=new RangeError('work bound');assert.throws(()=>sampleLegendAxisLaneInterpolation(plan,.51,dependencies,laneNode,groups,()=>{throw limit;}),error=>error===limit);
});


test('same-edge dynamic titles and lanes replay the native clearance on four edges',()=>{
  for(const edge of ['top','bottom','left','right']){
    const channel=['top','bottom'].includes(edge)?'X':'Y';
    const source=size=>{
      let p=chart().createCanvas({width:size,height:size,margin:350,responsive:{minPlotSize:{width:40,height:40}}})
        .createData({values:[{x:0,y:0,g:'A'},{x:1,y:1,g:'B'}]}).createPointMark({id:'points'})
        .encodeX({field:'x'}).encodeY({field:'y'}).encodeColor({field:'g'});
      p=p[`create${channel}Axis`]({position:edge,title:{text:'Axis',offset:{from:'labels',gap:8}},ticksAndLabels:{values:[0,1],labels:{maxWidth:50,responsive:{maxLines:3},labelMap:[{value:0,label:'Alpha Beta Gamma'},{value:1,label:'Delta Epsilon Zeta'}]}}});
      return p.createLegend({channels:['color'],position:edge,title:'Legend'});
    };
    const from=source(1400),to=source(1600),plan=prepare(from,to),middle=sampleTransition(plan,50),expected=projectAnimationEndpoint(source(1500));
    assert.ok(selected(middle).every(x=>x.decision.kernel==='guide-geometry'),edge);
    for(const {decision,node} of selected(middle)){
      const target=expected.scene.nodes.find(n=>n.key===node.key);assert.ok(target,edge);assert.deepEqual(node.properties,target.properties,edge);
    }
    roundtrip(plan);roundtrip(prepare(middle,to));
  }
});


test('read-only title projection requires a prepared dynamic dependency',()=>{
  const p=native(),before=JSON.stringify(p.graphicSpec),items=axisTitleAnimationItems(p,[],()=>{});
  assert.ok(items.some(item=>item.graphicId==='xAxisTitle'&&item.state.reason==='guide-layout'));
  assert.equal(JSON.stringify(p.graphicSpec),before);
});

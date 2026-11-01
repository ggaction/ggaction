import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan, transitionAxisLabels } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { prepareAnimationHitFrame } from "../../../src/interaction/hitProgram.js";
import { serializeProgram } from "../../../src/persistence.js";
import { parsePaintColor } from "../../../src/grammar/color.js";

const options = { durationMs: 100, easing: "linear" };
const prepare = (from,to,extra={}) => planTransition({from,to,options:{...options,...extra}});
const restored = plan => deserializeAnimation(serializeAnimation(plan)).plan;
const selected = frame => frame.scene.nodes.filter((_,i)=>frame.decisions[i]?.kernel==="native-axis-label");
const geometry = ownerKey => ({ target:{ownerKey}, property:"geometry", kernel:"native-progress",keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}] });
const paint = guideKey => ({target:{guideKey},property:"fill",kernel:"color",keyframes:[{timeMs:0,value:"black"},{timeMs:50,value:"red"},{timeMs:100,value:"black"}]});
function rows(width=400, labels={}) {
  return chart().createCanvas({width,height:500,margin:80}).createData({values:[{x:"AAAA BBBB",y:2},{x:"CCCC DDDD",y:3}]})
    .createBarPlot({x:"x",y:"y",guides:{axes:{x:{title:false,ticksAndLabels:{labels:{maxWidth:35,color:"black",...labels}}},y:{title:false}},legend:false}});
}
function responsive(width) {
  const values=Array.from({length:8},(_,i)=>({x:`Long category ${i}`,y:i+1}));
  return chart().createCanvas({width,height:600,margin:10,responsive:{minPlotSize:{width:40,height:40}}}).createData({values})
    .createBarPlot({x:"x",y:"y",guides:{axes:{x:{title:false,ticksAndLabels:{labels:{responsive:{maxLines:1},maxWidth:300}}},y:{title:false}},legend:false}});
}

test("public native axis groups sample current geometry with literal positions and exact endpoint references",()=>{
  const from=rows(400),to=from.editCanvas({width:600}),before=serializeProgram(from),plan=prepare(from,to),frame=sampleTransition(plan,50);
  assert.strictEqual(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.strictEqual(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
  assert.deepEqual(selected(frame).map(node=>[node.properties.text,node.properties.x,node.properties.y]),[["AAAA",165,438],["BBBB",165,452.4],["CCCC",335,438],["DDDD",335,452.4]]);
  const expected=from.editCanvas({width:500}).graphicSpec.objects.xAxisLabels.items;
  assert.deepEqual(selected(frame).map(node=>node.properties),expected.map(node=>({...node.properties,fontWeight:400})));
  assert.ok(frame.decisions.filter(d=>d.kind==="guide").every(d=>!Object.hasOwn(d,"sourceIndex")&&!Object.hasOwn(d,"targetIndex")));
  assert.deepEqual(sampleTransition(restored(plan),50),frame);assert.equal(serializeProgram(from),before);
});

test("responsive current raw membership changes without fabricated indices and keeps native hit metadata",()=>{
  const from=responsive(220),to=responsive(1400),plan=prepare(from,to),frame=sampleTransition(plan,50),state=animationFrameProvenance(frame).axislabels;
  assert.ok(from.graphicSpec.objects.xAxisLabels.items.length<selected(frame).length);
  assert.equal(state.groups[0].layout.values.length,8);
  const hit=prepareAnimationHitFrame(frame),dynamic=frame.decisions.flatMap((d,i)=>d.kind==="guide"?[frame.scene.nodes[i].key]:[]);
  assert.equal(hit.entries.filter(entry=>dynamic.includes(entry.nodeKey)).length,dynamic.length);
  assert.ok(hit.entries.filter(entry=>dynamic.includes(entry.nodeKey)).every(entry=>entry.metadata.ownerId==="x"&&entry.metadata.role==="axis-tick"&&entry.metadata.resourceRefs.length===0));
  assert.deepEqual(sampleTransition(restored(plan),50),frame);
});

test("empty nested native groups remain addressable by their exact owner clock",()=>{
  const labels={labelMap:[{value:"AAAA BBBB",label:""},{value:"CCCC DDDD",label:""}]};
  const from=hconcat({id:"panels",programs:[{id:"a",program:rows(400,labels)},{id:"b",program:rows()}]});
  const to=hconcat({id:"panels",programs:[{id:"a",program:rows(600,labels)},{id:"b",program:rows()}]});
  const ownerKey=JSON.stringify([["panels-a"],"x"]),plan=prepare(from,to,{tracks:[geometry(ownerKey)]}),frame=sampleTransition(plan,50),proof=animationFrameProvenance(frame);
  const group=proof.axislabels.groups.find(group=>group.scope.namespaces[0]==="panels-a");
  assert.equal(group.layout.frame.width,290);assert.equal(proof.axislabels.items.filter(item=>item?.group===0).length,0);
  assert.deepEqual(sampleTransition(restored(plan),50),frame);
  const rebase=prepare(frame,to);assert.strictEqual(sampleTransition(rebase,0),frame);assert.deepEqual(sampleTransition(restored(rebase),50),sampleTransition(rebase,50));
  assert.throws(()=>prepare(from,to,{tracks:[geometry(JSON.stringify([["panels-missing"],"x"]))]}),/no exact native owner/);
});

test("line-specific paint preserves current drawing and lowers only unproved raw style on rebase",()=>{
  const from=rows(),to=rows(600),ordinary=prepare(from,to),base=sampleTransition(ordinary,50),keys=base.decisions.filter(d=>d.kind==="guide").map(d=>d.guideKey);
  const plan=prepare(from,to,{tracks:[paint(keys[0])]}),frame=sampleTransition(plan,50),state=animationFrameProvenance(frame).axislabels;
  assert.equal(parsePaintColor(selected(frame)[0].properties.fill).r,1);assert.equal(selected(frame)[1].properties.fill,"black");
  assert.equal(state.groups[0].reason,"guide-edited");
  assert.deepEqual(sampleTransition(restored(plan),50),frame);
  const next=prepare(frame,to);assert.strictEqual(sampleTransition(next,0),frame);
  assert.equal(sampleTransition(next,50).decisions.filter(d=>d.kernel==="native-axis-label").length,0);
  assert.deepEqual(sampleTransition(restored(next),50),sampleTransition(next,50));
  const common=sampleTransition(prepare(from,to,{tracks:keys.map(paint)}),50);
  assert.equal(animationFrameProvenance(common).axislabels.groups[0].reason,undefined);
  assert.ok(selected(sampleTransition(prepare(common,to),50)).length>0);
});

test("current group meaning stays flat through repeated interruption and scheduled offline views",()=>{
  const from=rows(),to=rows(600);let frame=sampleTransition(prepare(from,to),40);
  for(let i=0;i<20;i++){
    const plan=prepare(frame,i%2?to:from);assert.strictEqual(sampleTransition(plan,0),frame);
    frame=sampleTransition(plan,35);const proof=animationFrameProvenance(frame);
    assert.equal(Object.hasOwn(proof,"plan"),false);assert.equal(proof.axislabels.groups.length,1);
    const next=prepare(frame,to);assert.deepEqual(sampleTransition(restored(next),50),sampleTransition(next,50));
  }
  const plan=prepare(from,to),frames=exportAnimationFrames(plan,{timesMs:[0,25,75,100]});
  assert.strictEqual(sampleTransition(prepare(frames[1],to),0),frames[1]);
  assert.deepEqual(exportAnimationFrames(restored(plan),{timesMs:[0,25,75,100]}),frames);
});

test("strict group transport rejects changed versions, source meaning, placement and dynamic decisions",()=>{
  const from=rows(),to=rows(600),plan=prepare(from,to),payload=exportTransitionPlan(plan);
  assert.equal(payload.kernels.guide,"native-guide-values@11");
  for(const change of [p=>p.kernels.guide="native-guide-values@10",p=>p.from.axislabels.groups[0].placement.geographicBefore=1,
    p=>p.from.axislabels.groups[0].placement.geographicBefore=-1,p=>p.from.axislabels.groups[0].placement.ordinal++,
    p=>p.from.axislabels.items.find(Boolean).line=99,p=>p.from.axislabels.groups[0].layout.values.reverse(),
    p=>p.from.axislabels.groups[0].presentation.styles[0].x=1]){const bad=structuredClone(payload);change(bad);assert.throws(()=>restoreTransitionPlan(bad));}
  const frame=sampleTransition(plan,50),transport=exportTransitionPlan(prepare(frame,to)),index=frame.decisions.findIndex(d=>d.kind==="guide");
  for(const [mutation,change] of [p=>p.from.view.decisions[index].sourceIndex=0,p=>p.from.view.decisions[index].guideKey="fake",p=>p.from.view.decisions[index].role="mark",
    p=>p.from.scene.nodes[index].properties.text="changed",p=>p.from.axislabels.items[index]=null,p=>p.from.guides[index]=null,
    p=>p.from.guides[index].identity.line++,p=>{p.from.axislabels.groups[0].reason="guide-edited";p.from.scene.nodes[index].properties.x++;},
    p=>{p.from.axislabels.groups[0].reason="guide-edited";p.from.scene.nodes[index].properties.fontSize++;},
    p=>{p.from.axislabels.groups[0].reason="guide-edited";p.from.scene.nodes[index].offset=[p.from.scene.nodes[index].offset[0]+1,p.from.scene.nodes[index].offset[1]];}].entries()){const bad=structuredClone(transport);change(bad);assert.throws(()=>restoreTransitionPlan(bad),`Mutation ${mutation} must fail.`);}
});

test("changed label content, policy and direct concrete edits retain explicit fallback",()=>{
  const from=rows(),first=from.graphicSpec.objects.xAxisLabels.items[0].id;
  for(const to of [rows(600,{wrap:"character"}),rows(600,{labelMap:[{value:"AAAA BBBB",label:"new"}]}),from.editGraphics({target:first,property:"x",value:100})]){
    const plan=prepare(from,to),frame=sampleTransition(plan,50);
    assert.equal(selected(frame).length,0);assert.ok(frame.decisions.some(d=>d.kind==="crossfade"&&d.guideKey));
    assert.deepEqual(sampleTransition(restored(plan),50),frame);
  }
  assert.equal(transitionAxisLabels(prepare(from,rows(600))).state.groups.length,1);
});

test("native responsive wrapping changes line count at the current sampled width using independent measurements",()=>{
  const text="AAAA BBBB",texts=new Set([""]);
  for(let i=0;i<text.length;i++)for(let j=i+1;j<=text.length;j++)texts.add(text.slice(i,j));
  const profile={schemaVersion:1,id:"literal",measurements:[...texts].map(text=>({text,fontFamily:"Fixture",fontSize:10,fontWeight:400,fontStyle:"normal",width:text.length*5}))};
  const make=width=>chart().createCanvas({width,height:300,margin:50,responsive:{minPlotSize:{width:20,height:40}}})
    .createData({values:[{x:0,y:0},{x:2,y:2}]}).createPointMark().encodeX({field:"x",scale:{domain:[0,2],nice:false}}).encodeY({field:"y"}).applyTextMetrics({profile})
    .createXAxis({title:false,ticksAndLabels:{values:[0,1,2],labels:{fontFamily:"Fixture",fontSize:10,labelMap:[0,1,2].map(value=>({value,label:text})),responsive:{maxLines:2}}}});
  const from=make(140),to=make(260),plan=prepare(from,to),frame=sampleTransition(plan,50);
  assert.equal(from.graphicSpec.objects.xAxisLabels.items.length,6);assert.equal(selected(frame).length,3);
  assert.deepEqual(selected(frame).map(node=>[node.properties.text,node.properties.x,node.properties.y]),[[text,50,268],[text,100,268],[text,150,268]]);
  assert.deepEqual(selected(frame).map(node=>node.properties),make(200).graphicSpec.objects.xAxisLabels.items.map(item=>({...item.properties,fontWeight:400})));
  assert.deepEqual(sampleTransition(restored(plan),50),frame);
  const backwards=prepare(to,from),expanded=sampleTransition(backwards,90);
  assert.equal(selected(expanded).length,6);assert.deepEqual(sampleTransition(restored(backwards),90),expanded);
});

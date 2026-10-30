import test from 'node:test';
import assert from 'node:assert/strict';
import {hconcat} from '../../../src/index.js';
import {ChartProgram} from '../../../src/core/ChartProgram.js';
import {projectAnimationEndpoint} from '../../../src/animation/endpoints.js';
import {projectPartitionAnimations as project} from '../../../src/materialization/animation/partition.js';
import {preparePartitionAnimationState as prepare,samplePartitionAnimationState as sample} from '../../../src/grammar/animation/partitionState.js';
import {partitionFrameEndpoints} from '../../support/partition-frames.js';
const projection=p=>project(p,projectAnimationEndpoint(p));

test('native partition projection joins exact visible body and label roles to stored hierarchy intervals',()=>{
 const {before,after}=partitionFrameEndpoints({padding:[2,4]});
 const a=projection(before),b=projection(after),saved=structuredClone([before.graphicSpec,after.graphicSpec]);
 for(const value of [a,b]){
  assert.equal(value.groups.length,1);assert.equal(value.items.filter(Boolean).length,10);
  assert.equal(value.items.filter(item=>item?.reason).length,0);
  const group=value.groups[0];assert.equal(group.meaning.state.nodes.length,6);assert.equal(group.layout.id,'l');assert.equal(group.hierarchy.id,'h');
  assert.deepEqual(group.meaning.state.frame.gap,[2,4]);assert.ok(Object.isFrozen(group.meaning.state.nodes));
  const keys=new Set(group.meaning.state.nodes.map(node=>node.key));
  for(const item of value.items.filter(Boolean))assert.ok(keys.has(item.key));
 }
 const plan=prepare(a.groups[0].meaning,b.groups[0].meaning);assert.equal(plan.track.mode,'partition');assert.equal(sample(plan,.5).state.state.bend,.5);
 assert.deepEqual([before.graphicSpec,after.graphicSpec],saved);
});
test('repeated placement of the same child preserves separate exact hierarchy namespaces',()=>{
 const {before}=partitionFrameEndpoints({labels:false}),p=hconcat({id:'comparison',programs:[{id:'left',program:before},{id:'right',program:before}]}),x=projection(p);
 assert.equal(x.groups.length,2);assert.equal(x.items.filter(Boolean).length,10);
 assert.notEqual(x.groups[0].id,x.groups[1].id);
 assert.deepEqual(x.groups.map(g=>JSON.parse(g.meaning.state.nodes[0].key)[0]),[['comparison-left'],['comparison-right']]);
 for(const item of x.items.filter(Boolean))assert.ok(x.groups[item.group].meaning.state.nodes.some(node=>node.key===item.key));
 const nested=hconcat({id:'outer',programs:[{id:'twice',program:p},{id:'again',program:before}]}),y=projection(nested);
 assert.equal(y.groups.length,3);assert.deepEqual(JSON.parse(y.groups[0].meaning.state.nodes[0].key)[0],['outer-twice','comparison-left']);
});
test('concrete edits and foreign roles retain explicit fallback while stale and absent native grain fail',()=>{
 const {before}=partitionFrameEndpoints();
 const edit=fn=>{const g=structuredClone(before.graphicSpec);fn(g.objects.partitionPlot.items);return before._clone({graphicSpec:g});};
 const changed=edit(items=>{items[0].properties.x+=1;});assert.equal(projection(changed).items.find(i=>i?.reason).reason,'partition-edited-geometry');
 const role=edit(items=>{items[0].identity.role='foreign';});assert.equal(projection(role).items.find(i=>i?.reason).reason,'primitive-role');
 const stale=edit(items=>{items[0].identity.lineage.resource.revision+=1;});assert.throws(()=>projection(stale),/stale|revision/);
 const absent=edit(items=>{const key=JSON.parse(items[0].identity.key);key[3][1]='missing-node';items[0].identity.key=JSON.stringify(key);});assert.throws(()=>projection(absent),/visible grain/);
 const graphicOnly=new ChartProgram({graphicSpec:before.graphicSpec});assert.deepEqual(projection(graphicOnly).groups,[]);
});

test('focus, hidden root, automatic radii and unrelated mark owners keep their exact stored grain',()=>{
 const {before,after}=partitionFrameEndpoints();
 for(const p of [before.editPartitionPlot({focus:{key:'A'}}),before.editPartitionPlot({rootVisible:false}),after.editPartitionPlot({outerRadius:'auto'})]){
  const x=projection(p);assert.equal(x.groups.length,1);assert.ok(x.items.some(Boolean));assert.equal(x.items.filter(v=>v?.reason).length,0);
 }
 const p=before.createPointMark({id:'dots'}).encodeX({field:'value'}).encodeY({field:'value'}),x=projection(p);
 assert.equal(x.groups.length,1);assert.equal(x.items.filter(Boolean).length,10);
 const other=before.layoutHierarchy({id:'other',method:'partition'}),g=structuredClone(other.graphicSpec);
 g.objects.partitionPlot.items[0].identity.lineage.resource={kind:'layout',id:'other',revision:0};
 assert.throws(()=>projection(other._clone({graphicSpec:g})),/exact native layout/);
 const changed=structuredClone(before.graphicSpec),body=changed.objects.partitionPlot.items[0],{x:px,y,width,height,...paint}=body.properties;
 body.type='path';body.properties={...paint,commands:[{op:'M',x:px,y},{op:'L',x:px+width,y},{op:'L',x:px+width,y:y+height},{op:'Z'}]};
 assert.equal(projection(before._clone({graphicSpec:changed})).items.find(v=>v?.reason).reason,'partition-edited-geometry');
});

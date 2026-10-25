import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { legendBlockChannels } from '../../../../src/grammar/legendBlocks.js';

const values = [{x:1,y:2,g:'A',n:4},{x:2,y:3,g:'B',n:16},{x:3,y:4,g:'A',n:9}];
const base = () => chart().createCanvas({plot:{width:260,height:260},margin:180})
  .createData({id:'data',values}).createScatterPlot({id:'plot',x:'x',y:'y',color:{field:'g',fieldType:'nominal'}});
const channels = p => Object.entries(p.guideConfigs.legend ?? {}).flatMap(([kind,config])=>legendBlockChannels(kind,config)).sort();
const roundtrip = p => deserializeProgram(serializeProgram(p));
const auto = p => p.createGuides({legend:{target:'plot',channels:['color']}});

test('automatic suppression is opt-in, immutable, serialized, and explicitly reversible',()=>{
  const p=auto(base()), original=serializeProgram(p);
  for(const suppress of [undefined,false]) assert.deepEqual(channels(auto(p.removeLegend({suppress}))),['color']);
  const options={target:'plot',channels:['color'],suppress:true};
  const q=p.removeLegend(options); options.channels.push('size');
  assert.deepEqual(q.guideConfigs.suppressedLegends.plot.channels,['color']);
  assert.deepEqual(q.semanticSpec.layers,p.semanticSpec.layers);
  assert.deepEqual(q.resolvedScales,p.resolvedScales);
  assert.deepEqual(channels(auto(roundtrip(q).editCanvas({plot:{width:280,height:280}}).encodeOpacity({target:'plot',value:.4}))),[]);
  assert.deepEqual(channels(q.createGuides()),[]);
  const restored=q.createLegend({target:'plot',channels:['color']});
  assert.deepEqual(channels(restored),['color']);
  assert.equal(restored.guideConfigs.suppressedLegends?.plot,undefined);
  assert.deepEqual(serializeProgram(p),original);
});

test('partial categorical removal suppresses only departing channels and permits newly encoded guides',()=>{
  const p=base().encodeShape({target:'plot',field:'g'}).encodeSize({target:'plot',field:'n'})
    .createLegend({target:'plot',channels:['color','shape','size']});
  const q=p.removeLegend({channels:['color'],suppress:true});
  assert.deepEqual(channels(q),['shape','size']);
  assert.deepEqual(channels(auto(roundtrip(q))),['shape','size']);
  const next=q.encodeOpacity({target:'plot',field:'n'}).createGuides({legend:{target:'plot',channels:['opacity']}});
  assert.deepEqual(channels(next),['opacity','shape','size']);
  assert.deepEqual(next.guideConfigs.suppressedLegends.plot.channels,['color']);
  const removed=p.removeLegend({suppress:true});
  assert.deepEqual(channels(removed.createGuides()),[]);
  assert.deepEqual(channels(removed.createLegend({channels:['color']})),['color']);
  assert.deepEqual(removed.createLegend({channels:['color']}).guideConfigs.suppressedLegends.plot.channels,['shape','size']);
});

test('gradient, opacity, and fused blocks record actual removed ownership',()=>{
  const p=base().encodeColor({target:'plot',field:'n',fieldType:'quantitative'}).encodeOpacity({target:'plot',field:'n'})
    .createLegend({channels:['color','opacity']});
  const q=p.removeLegend({channels:['color'],suppress:true});
  assert.deepEqual(channels(auto(q)),['opacity']);
  const combined=base().encodeShape({target:'plot',field:'g'}).encodeSize({target:'plot',field:'g',fieldType:'nominal'})
    .createLegend({channels:['size','shape'],combine:'size-shape'});
  const removed=combined.removeLegend({channels:['shape'],suppress:true});
  assert.deepEqual([...removed.guideConfigs.suppressedLegends.plot.channels].sort(),['shape','size']);
});

for(const timing of ['before','after']) test(`shared facets retain suppression ${timing} faceting, source replay and persistence`,()=>{
  const p=auto(base()), facet=p=>p.facet({field:'g',columns:2,guides:{legend:'shared'}});
  const q=timing==='before'?facet(p.removeLegend({suppress:true})):facet(p).removeLegend({suppress:true});
  const r=auto(roundtrip(q)).editFacetSource({action:{method:'encodeOpacity',options:{target:'plot',value:.4}}});
  assert.deepEqual(channels(r),[]);
  assert.ok(Object.values(r.children).every(child=>child.guideConfigs.suppressedLegends.plot.channels.includes('color')));
  const restored=r.editFacetSource({action:{method:'createLegend',options:{target:'plot',channels:['color']}}});
  assert.deepEqual(channels(restored),['color']);
});

test('facet partial deletion keeps shape and newly introduced sampled channels',()=>{
  const p=base().encodeShape({field:'g'}).createLegend({channels:['color','shape']})
    .facet({field:'g',columns:2,guides:{legend:'shared'}});
  const q=p.removeLegend({channels:['color'],suppress:true});
  assert.deepEqual(channels(q),['shape']);
  assert.deepEqual(channels(auto(roundtrip(q))),['shape']);
});

test('explicit child targets isolate deletion and survive composition rematerialization',()=>{
  const p=auto(base()).createAdjacentPlot({id:'second',source:'plot',position:'right',
    plot:{action:'createScatterPlot',options:{x:'x',y:'y',color:{field:'g',fieldType:'nominal'}}}})
    .createGuides({target:[{childPath:['second']}],legend:{channels:['color']}});
  const q=p.removeLegend({target:[{childPath:['plot'],id:'plot'}],channels:['color'],suppress:true});
  const r=roundtrip(q).createGuides({target:[{childPath:['plot']}],legend:{channels:['color']}});
  assert.deepEqual(channels(r.children.plot),[]);
  assert.deepEqual(channels(r.children.second),['color']);
  assert.deepEqual(channels(p.children.plot),['color']);
});

test('invalid requests reject atomically and mark removal clears suppression',()=>{
  const p=auto(base()), snapshot=serializeProgram(p);
  for(const args of [{suppress:'yes'},{suppress:true,channels:[]},{suppress:true,channels:['size']},{suppress:true,target:'missing'}]) assert.throws(()=>p.removeLegend(args));
  assert.deepEqual(serializeProgram(p),snapshot);
  const q=p.removeLegend({suppress:true});
  assert.equal(q.removeMark({target:'plot'}).guideConfigs.suppressedLegends?.plot,undefined);
  assert.deepEqual(channels(roundtrip(q)),[]);
});

test('authored facet guide deletion cannot resurrect through source edits or explicit guide refresh',()=>{
  const p=auto(base()).facet({field:'g',columns:2,guides:{legend:{target:'plot',channels:['color'],title:'Groups'}}});
  const q=p.removeLegend({suppress:true});
  assert.deepEqual(channels(auto(roundtrip(q))),[]);
  const r=q.editFacetSource({action:{method:'createLegend',options:{channels:['color']}}});
  assert.deepEqual(channels(r),['color']);
});

test('suppressed guides do not require room for the removed legend',()=>{
  const q=auto(base()).removeLegend({suppress:true}).editCanvas({plot:{width:200,height:200},margin:{left:80,bottom:80,right:1,top:1}});
  assert.deepEqual(channels(auto(q)),[]);
});

test('explicit source restoration rejoins an authored facet legend without resetting retained styles',()=>{
  const p=base().encodeShape({field:'g'}).createLegend({channels:['color','shape']})
    .facet({field:'g',columns:2,guides:{legend:{target:'plot',channels:['color','shape'],labels:{fontSize:17}}}});
  const q=p.removeLegend({channels:['color'],suppress:true});
  const r=q.editFacetSource({action:{method:'createLegend',options:{channels:['color']}}});
  assert.deepEqual(channels(r),['color','shape']);
  assert.equal(r.guideConfigs.legend.series.labels.fontSize,17);
});

test('malformed persisted suppression is rejected rather than silently disabling arbitrary guides',()=>{
  const p=auto(base()).removeLegend({suppress:true});
  for(const invalid of [[],{plot:{}},{missing:{channels:['color']}},{plot:{channels:[]}},{plot:{channels:['x']}},{plot:{channels:['color','color']}},{plot:{channels:['color'],extra:true}}]) {
    const malformed=p._clone({materializationConfigs:{...p.materializationConfigs,guides:{...p.guideConfigs,suppressedLegends:invalid}}});
    assert.throws(()=>roundtrip(malformed));
  }
});

test('faceting after deletion can infer a new size legend without recreating color',()=>{
  const q=auto(base()).removeLegend({suppress:true}).encodeSize({field:'n'})
    .facet({field:'g',columns:2,guides:{legend:'shared'}});
  assert.deepEqual(channels(q),['size']);
});

test('facet automatic inference filters suppressed color before creating new categorical owners',()=>{
  for (const channel of ['shape','stroke']) {
    const p=base().encodeColor({field:'n',fieldType:'quantitative'})
      .createLegend({channels:['color']}).removeLegend({channels:['color'],suppress:true});
    const q=p[channel==='shape'?'encodeShape':'encodeStroke']({field:'g',fieldType:'nominal'})
      .facet({field:'g',columns:2,guides:{legend:'shared'}});
    assert.deepEqual(channels(q),[channel]);
    assert.deepEqual(channels(roundtrip(q)),[channel]);
    assert.ok(Object.values(q.children).every(child=>child.guideConfigs.suppressedLegends.plot.channels.includes('color')));
  }
});

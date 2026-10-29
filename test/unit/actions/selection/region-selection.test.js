import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { chart as basicChart } from '../../../../src/basic.js';
import { getMarkItems } from '../../../../src/inspection.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { decodeValue, encodeValue } from '../../../../src/persistence/codec.js';
import { resolveStoredSelection } from '../../../../src/materialization/selection/state.js';
const values = [{x:1,y:2,g:'A'},{x:1,y:7,g:'A'},{x:3,y:6,g:'B'}];
const base = () => chart().createCanvas({width:300,height:240,margin:40}).createData({id:'rows',values})
  .createScatterPlot({id:'points',x:'x',y:'y',guides:false});
const keys = p => getMarkItems(p,{target:'points'}).map(item=>item.key);
const selected = p => resolveStoredSelection(p,'picked').keys;
const resource = p => p.semanticSpec.resources.find(r=>r.kind==='persistent-selection'&&r.id==='picked');
const polygon = [{x:10,y:10},{x:20,y:10},{x:20,y:20}];
const region = {x:{ranges:[{min:0,max:2}]},y:{ranges:[{min:0,max:5}]}};

test('native region selectors retain channel intersection intent and update dependent consumers',()=>{
 const p=base(),before=serializeProgram(p),k=keys(p);
 const q=p.selectMarks({id:'picked',target:'points',region}).highlightMarks({selection:'picked',color:'red',bringToFront:false})
  .createMarkLabels({id:'labels',source:'points',field:'g',selection:'picked'});
 assert.deepEqual(selected(q),[k[0]]);
 assert.deepEqual(resource(q).options,{mode:'predicate',predicate:{region:{x:{ranges:[{min:0,max:2,minInclusive:true,maxInclusive:true}]},y:{ranges:[{min:0,max:5,minInclusive:true,maxInclusive:true}]}}}});
 const next=q.editMarkSelection({selection:'picked',region:{x:{ranges:[{min:0,max:2}]},y:{ranges:[{min:5,max:10}]}}});
 assert.deepEqual(selected(next),[k[1]]);
 assert.deepEqual(getMarkItems(next,{target:'labels'}).map(item=>item.fields.g),['A']);
 assert.deepEqual(getMarkItems(next,{target:'points'}).filter(item=>item.properties.fill==='red').map(item=>item.fields.y),[7]);
 assert.equal(resource(next).revision,1);assert.equal(serializeProgram(p),before);
 assert.deepEqual(selected(deserializeProgram(serializeProgram(next))),[k[1]]);
 const inline = p.highlightMarks({id:'picked',target:'points',select:{region},color:'red',bringToFront:false});
 assert.deepEqual(selected(inline),[k[0]]);
 assert.equal(typeof basicChart().selectMarks,'undefined');
});

test('regions select aggregated channel values rather than ambiguous raw member fields',()=>{
 const p=chart().createCanvas({width:360,height:240,margin:40}).createData({id:'rows',values})
  .createBarPlot({id:'bars',x:'g',y:{field:'y',aggregate:'sum'},guides:false});
 const items=getMarkItems(p,{target:'bars'});
 const q=p.selectMarks({id:'picked',target:'bars',region:{x:{values:['A']},y2:{ranges:[{min:8,max:10}]}}});
 assert.deepEqual(selected(q),[items[0].key]);
 assert.deepEqual(items[0].channels.y2,9);
 assert.equal(Object.hasOwn(items[0].fields,'y'),false);
});

test('lasso polygon metadata preserves exact key meaning through resize, filter and restoration',()=>{
 const p=base(),k=keys(p),input=structuredClone(polygon),q=p.selectMarks({id:'picked',items:[k[1]],screenPolygon:input});
 input[0].x=900;
 assert.deepEqual(resource(q).options.screenPolygon,polygon);
 const resized=q.editCanvas({width:600,height:480});
 assert.deepEqual(selected(resized),[k[1]]);assert.deepEqual(resource(resized).options.screenPolygon,polygon);
 const hidden=resized.filterMarks({target:'points',field:'g',op:'eq',value:'B'});
 assert.deepEqual(selected(hidden),[]);
 const restored=deserializeProgram(serializeProgram(hidden)).removeMarkFilter({target:'points'});
 assert.deepEqual(selected(restored),[k[1]]);assert.deepEqual(resource(restored).options.screenPolygon,polygon);
 const edited=q.editMarkSelection({selection:'picked',mode:'add',items:[k[2]],screenPolygon:[]});
 assert.deepEqual(selected(edited),[k[1],k[2]]);assert.deepEqual(resource(edited).options.screenPolygon,[]);
 const replaced=edited.editMarkSelection({selection:'picked',region});
 assert.equal(Object.hasOwn(resource(replaced).options,'screenPolygon'),false);assert.deepEqual(selected(replaced),[k[0]]);
});

test('region edits refresh exact conditional resource revisions and preserve empty predicates',()=>{
 const p=base().selectMarks({id:'picked',region}).encodeOpacity({target:'points',conditions:[{when:{selection:'picked'},value:{value:.25}}],otherwise:{value:1}});
 assert.deepEqual(getMarkItems(p,{target:'points'}).map(item=>item.properties.opacity),[.25,1,1]);
 const q=p.editMarkSelection({selection:'picked',region:{x:{values:[]}}});
 assert.deepEqual(selected(q),[]);assert.deepEqual(getMarkItems(q,{target:'points'}).map(item=>item.properties.opacity),[1,1,1]);
 assert.equal(q.semanticSpec.layers[0].conditionals.opacity.selectionInputs[0].revision,1);
 assert.deepEqual(selected(deserializeProgram(serializeProgram(q))),[]);
});

test('malformed region and polygon snapshots fail atomically without repairing stored metadata',()=>{
 const p=base().selectMarks({id:'picked',region}),before=serializeProgram(p);
 for(const request of [{region,items:[]},{region:{x:{ranges:[{min:NaN,max:2}]}}},{screenPolygon:polygon},{items:[],screenPolygon:[{x:0,y:Infinity}]},{region:{theta:{ranges:[]}}}]){
  assert.throws(()=>p.editMarkSelection({selection:'picked',...request}));assert.equal(serializeProgram(p),before);
 }
 for(const [program,mutate] of [[p,o=>{delete o.predicate.region.x.ranges[0].minInclusive;}],
  [p,o=>{o.predicate.region.x.ranges[0].min='a';}],
  [base().selectMarks({id:'picked',items:[],screenPolygon:polygon}),o=>{o.screenPolygon.push(o.screenPolygon[0]);}],
  [base().selectMarks({id:'picked',items:[],screenPolygon:polygon}),o=>{o.screenPolygon[0].extra=true;}]]){
  const envelope=JSON.parse(serializeProgram(program)),state=decodeValue(envelope.payload);mutate(state.semanticSpec.resources.find(r=>r.id==='picked').options);
  envelope.payload=encodeValue(state);assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
 }
 assert.throws(()=>p.filterMarks({target:'points',region}));
 assert.throws(()=>p.createMarkLabels({source:'points',field:'g',select:{region}}));
});

test('angular metadata remains own-data and malformed stored endpoint tuples fail load',()=>{
 const p=base(), k=keys(p), input=[0,Math.PI], q=p.selectMarks({id:'picked',items:[k[0]],screenAngles:input});
 input[0]=2;assert.deepEqual(resource(q).options.screenAngles,[0,Math.PI]);
 assert.deepEqual(selected(deserializeProgram(serializeProgram(q))),[k[0]]);
 assert.equal(resource(q.editMarkSelection({selection:'picked',items:[]})).options.screenAngles,undefined);
 let reads=0;const bad=[0,1];Object.defineProperty(bad,'0',{get(){reads++;return 0;},enumerable:true});
 assert.throws(()=>q.editMarkSelection({selection:'picked',items:[],screenAngles:bad}),/own data/);assert.equal(reads,0);
 for(const mutate of [o=>{o.screenAngles=[0,2*Math.PI];},o=>{o.screenAngles=[0];},o=>{o.screenPolygon=[];}]){
  const envelope=JSON.parse(serializeProgram(q)),state=decodeValue(envelope.payload);mutate(state.semanticSpec.resources.find(r=>r.id==='picked').options);
  envelope.payload=encodeValue(state);assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
 }
});

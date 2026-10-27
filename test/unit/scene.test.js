import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../src/index.js';
import { createTransitionScene } from '../../src/scene.js';
import { renderToSVG } from '../../src/renderers/svg.js';
const rows=[{x:1,y:3,c:'a'},{x:2,y:5,c:'b'},{x:1,y:3,c:'a'}];
const base=()=>chart().createCanvas({plot:{width:300,height:250},margin:{left:70,right:160,top:30,bottom:70}}).createData({id:'d',values:rows});
const scatter=()=>base().createScatterPlot({id:'p',data:'d',x:{field:'x'},y:{field:'y'}}).createGuides();
const points=s=>s.nodes.filter(n=>n.type==='circle');
test('scene is immutable, cloneable, cached and preserves native primitive count',()=>{
 const p=scatter(),before=JSON.stringify(p),s=createTransitionScene(p);
 assert.equal(s.version,1);assert.equal(s,createTransitionScene(p));assert.deepEqual(structuredClone(s),s);
 assert.equal(points(s).length,3);assert.equal(new Set(s.nodes.map(n=>n.key)).size,s.nodes.length);
 assert.equal(JSON.stringify(p),before);assert.throws(()=>s.nodes.push({}));
 assert.equal((renderToSVG(p).match(/<circle /g)??[]).length,points(s).length);
});
test('style changes retain correspondence, including duplicate records',()=>{
 const p=scatter(),q=p.encodeColor({target:'p',value:'#ff0000'}).encodeSize({target:'p',value:80});
 assert.deepEqual(points(createTransitionScene(p)).map(n=>n.key),points(createTransitionScene(q)).map(n=>n.key));
 assert.notEqual(points(createTransitionScene(p))[0].svg,points(createTransitionScene(q))[0].svg);
});
test('filtering preserves identity while facet child paths create distinct scene identities',()=>{
 const p=scatter(),a=points(createTransitionScene(p));
 const q=p.filterData({id:'f',source:'d',field:'c',oneOf:['b']}).rebindLayerData({id:'p',data:'f'}).rematerializePointMark({id:'p'});
 const b=points(createTransitionScene(q));assert.equal(b.length,1);assert.equal(b[0].key,a[1].key);
 const f=points(createTransitionScene(p.facet({field:'c',data:'d',columns:2})));
 assert.equal(f.length, a.length);
 assert.ok(f.every(node => !a.some(original => original.key === node.key)));
 assert.ok(f.some(n=>n.offset[0]!==a[0].offset[0]));
});
test('bar aggregation and pie arcs produce concrete transferable nodes',()=>{
 for(const p of [base().createBarPlot({id:'p',data:'d',x:{field:'c',fieldType:'nominal'},y:{field:'y',aggregate:'mean'}}),base().createPiePlot({id:'p',data:'d',category:{field:'c'},value:'y',aggregate:'sum'})]){
  const s=createTransitionScene(p.createGuides());assert.ok(s.nodes.length>3);assert.ok(s.nodes.every(n=>n.svg.startsWith('<')));
 }
});
test('invalid inputs fail without mutating a chart',()=>assert.throws(()=>createTransitionScene({}),/ChartProgram/));

test('row ordering changes preserve identities instead of pairing array positions',()=>{
 const p=scatter();
 const q=p.reviseData({source:'d',id:'next',values:[rows[1],rows[0],rows[2]],rowMap:[1,0,2]});
 const a=points(createTransitionScene(p)),b=points(createTransitionScene(q));
 assert.equal(a[1].key,b[0].key);assert.equal(a[0].key,b[1].key);assert.equal(a[2].key,b[2].key);
});

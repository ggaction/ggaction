import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFacetLayout} from '../../../src/layout/facets.js';
import {assertFacetTopLaneBounds} from '../../../src/layout/facetTopLane.js';

const children=['a','b','c'].map(id=>({id,width:136,height:262}));
const plots=children.map(({id})=>({id,x:40,y:43,width:40,height:200}));
const options={children,plots,columns:2,spacing:'plot',gap:22,titleHeight:19,
  padding:{top:7,bottom:3,left:5,right:9},
  headerLayout:{outer:{top:2,left:4},cellRows:{top:[20,20],bottom:[0,0]}}};

test('shared top lane subtracts only the outside title/header allocation and preserves row gaps',()=>{
  const saved=structuredClone(options),stacked=resolveFacetLayout(options);
  assert.deepEqual(resolveFacetLayout({...options,topLane:'stacked'}),stacked);
  assert.deepEqual(resolveFacetLayout({...options,topLane:undefined}),stacked);
  const shared=resolveFacetLayout({...options,topLane:'shared'});
  assert.equal(stacked.height-shared.height,41);
  assert.equal(shared.width,stacked.width);
  assert.equal(shared.titleHeight,19);
  assert.deepEqual(shared.children.map(p=>p.y),[7,7,229]);
  assert.deepEqual(shared.children.map(p=>[p.width,p.height]),[[136,262],[136,262],[136,262]]);
  assert.deepEqual(shared.children.map(p=>p.x),stacked.children.map(p=>p.x));
  assert.deepEqual(options,saved);
  assert.ok(Object.isFrozen(shared));
  assert.throws(()=>resolveFacetLayout({...options,gap:19,topLane:'shared'}),/too small for the facet headers/);
});

test('top lane vocabulary is closed and sharing requires plot spacing',()=>{
  for(const topLane of [null,false,true,0,1,'auto','Shared',''])
    assert.throws(()=>resolveFacetLayout({...options,topLane}),/Facet topLane/);
  assert.throws(()=>resolveFacetLayout({...options,spacing:'canvas',topLane:'shared'}),/requires spacing/);
});

test('final logical text bounds reject canvas, plot, title/header and retained-text intersections',()=>{
  const rect=(left,top,right,bottom)=>({left,top,right,bottom});
  const input={canvas:{width:200,height:100},titles:[rect(20,3,80,15)],
    headers:[rect(20,20,80,32)],retained:[rect(0,36,15,48)],plots:[rect(20,43,180,80)]};
  assert.doesNotThrow(()=>assertFacetTopLaneBounds(input));
  assert.throws(()=>assertFacetTopLaneBounds({...input,titles:[rect(-1,3,80,15)]}),/does not fit/);
  assert.throws(()=>assertFacetTopLaneBounds({...input,titles:[rect(20,20,80,31)]}),/overlaps a facet header/);
  assert.throws(()=>assertFacetTopLaneBounds({...input,headers:[rect(20,42,80,46)]}),/overlaps a child plot/);
  assert.throws(()=>assertFacetTopLaneBounds({...input,retained:[rect(30,25,45,45)]}),/retained chart text/);
});

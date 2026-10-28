import assert from "node:assert/strict";import test from "node:test";
import {normalizeHierarchyNodes} from "../../../src/grammar/hierarchy/normalize.js";
import {encodeRowKey} from "../../../src/core/itemIdentity.js";
import {createPartitionView,recoverPartitionFocus,partitionNavigation} from "../../../src/grammar/hierarchy/partitionView.js";
const rows=[{key:"root",parentKey:null,value:10},{key:"A",parentKey:"root",value:6},{key:"A1",parentKey:"A",value:2},{key:"A2",parentKey:"A",value:4},{key:"B",parentKey:"root",value:4}];
const make=values=>normalizeHierarchyNodes(values),key=(model,label)=>encodeRowKey(label);
test("focuses normalized intervals without changing keys, weights or input",()=>{
 const model=make(rows),before=structuredClone(model),focus=key(model,"A"),view=createPartitionView(model,{focusKey:focus});
 assert.deepEqual(model,before);assert.deepEqual(view.nodes.map(n=>[n.u0,n.u1,n.depth]),[[0,1,0],[0,1/3,1],[1/3,1,1]]);
 assert.deepEqual(view.nodes.map(n=>n.key),model.nodes.slice(1,4).map(n=>n.key));assert.deepEqual(view.nodes.map(n=>n.totalValue),[6,2,4]);
 assert.deepEqual(view.breadcrumbKeys,[model.rootKey]);assert.equal(view.levels,2);assert.ok(Object.isFrozen(view.nodes[0].sourceRows));
 const hidden=createPartitionView(model,{focusKey:focus,rootVisible:false});assert.equal(hidden.nodes[0].visible,false);assert.deepEqual(hidden.nodes.slice(1).map(n=>[n.v0,n.v1]),[[0,1],[0,1]]);
});
test("retains empty, zero-value and synthetic forest metadata",()=>{
 const empty=make([]);assert.deepEqual(createPartitionView(empty).diagnostics,{emptyHierarchy:true,emptyValue:true,emptyChildrenView:true});
 const zero=make([{key:"r",parentKey:null,value:0},{key:"z",parentKey:"r",value:0}]);const view=createPartitionView(zero);assert.ok(view.nodes.every(n=>n.u0===0&&n.u1===0));assert.equal(view.diagnostics.emptyValue,true);
 const only=make([{key:"r",parentKey:null,value:1}]);assert.equal(createPartitionView(only,{rootVisible:false}).levels,0);assert.equal(createPartitionView(only,{rootVisible:false}).diagnostics.emptyChildrenView,true);
 const forest=normalizeHierarchyNodes([{key:1,parentKey:null,value:2},{key:"1",parentKey:null,value:3}],{forest:true});const trees=createPartitionView(forest);assert.equal(trees.nodes[0].visible,false);assert.equal(trees.levels,1);assert.deepEqual(trees.nodes.slice(1).map(n=>[n.u0,n.u1]),[[0,.4],[.4,1]]);
});
test("recovers nearest surviving ancestors and preserves navigation order",()=>{
 const previous=make(rows),a=key(previous,"A"),a1=key(previous,"A1"),a2=key(previous,"A2");
 assert.equal(recoverPartitionFocus(previous,previous,a1).reason,"retained");
 const next=make(rows.filter(r=>r.key!=="A1"));assert.deepEqual(recoverPartitionFocus(previous,next,a1),{previousFocusKey:a1,focusKey:a,reason:"ancestor"});
 const different=make([{key:"next",parentKey:null,value:1}]);assert.equal(recoverPartitionFocus(previous,different,a1).reason,"root");assert.equal(recoverPartitionFocus(previous,make([]),a1).reason,"empty");
 assert.deepEqual(partitionNavigation(previous,a1),{key:a1,parent:a,firstChild:null,previousSibling:null,nextSibling:a2,root:previous.rootKey});assert.equal(partitionNavigation(previous,a2).previousSibling,a1);assert.equal(partitionNavigation(previous).firstChild,a);
 assert.equal(partitionNavigation(make([])).root,null);assert.equal(recoverPartitionFocus(make([]),different).focusKey,different.rootKey);
});
test("rejects unsupported keys, option shapes and getter-backed input before evaluation",()=>{
 const model=make(rows);for(const bad of[null,1,""]){assert.throws(()=>createPartitionView(model,{focusKey:bad}),/key/);assert.throws(()=>recoverPartitionFocus(model,model,bad),/key/);assert.throws(()=>partitionNavigation(model,bad),/key/);}
 assert.throws(()=>createPartitionView(model,{focusKey:"missing"}),/Unknown/);assert.throws(()=>recoverPartitionFocus(model,model,"missing"),/Unknown/);assert.throws(()=>partitionNavigation(model,"missing"),/Unknown/);
 assert.throws(()=>createPartitionView(model,{rootVisible:1}),/boolean/);for(const fn of[createPartitionView,(m,o)=>recoverPartitionFocus(m,m,undefined,o),(m,o)=>partitionNavigation(m,undefined,o)]){assert.throws(()=>fn(model,{unsupported:true}));let calls=0;assert.throws(()=>fn(model,{get maxNodes(){calls++;return 1;}}));assert.equal(calls,0);assert.throws(()=>fn(model,{maxNodes:1}));}
});
test("handles ten thousand levels without recursive focus or recovery",()=>{
 const depth=10000,model=normalizeHierarchyNodes(Array.from({length:depth+1},(_,i)=>({key:i,parentKey:i===0?null:i-1,...(i===depth?{value:1}:{})})),{maxNodes:depth+1});
 const view=createPartitionView(model,{maxNodes:depth+1,focusKey:model.nodes[depth-1].key});assert.equal(view.nodes.length,2);assert.equal(view.breadcrumbKeys.length,depth-1);assert.equal(view.nodes[1].u1,1);
});
test("retains residual tails and zero-value focused identities",()=>{
 const model=normalizeHierarchyNodes([{key:"r",parentKey:null,value:8},{key:"a",parentKey:"r",value:5},{key:"z",parentKey:"a",value:0},{key:"c",parentKey:"a",value:2}],{valueMode:"inclusive"});
 const view=createPartitionView(model,{focusKey:encodeRowKey("a")});assert.equal(view.nodes[0].residual,3);assert.equal(view.nodes[0].residualStart,.4);assert.deepEqual(view.nodes.map(n=>[n.u0,n.u1]),[[0,1],[0,0],[0,.4]]);
 const zero=createPartitionView(model,{focusKey:encodeRowKey("z")});assert.equal(zero.nodes.length,1);assert.equal(zero.nodes[0].key,encodeRowKey("z"));assert.equal(zero.diagnostics.emptyValue,true);
});
test("charges combined validation and view work before allocating results",()=>{
 const heavy=length=>{const key="x".repeat(length);return{nodes:[{key,parentKey:null,childrenKeys:[],depth:0,ownValue:1,totalValue:1,residual:1,sourceRows:[]}],rootKey:key,valueMode:"leaf-sum",totalValue:1,diagnostics:{emptyHierarchy:false,emptyValue:false,ignoredInternalValues:[]}};};
 const model=heavy(5000000);assert.throws(()=>createPartitionView(model),/work/);assert.throws(()=>recoverPartitionFocus(model,model),/work/);assert.throws(()=>partitionNavigation(heavy(9999950)),/work/);
});

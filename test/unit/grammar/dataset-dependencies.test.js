import test from "node:test";
import assert from "node:assert/strict";
import {datasetInputReferences,datasetInputIds,rebindTransformDatasetInputs,orderedDatasetDependents,orderedDatasetAncestors} from "../../../src/grammar/datasetDependencies.js";
const unary=(id,source)=>({id,source,transform:[{type:"computed"}]}),lookup=(id,source,right)=>({id,source,transform:[{type:"lookup",lookup:{data:right}}]});
test("dataset reference paths preserve both inputs and deduplicate graph edges only",()=>{
  const d=lookup("joined","a","a");assert.deepEqual(datasetInputReferences(d),[{id:"a",path:["source"]},{id:"a",path:["transform",0,"lookup","data"]}]);assert.deepEqual(datasetInputIds(d),["a"]);assert.deepEqual(datasetInputReferences({id:"raw"}),[]);
});
test("unary descendants retain the exact depth-first historical order",()=>{
  const d=[{id:"raw"},unary("b","raw"),unary("c","raw"),unary("d","b"),unary("e","d"),unary("f","c")];
  assert.deepEqual(orderedDatasetDependents(d,"raw").map(d=>d.id),["b","d","e","c","f"]);
});
test("diamond lookup waits for both changed parents and runs once",()=>{
  const d=[{id:"raw"},unary("b","raw"),unary("c","raw"),lookup("joined","b","c"),unary("out","joined")];
  assert.deepEqual(orderedDatasetDependents(d,"raw").map(d=>d.id),["b","c","joined","out"]);
  assert.deepEqual(orderedDatasetDependents(d,"c").map(d=>d.id),["joined","out"]);
});
test("revisions follow a secondary input even when the primary is unrelated",()=>{
  const d=[{id:"left"},{id:"right"},lookup("joined","left","right"),unary("mean","joined")];assert.deepEqual(orderedDatasetDependents(d,"right").map(d=>d.id),["joined","mean"]);
});
test("repeated references to one parent do not create duplicate output",()=>{
  const d=[{id:"a"},lookup("joined","a","a"),unary("out","joined")];assert.deepEqual(orderedDatasetDependents(d,"a").map(d=>d.id),["joined","out"]);
});
test("owned caches and descendants are excluded by the explicit revision policy",()=>{
  const d=[{id:"a"},{id:"cache",source:"a",transform:[{type:"statisticalReference"}]},unary("cacheChild","cache"),unary("ordinary","a")];assert.deepEqual(orderedDatasetDependents(d,"a",{skip:d=>d.transform[0].type==="statisticalReference"}).map(d=>d.id),["ordinary"]);
});
test("dataset dependency cycles and missing inputs reject",()=>{
  assert.throws(()=>orderedDatasetDependents([unary("a","b"),lookup("b","a","a")],"a"),/cycle/);
  assert.throws(()=>orderedDatasetDependents([{id:"a"},lookup("b","a","missing")],"a"),/missing input/);
  assert.throws(()=>orderedDatasetDependents([{id:"a"},{id:"a"}],"a"),/duplicate/);
  assert.throws(()=>orderedDatasetDependents([{id:"a"}],"absent"),/no root/);
});
test("transform rebinding copies only an actual secondary reference change",()=>{
  const d=lookup("joined","a","b").transform[0],next=rebindTransformDatasetInputs(d,new Map([["b","bV2"]]));assert.equal(next.lookup.data,"bV2");assert.equal(d.lookup.data,"b");assert.notEqual(next,d);assert.notEqual(next.lookup,d.lookup);assert.equal(rebindTransformDatasetInputs(d,new Map()),d);const unary={type:"computed"};assert.equal(rebindTransformDatasetInputs(unary,new Map([["b","bV2"]])),unary);
});

test("lookup ancestors include both branches once before their consumer",()=>{
 const rows=[{id:"raw"},unary("a","raw"),unary("b","raw"),lookup("joined","a","b")];
 assert.deepEqual(orderedDatasetAncestors(rows,"joined").map(d=>d.id),["raw","a","b","joined"]);
 assert.throws(()=>orderedDatasetAncestors([lookup("a","raw","missing"),{id:"raw"}],"a"),/missing/);
 assert.throws(()=>orderedDatasetAncestors([lookup("a","raw","a"),{id:"raw"}],"a"),/cycle/);
 assert.throws(()=>orderedDatasetAncestors([{id:"raw"},{id:"raw"}],"raw"),/duplicate/);
});

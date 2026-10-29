import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { withGraphSourceRevisions, graphSourceRevisions, withGraphSourceProjection, graphSourceProjection } from "../../../src/actions/graphs/sourceRevisionContext.js";
import { action } from "../../../src/core/action.js";
import { dataInputReference } from "../../../src/selectors/resources.js";
import { withPreparedResourceResults, preparedResourceResults, preparedResourceDataReplacements } from "../../../src/actions/primitives/preparedResourceContext.js";

function fixture() {
  const before=chart().createData({id:"rows",values:[{id:"a",x:0},{id:"b",x:1}],keyField:"id"})
    .createInferredGraphData({id:"network",nodeKey:"id",ruleId:"r",rule:"knn",features:["x"],metric:"euclidean"});
  const after=before.reviseData({source:"rows",id:"next",values:[{id:"a",x:0},{id:"b",x:2}]});
  const previous=before.semanticSpec.resources.find(r=>r.kind==="graph"),resource=after.semanticSpec.resources.find(r=>r.kind==="graph");
  return { before, after, args:{property:"resource[graph:network]",value:resource}, replacement:{previous:{kind:"graph",id:"network",revision:0},resource},
    data:{previous:dataInputReference(before.semanticSpec.datasets[0]),next:dataInputReference(after.semanticSpec.datasets.at(-1))} };
}

test("prepared graph and source revisions bind to exact receiver, preserve nesting and expire on throws",()=>{
  const {before,after,args,replacement,data}=fixture();
  const probe=action({op:"probePreparedRevisions",description:"Inspect private revision authority during a wrapped invocation."},function(){
    const outer=preparedResourceDataReplacements(args,this);
    assert.deepEqual(outer,[data]);assert.ok(Object.isFrozen(outer[0].next));
    assert.equal(preparedResourceResults(args,this)[0].resource.revision,1);
    assert.deepEqual(preparedResourceDataReplacements({...args},this),[]);
    withPreparedResourceResults(before,args,[],()=>assert.deepEqual(preparedResourceDataReplacements(args),[]));
    assert.equal(preparedResourceDataReplacements(args,this),outer);
    assert.throws(()=>withPreparedResourceResults(before,args,[],()=>{throw Error("stop");}),/stop/);
    assert.equal(preparedResourceDataReplacements(args,this),outer);
    return this;
  });
  withPreparedResourceResults(before,args,[replacement],()=>{
    probe.call(before,{});
    assert.throws(()=>probe.call(after,{}),/different receiver/);
  },[data]);
  assert.equal(preparedResourceResults(args),undefined);assert.deepEqual(preparedResourceDataReplacements(args),[]);
});

test("prepared source mappings reject stale, cross-source, duplicate and non-own replacement authority",()=>{
  const {before,args,replacement,data}=fixture();let invoked=0,getters=0;
  const getter=Object.defineProperty({},"previous",{enumerable:true,get(){getters++;return data.previous;}});
  for(const mappings of [[{...data,extra:true}],[data,data],[{...data,next:data.previous}],
    [{...data,next:{...data.next,logicalId:"unrelated"}}],[{...data,next:{kind:"graph",id:"network",revision:1}}],
    [{previous:data.previous,wrong:data.next}],[getter],Object.assign([],{extra:true})]) {
    assert.throws(()=>withPreparedResourceResults(before,args,[replacement],()=>{invoked++;},mappings));
    assert.equal(preparedResourceResults(args),undefined);
  }
  assert.equal(invoked,0);assert.equal(getters,0);
});


test("source revision context restores outer bindings and cannot leak to another receiver",()=>{
  const {before,after}=fixture(), outer=[], inner=[];
  let expected;
  const probe=action({op:"inspectGraphSources",description:"Read receiver-bound graph source changes."},function(){assert.equal(graphSourceRevisions(this),expected);return this;});
  withGraphSourceRevisions(before,outer,()=>{
    expected=outer;probe.call(before,{});
    withGraphSourceRevisions(before,inner,()=>{expected=inner;probe.call(before,{});});
    expected=outer;probe.call(before,{});
    assert.throws(()=>withGraphSourceRevisions(before,inner,()=>{throw Error("stop");}),/stop/);
    probe.call(before,{}); expected=undefined;probe.call(after,{});
  });
  probe.call(before,{});
});

test("graph projection authority is separate from revision and restores nested mode", () => {
  const { before, after } = fixture(), sources = new Map();
  const probe = action({ op: "inspectGraphProjection", description: "Inspect source projection authority." }, function ({ projected }) {
    assert.equal(graphSourceProjection(this), projected);
    assert.equal(graphSourceRevisions(this), projected ? sources : undefined);
    return this;
  });
  withGraphSourceProjection(before, sources, () => {
    probe.call(before, { projected: true });
    probe.call(after, { projected: false });
    withGraphSourceRevisions(before, undefined, () => probe.call(before, { projected: false }));
    probe.call(before, { projected: true });
  });
  probe.call(before, { projected: false });
});

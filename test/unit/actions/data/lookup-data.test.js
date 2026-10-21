import test from "node:test";import assert from "node:assert/strict";
import {chart} from "../../../../src/index.js";
import {chart as basicChart} from "../../../../src/basic.js";
import {serializeProgram,deserializeProgram} from "../../../../src/persistence.js";
import {collectSemanticDataReferences} from "../../../../src/core/resourceReferences.js";
const people=[{name:"A",age:25,height:180},{name:"B",age:32,height:174},{name:"C",age:39,height:182}];
const groups=[{person:"C",group:"1"},{person:"A",group:"1"},{person:"B",group:"2"}];
const get=(p,id)=>p.semanticSpec.datasets.find(d=>d.id===id);
const current=(p,id)=>get(p,p.materializationConfigs.data.lookup[id].current);
function source(factory=chart){return factory().createData({id:"people",values:people}).createData({id:"groups",values:groups});}
function joined(factory=chart){return source(factory).createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});}
function bars(){return chart().createCanvas({width:400,height:260,margin:50}).createData({id:"people",values:people}).createData({id:"groups",values:groups}).createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}}).createBarPlot({x:"group",y:"age",guides:false});}

test("shortest lookup uses three options and preserves both raw sources and typed lineage",()=>{
 const p=joined();assert.deepEqual(get(p,"ages").values,[{person:"C",group:"1",age:39},{person:"A",group:"1",age:25},{person:"B",group:"2",age:32}]);assert.deepEqual(get(p,"people").values,people);assert.deepEqual(get(p,"groups").values,groups);assert.equal(p.trace.children.at(-1).op,"createLookupData");assert.equal(Object.keys(p.trace.children.at(-1).args).length,3);assert.deepEqual(p.actionStack,[]);
 const field=get(p,"ages").schema.fields.find(f=>f.name==="age");assert.equal(field.storageType,"number");assert(field.nullable&&!field.optional);assert.deepEqual(field.lineage,{inputs:[{data:"groups",field:"person"},{data:"people",field:"name"},{data:"people",field:"age"}],owner:"ages",role:"lookup:age"});
});
test("lookup explicit source is independent of whichever table is current",()=>{
 const p=chart().createData({id:"groups",values:groups}).createData({id:"people",values:people}).createLookupData({id:"ages",source:"groups",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});assert.deepEqual(get(p,"ages").values,get(joined(),"ages").values);
});
test("nine independent reference rows produce exact expected group means",()=>{
 const names=["A","B","C","D","E","F","G","H","I"],ages=[25,32,39,42,23,21,51,63,54];
 const right=names.map((name,i)=>({name,age:ages[i]})),left=names.map((person,i)=>({person,group:String(Math.floor(i/3)+1)}));
 const p=chart().createData({id:"people",values:right}).createData({id:"groups",values:left}).createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}}).createSummaryData({id:"means",groupBy:"group",aggregates:[{op:"mean",field:"age",as:"mean"}]});assert.deepEqual(get(p,"means").values,[{group:"1",mean:32},{group:"2",mean:86/3},{group:"3",mean:56}]);
});
test("lookup never coerces copied string cells before an explicit numeric computation",()=>{
 const p=chart().createData({id:"people",values:people.map(r=>({...r,age:String(r.age)}))}).createData({id:"groups",values:groups}).createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});assert.equal(get(p,"ages").schema.fields.find(f=>f.name==="age").storageType,"string");assert.equal(get(p,"ages").values[0].age,"39");const n=p.createComputedData({id:"numeric",as:"numericAge",expression:{op:"toNumber",operand:{field:"age"}}});assert.equal(get(n,"numeric").values[0].numericAge,39);assert.equal(get(n,"numeric").values[0].age,"39");
});
test("nullable missing matches retain the declared reference field type",()=>{
 const p=chart().createData({id:"people",values:[],schema:{fields:[{name:"name",storageType:"string"},{name:"age",storageType:"number"}]}}).createData({id:"groups",values:[{person:"missing"}]}).createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});assert.deepEqual(get(p,"ages").values,[{person:"missing",age:null}]);assert.equal(get(p,"ages").schema.fields.find(f=>f.name==="age").storageType,"number");
});
test("lookup schema rejects collisions even for an empty declared primary table",()=>{
 const p=chart().createData({id:"people",values:people}).createData({id:"groups",values:[],schema:{fields:[{name:"person",storageType:"string"},{name:"age",storageType:"number"}]}});assert.throws(()=>p.createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}}),/already exists/);
});
test("invalid lookup creation is atomic and rejects unknown public options",()=>{
 const p=source(),before=serializeProgram(p),valid={id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}};
 for(const args of [{...valid,unknown:true},{...valid,id:"people"},{...valid,id:undefined},{...valid,field:"absent"},{...valid,lookup:{...valid.lookup,data:"absent"}},{...valid,lookup:{...valid.lookup,key:"absent"}},{...valid,lookup:{...valid.lookup,fields:["absent"]}},{...valid,lookup:{...valid.lookup,as:["person"]}},{...valid,lookup:{...valid.lookup,extra:true}}]){assert.throws(()=>p.createLookupData(args));assert.equal(serializeProgram(p),before);}
});
test("duplicate right keys reject before changing source state",()=>{
 const p=chart().createData({id:"right",values:[{key:"A",age:1},{key:"A",age:2}]}).createData({id:"left",values:[{person:"A"}]}),before=serializeProgram(p);assert.throws(()=>p.createLookupData({id:"ages",field:"person",lookup:{data:"right",key:"key",fields:["age"]}}),/duplicate/);assert.equal(serializeProgram(p),before);
});
test("lookup secondary references prevent either original table from being removed",()=>{
 const p=joined(),refs=collectSemanticDataReferences(p).filter(r=>r.ownerId==="ages");assert(refs.some(r=>r.id==="people"&&JSON.stringify(r.path)==='["transform",0,"lookup","data"]'));for(const id of["people","groups"])assert.throws(()=>p.removeData({id}),/referenc|depend|use/);
});
test("source revisions of either input recompute the chart and preserve old inputs",()=>{
 const p=bars().editYScale({domain:[0,100]}),before=serializeProgram(p);const right=p.reviseData({source:"people",id:"peopleV2",values:people.map(r=>({...r,age:r.age*2}))});assert.deepEqual(current(right,"ages").values.map(r=>r.age),[78,50,64]);assert.equal(current(right,"ages").transform[0].lookup.data,"peopleV2");assert.equal(right.semanticSpec.layers[0].data,current(right,"ages").id);assert.notDeepEqual(right.graphicSpec,p.graphicSpec);assert.deepEqual(get(right,"people").values,people);
 const left=p.reviseData({source:"groups",id:"groupsV2",values:[{person:"B",group:"3"}]});assert.deepEqual(current(left,"ages").values,[{person:"B",group:"3",age:32}]);assert.equal(current(left,"ages").source,"groupsV2");assert.equal(serializeProgram(p),before);
});
test("duplicate-key reference revision fails atomically",()=>{
 const p=bars(),before=serializeProgram(p);assert.throws(()=>p.reviseData({source:"people",id:"peopleV2",values:[...people,{name:"A",age:1}]}),/duplicate/);assert.equal(serializeProgram(p),before);
});
test("lookup editor renames direct chart consumers and remains addressable",()=>{
 const p=bars(),n=p.editLookupData({target:"ages",lookup:{data:"people",key:"name",fields:["age"],as:["years"]}});assert.deepEqual(current(n,"ages").values.map(r=>r.years),[39,25,32]);assert.equal(n.semanticSpec.layers[0].encoding.y.field,"years");assert(n.editLookupData({target:"ages",lookup:{data:"people",key:"name",fields:["height"],as:["years"]}}));assert.equal(p.semanticSpec.layers[0].encoding.y.field,"age");
});
test("lookup editor requires explicit downstream recomputation",()=>{
 const p=joined().createComputedData({id:"twice",as:"twiceAge",expression:{op:"multiply",left:{field:"age"},right:{constant:2}}});const patch={target:"ages",lookup:{data:"people",key:"name",fields:["height"],as:["age"]}};assert.throws(()=>p.editLookupData(patch),/recompute/);const n=p.editLookupData({...patch,dependents:"recompute"}),id=n.materializationConfigs.data.computed.twice.current;assert.deepEqual(get(n,id).values.map(r=>r.twiceAge),[364,360,348]);
});
test("revising a derived reference rebinds the lookup dependency",()=>{
 const p=chart().createData({id:"people",values:people}).createComputedData({id:"right",as:"number",expression:{op:"multiply",left:{field:"age"},right:{constant:2}}}).createData({id:"groups",values:groups}).createLookupData({id:"ages",field:"person",lookup:{data:"right",key:"name",fields:["number"],as:["age"]}});
 const n=p.editComputedData({target:"right",expression:{op:"multiply",left:{field:"age"},right:{constant:3}},dependents:"recompute"});assert.deepEqual(current(n,"ages").values.map(r=>r.age),[117,75,96]);assert.equal(current(n,"ages").transform[0].lookup.data,n.materializationConfigs.data.computed.right.current);
});
test("diamond source revisions materialize a lookup once after both changed branches",()=>{
 const p=chart().createData({id:"raw",values:people}).createComputedData({id:"right",as:"doubleAge",expression:{op:"multiply",left:{field:"age"},right:{constant:2}}}).createComputedData({id:"left",source:"raw",as:"group",expression:{constant:"G"}}).createLookupData({id:"ages",field:"name",lookup:{data:"right",key:"name",fields:["doubleAge"],as:["joinedAge"]}}).createSummaryData({id:"means",aggregates:[{op:"mean",field:"joinedAge",as:"mean"}]});
 const n=p.reviseData({source:"raw",id:"rawV2",values:people.map(r=>({...r,age:r.age*2}))});assert.deepEqual(current(n,"ages").values.map(r=>r.joinedAge),[100,128,156]);const id=n.materializationConfigs.data.summary.means.current;assert.deepEqual(get(n,id).values,[{mean:128}]);let calls=0;function visit(t){if(t.op==="materializeLookupData")calls++;for(const c of t.children??[])visit(c);}visit(n.trace.children.at(-1));assert.equal(calls,1);
});
test("lookup edit rejects own results and downstream tables as reference inputs",()=>{
 const p=joined().createComputedData({id:"child",as:"other",expression:{field:"age"}}),before=serializeProgram(p);for(const data of["ages","child"])assert.throws(()=>p.editLookupData({target:"ages",lookup:{data,key:"person",fields:["age"],as:["alias"]},dependents:"recompute"}),/own result|dependent/);assert.equal(serializeProgram(p),before);
});
test("Full and Basic share lookup creation while editors remain Full-only",()=>{
 const full=joined(),basic=joined(basicChart);assert.deepEqual(basic.semanticSpec,full.semanticSpec);assert.equal(typeof basic.editLookupData,"undefined");assert.deepEqual(deserializeProgram(serializeProgram(basic)).semanticSpec,basic.semanticSpec);
});
test("editable persistence preserves both dependencies and rejects stale values or lineage",()=>{
 const p=joined();assert.deepEqual(deserializeProgram(serializeProgram(p)).semanticSpec,p.semanticSpec);
 for(const mutate of [s=>s.datasets.find(d=>d.id==="ages").values[0].age=40,s=>s.datasets.find(d=>d.id==="ages").transform[0].lookup.data="missing",s=>s.datasets.find(d=>d.id==="ages").schema.fields.at(-1).lineage.inputs.pop(),s=>s.datasets.find(d=>d.id==="ages").transform[0].lookup.data="ages"]){const semanticSpec=structuredClone(p.semanticSpec);mutate(semanticSpec);assert.throws(()=>serializeProgram(p._clone({semanticSpec})));}
});

test("lookup persistence rejects absent input fields even when cached values are forged",()=>{
 const p=joined();
 for(const mutate of [d=>d.transform[0].field="absent",d=>d.transform[0].lookup.key="absent",d=>d.transform[0].lookup.fields=["absent"]]){
  const semanticSpec=structuredClone(p.semanticSpec),d=semanticSpec.datasets.find(d=>d.id==="ages");mutate(d);
  assert.throws(()=>serializeProgram(p._clone({semanticSpec})),/field|schema/i);
 }
});

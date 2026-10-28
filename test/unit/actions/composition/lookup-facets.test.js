import test from "node:test";import assert from "node:assert/strict";
import {chart} from "../../../../src/index.js";
import {serializeProgram,deserializeProgram} from "../../../../src/persistence.js";
const people=[{name:"A",age:25,height:180,kind:"K1"},{name:"B",age:32,height:174,kind:"K2"}];
const groups=[{person:"A",group:"G1"},{person:"B",group:"G1"},{person:"A",group:"G2"},{person:"B",group:"G2"}];
function source(){return chart().createCanvas({width:360,height:260,margin:50})
 .createData({id:"people",values:people}).createData({id:"groups",values:groups})
 .createLookupData({id:"joined",field:"person",lookup:{data:"people",key:"name",fields:["age","height","kind"]}})
 .createScatterPlot({x:"age",y:"height",guides:false});}
function visibleRows(p){return Object.values(p.children).flatMap(child=>{const layer=child.semanticSpec.layers.find(l=>l.mark.type==="point");return child.semanticSpec.datasets.find(d=>d.id===layer.data).values;});}
for(const[name,build,rows]of[
 ["primary-field facet",p=>p.facet({field:"group"}),4],
 ["explicit primary-anchor replay",p=>p.facet({data:"groups",field:"group"}),4],
 ["lookup-result facet",p=>p.facet({field:"kind"}),4],
 ["two-role grid",p=>p.facetGrid({rows:{field:"group"},columns:{field:"kind"}}),4],
 ["direct materialized lookup repeat",p=>p.repeatCharts({target:"scatterPlot",channel:"y",fields:["age","height"]}),8]
])test(name+" keeps both tables and updates a reference revision",()=>{
 const original=build(source()),before=serializeProgram(original);assert.equal(visibleRows(original).length,rows);
 for(const child of Object.values(original.children))assert.deepEqual(child.semanticSpec.datasets.find(d=>d.id==="people").values,people);
 const revised=original.reviseData({source:"people",id:"peopleV2",values:people.map(p=>({...p,age:p.age+1}))});
 assert.equal(visibleRows(revised).length,rows);assert(visibleRows(revised).every(r=>r.age===(r.person==="A"?26:33)));
 assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec,revised.graphicSpec);assert.equal(serializeProgram(original),before);
});
test("lookup compositions update primary revisions without partitioning reference data",()=>{
 const p=source().facet({data:"groups",field:"group"}),next=p.reviseData({source:"groups",id:"groupsV2",values:[{person:"B",group:"G1"},{person:"A",group:"G2"}]});
 assert.equal(visibleRows(next).length,2);assert.deepEqual(visibleRows(next).map(r=>r.age),[32,25]);for(const child of Object.values(next.children))assert.deepEqual(child.semanticSpec.datasets.find(d=>d.id==="people").values,people);
});
test("lookup repeat rejects invalid fields atomically and accepts materialized computed columns",()=>{
 const p=source(),before=serializeProgram(p);assert.throws(()=>p.repeatCharts({target:"scatterPlot",channel:"y",fields:["age","absent"]}));assert.equal(serializeProgram(p),before);
 const q=p.createComputedData({id:"extra",as:"number",expression:{constant:1}}).bindMarkData({target:"scatterPlot",data:"extra"});
 const repeated=q.repeatCharts({target:"scatterPlot",channel:"y",fields:["age","height"]});assert.equal(visibleRows(repeated).length,8);
 const filtered=p.filterData({id:"subset",field:"person",oneOf:["A"]}).bindMarkData({target:"scatterPlot",data:"subset"});
 assert.throws(()=>filtered.repeatCharts({target:"scatterPlot",channel:"y",fields:["age","height"]}),/derived dataset/);
});

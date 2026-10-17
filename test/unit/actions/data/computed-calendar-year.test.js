import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {serializeProgram,deserializeProgram} from "../../../../src/persistence.js";
const datePart=(operand,timeZone)=>({op:"datePart",part:"year",operand,...(timeZone===undefined?{}:{timeZone})});
const expression=datePart({op:"parseTime",operand:{field:"date"}});
function years(values,expr=expression) {
 return chart().createData({id:"raw",values:values.map(date=>({date}))})
  .createComputedData({id:"years",as:"year",expression:expr});
}
test("calendar years use explicit parsing, UTC, nulls and exact calendar duration",()=>{
 const program=years(["1986-12-30","2024-07-17","2020-02-29","1965-12-31",null,"invalid"]);
 const result=program.semanticSpec.datasets[1].values.map(row=>row.year);
 assert.deepEqual(result,[1986,2024,2020,1965,null,null]);assert.equal(result[1]-result[0],38);
 assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec,program.semanticSpec);
 const edited=program.editComputedData({target:"years",expression:datePart({op:"parseTime",operand:{field:"date"}},"America/New_York")});
 assert.equal(edited.semanticSpec.datasets.find(d=>d.id===edited.materializationConfigs.data.computed.years.current).values[1].year,2024);
 assert.deepEqual(program.semanticSpec.datasets[1].values.map(r=>r.year),result);
});
test("year boundaries are time-zone explicit and astronomical years remain signed",()=>{
 const timestamps=[Date.UTC(2024,0,1,0,30),-62167219200000,-62198755200000, -59042995200000,0.9,-0.9,8640000000000000,-8640000000000000];
 const input=datePart({field:"date"});
 assert.deepEqual(years(timestamps,input).semanticSpec.datasets[1].values.map(r=>r.year),[2024,0,-1,99,1970,1970,275760,-271821]);
 assert.equal(years([timestamps[0]],datePart({field:"date"},"America/New_York")).semanticSpec.datasets[1].values[0].year,2023);
 assert.deepEqual(years([timestamps[1],timestamps[2]],datePart({field:"date"},"Etc/UTC")).semanticSpec.datasets[1].values.map(r=>r.year),[0,-1]);
});
test("calendar input and closed AST errors reject atomically including empty sources",()=>{
 const base=chart().createData({values:[]});const before=serializeProgram(base);
 for(const expr of [{op:"datePart",part:"month",operand:{constant:0}}, {...datePart({constant:0}),extra:true},datePart({constant:0},""),datePart({constant:0},"not/a/zone"),{op:"datePart",part:"year"}]) {
  assert.throws(()=>base.createComputedData({id:"bad",as:"n",expression:expr}));assert.equal(serializeProgram(base),before);
 }
 for(const date of ["2024",true,8640000000000001,-8640000000000001]) {
  assert.throws(()=>years([date],datePart({field:"date"})));
 }
 const lazy=years(["bad"],{op:"if",condition:{constant:false},then:datePart({field:"date"}),else:{constant:null}});
 assert.equal(lazy.semanticSpec.datasets[1].values[0].year,null);
});
test("year and floor expressions replay into derived consumers and facet children",()=>{
 const base=chart().createCanvas({width:500,height:400,margin:80})
  .createData({id:"raw",values:[{group:"A",date:"2024-01-01",value:1.8},{group:"B",date:"2023-12-31",value:2.8}]})
  .createComputedData({id:"years",as:"year",expression})
  .createComputedData({id:"rounded",as:"lower",expression:{op:"floor",operand:{field:"value"}}})
  .createScatterPlot({x:"year",y:"lower",guides:false});
 const before=serializeProgram(base);
 const updated=base.editComputedData({target:"years",dependents:"recompute",expression:datePart({op:"parseTime",operand:{field:"date"}},"America/New_York")});
 const current=updated.materializationConfigs.data.computed.rounded.current;
 assert.deepEqual(updated.semanticSpec.datasets.find(d=>d.id===current).values.map(r=>[r.year,r.lower]),[[2023,1],[2023,2]]);
 assert.equal(serializeProgram(base),before);
 const faceted=base.facet({field:"group",guides:{legend:false}});
 assert.equal(faceted.compositionSpec.children.length,2);
 assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec,faceted.graphicSpec);
});


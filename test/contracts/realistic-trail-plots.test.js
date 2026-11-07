import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets=[{id:"tt-us-births",field:"births"},{id:"tt-trash-wheel",field:"Weight"},{id:"tt-stock-prices",field:"volume",eligible:row=>row.stock_symbol==="AAPL"},{id:"tt-animal-rescues",field:"incident_notional_cost"},{id:"tt-movie-profit",field:"production_budget"}];
const recipes=[{id:"scaled-sample-width",options:{},patch:{body:{opacity:.6}}},{id:"explicit-constant",options:{width:8},patch:{width:12,lineCap:"round"}},{id:"step-width",options:{curve:"step"},patch:{curve:"step-after",lineJoin:"bevel"}}];
const witnesses=new Map();
for(const source of datasets)for(const recipe of recipes)test(`${source.id}/${recipe.id} Trail retains real observations and explicit pixel-width calculation`,()=>{
 try {
  const report=tidyTuesdayFixtureReport(source.id);assert.match(report.sha256,/^[a-f0-9]{64}$/);
  const rows=tidyTuesdaySourceRows(source.id).flatMap((row,index)=>Number.isFinite(row[source.field])&&row[source.field]>=0&&(!source.eligible||source.eligible(row))?[{...row,sourceRowIndex:index}]:[]).slice(0,12);assert.equal(rows.length,12);
  const maximum=Math.max(1,...rows.map(row=>row[source.field]));
  const expression={version:2,registry:"standard@1",root:{type:"binary",op:"add",left:{type:"literal",value:2},right:{type:"binary",op:"multiply",left:{type:"binary",op:"divide",left:{type:"field",name:source.field},right:{type:"literal",value:maximum}},right:{type:"literal",value:10}}}};
  const p=chart().createCanvas({width:800,height:400,margin:40}).createData({id:"raw",values:rows,keyField:"sourceRowIndex"})
   .createComputedData({id:"screen",source:"raw",as:"screenWidth",expression})
   .createTrailPlot({id:"series",data:"screen",x:"sourceRowIndex",y:source.field,width:"screenWidth",guides:false,...recipe.options})
   .editTrailPlot({target:"series",...recipe.patch});
  const computed=p.semanticSpec.datasets.find(dataset=>dataset.id==="screen");
  assert.deepEqual(computed.values.map(row=>row.screenWidth),rows.map(row=>2+row[source.field]/maximum*10));
  assert.deepEqual(computed.values.map(row=>row[source.field]),rows.map(row=>row[source.field]));
  const item=getMarkItems(p,{target:"series"})[0];assert.equal(item.rows.filter(row=>row.data==="raw").length,12);assert.equal(item.rows.filter(row=>row.data==="screen").length,12);
  const saved=serializeProgram(p),q=deserializeProgram(saved).reviseData({source:"raw",id:"reordered",values:[...rows].reverse()});
  assert.equal(getMarkItems(q,{target:"series"})[0].key,item.key);
  assert.deepEqual(q.graphicSpec.objects.series.items[0].properties,p.graphicSpec.objects.series.items[0].properties);
  assertGraphicIntegrity(q,`${source.id}/${recipe.id}`);assertSvgIntegrity(renderToSVG(q),`${source.id}/${recipe.id}`);assert.equal(serializeProgram(p),saved);
  witnesses.set(`${source.id}/${recipe.id}`,p.trace.children.filter(node=>["createTrailPlot","editTrailPlot"].includes(node.op)).map(node=>node.op));
 }finally{releaseTidyTuesdaySourceCache(source.id);}
});
test("Trail records five authentic tables and three direct width recipes",()=>{assert.equal(witnesses.size,15);for(const actions of witnesses.values())assert.deepEqual(actions,["createTrailPlot","editTrailPlot"]);});

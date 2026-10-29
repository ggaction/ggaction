import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
// Each original observation contributes its unchanged additive amount. The host
// explicitly assigns delta roles; ratings, prices and ordinal codes are not summed.
const datasets=[
 {id:"tt-us-births",field:"births"},
 {id:"tt-trash-wheel",field:"Weight"},
 {id:"tt-stock-prices",field:"volume",eligible:row=>row.stock_symbol==="AAPL"},
 {id:"tt-animal-rescues",field:"incident_notional_cost"},
 {id:"tt-movie-profit",field:"production_budget"}
];
const recipes=[
 {id:"ordered-contributions",options:{},patch:{labels:{content:"end",format:".0f",fontSize:8}}},
 {id:"reversed-value-range",options:{yScale:{reverse:true},bars:{opacity:.6}},patch:{yScale:{reverse:false},connectors:{strokeWidth:2}}},
 {id:"amount-color",options:{color:true},patch:{color:false,connectors:false}}
];
const witnesses=new Map();
for(const source of datasets)for(const recipe of recipes)test(`${source.id}/${recipe.id} Waterfall accumulates authentic additive observations`,()=>{
 try{
  const report=tidyTuesdayFixtureReport(source.id);assert.match(report.sha256,/^[a-f0-9]{64}$/);
  const rows=tidyTuesdaySourceRows(source.id).flatMap((row,index)=>Number.isFinite(row[source.field])&&(!source.eligible||source.eligible(row))?[{...row,sourceRowIndex:index,stage:String(index+1),stageRole:"delta"}]:[]).slice(0,12);
  assert.equal(rows.length,12);
  const options={...recipe.options,...(recipe.options.color?{color:{field:source.field,fieldType:"quantitative"}}:{})};
  const p=chart().createCanvas({width:960,height:480,margin:50}).createData({id:"amounts",values:rows,keyField:"sourceRowIndex"}).createWaterfallPlot({id:"steps",x:"stage",role:"stageRole",value:source.field,guides:false,...options}).editWaterfallPlot({target:"steps",...recipe.patch});
  let running=0;const expected=rows.map(row=>{const start=running;running+=row[source.field];return[start,running];});
  const items=getMarkItems(p,{target:"steps"});assert.deepEqual(items.map(i=>[i.channels.start,i.channels.end]),expected);assert.deepEqual(items.map(i=>i.channels.value),rows.map(row=>row[source.field]));
  assert.deepEqual(items.map(i=>i.fields.sourceRowIndex),rows.map(row=>row.sourceRowIndex));
  const saved=serializeProgram(p),keys=items.map(i=>i.key),q=deserializeProgram(saved).reviseData({source:"amounts",id:"reordered",values:[...rows].reverse()});
  assert.deepEqual(getMarkItems(q,{target:"steps"}).map(i=>i.key),[...keys].reverse());
  assertGraphicIntegrity(q,`${source.id}/${recipe.id}`);assertSvgIntegrity(renderToSVG(q),`${source.id}/${recipe.id}`);assert.equal(serializeProgram(p),saved);
  witnesses.set(`${source.id}/${recipe.id}`,p.trace.children.filter(n=>["createWaterfallPlot","editWaterfallPlot"].includes(n.op)).map(n=>n.op));
 }finally{releaseTidyTuesdaySourceCache(source.id);}
});
test("Waterfall records five real additive tables and three direct recipes",()=>{assert.equal(witnesses.size,15);for(const actions of witnesses.values())assert.deepEqual(actions,["createWaterfallPlot","editWaterfallPlot"]);});

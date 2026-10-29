import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { deriveAreaSeries } from "../../src/grammar/areaSeries.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const sources=[{id:"tt-us-births",field:"births"},{id:"tt-trash-wheel",field:"Weight"},{id:"tt-stock-prices",field:"volume",eligible:row=>row.stock_symbol==="AAPL"},{id:"tt-animal-rescues",field:"incident_notional_cost"},{id:"tt-movie-profit",field:"production_budget"}];
for(const source of sources)for(const mode of ["stack","center","wiggle"])test(`${source.id}/${mode} retains one observed measure through source-order Area layout`,()=>{
 try {
  assert.match(tidyTuesdayFixtureReport(source.id).sha256,/^[a-f0-9]{64}$/);
  const rows=tidyTuesdaySourceRows(source.id).flatMap((row,index)=>Number.isFinite(row[source.field])&&row[source.field]>=0&&(!source.eligible||source.eligible(row))?[{...row,sourceRowIndex:index}]:[]).slice(0,12);
  assert.equal(rows.length,12);
  const p=chart().createCanvas({width:800,height:400,margin:40}).createData({id:"raw",values:rows,keyField:"sourceRowIndex"})
    .createAreaPlot({id:"m",x:"sourceRowIndex",y:source.field,layout:mode,guides:false});
  const derived=deriveAreaSeries(rows,p.semanticSpec.layers[0]).series[0].values;
  for(const [i,value] of derived.entries())assert.ok(Math.abs(value.y2-value.y-rows[i][source.field])<=Math.max(1,rows[i][source.field])*8*Number.EPSILON);
  const item=getMarkItems(p,{target:"m"})[0];assert.equal(item.rows.length,12);
  const saved=serializeProgram(p),q=deserializeProgram(saved).reviseData({source:"raw",id:"reordered",values:[...rows].reverse()});
  assert.equal(getMarkItems(q,{target:"m"})[0].key,item.key);
  assert.deepEqual(q.graphicSpec.objects.m.items[0].properties,p.graphicSpec.objects.m.items[0].properties);
  assertGraphicIntegrity(q,`${source.id}/${mode}`);assertSvgIntegrity(renderToSVG(q),`${source.id}/${mode}`);assert.equal(serializeProgram(p),saved);
 }finally{releaseTidyTuesdaySourceCache(source.id);}
});

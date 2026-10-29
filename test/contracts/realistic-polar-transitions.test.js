import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { planTransition,sampleTransition,serializeAnimation,deserializeAnimation } from "../../src/animation.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows,tidyTuesdayFixtureReport,releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";

const sources=[{id:"tt-us-births",field:"births"},{id:"tt-trash-wheel",field:"Weight"},{id:"tt-stock-prices",field:"volume",eligible:row=>row.stock_symbol==="AAPL"},{id:"tt-animal-rescues",field:"incident_notional_cost"},{id:"tt-movie-profit",field:"production_budget"}];
for(const source of sources)test(`${source.id} preserves original polar observations through viewport and offline transitions`,()=>{
  try{
    const original=tidyTuesdaySourceRows(source.id);assert.match(tidyTuesdayFixtureReport(source.id).sha256,/^[a-f0-9]{64}$/);
    // The exact first twelve positive observations form one declared cohort.
    // Angular order is original source-row order; radial units are unchanged.
    const rows=original.flatMap((row,index)=>Number.isFinite(row[source.field])&&row[source.field]>0&&(!source.eligible||source.eligible(row))?[{...row,sourceRowIndex:index}]:[]).slice(0,12);
    assert.equal(rows.length,12);for(const row of rows)assert.equal(row[source.field],original[row.sourceRowIndex][source.field]);
    const base=chart().createCanvas({width:400,height:400,margin:30}).createData({id:"raw",values:rows,keyField:"sourceRowIndex"});
    const programs=[base.createPointMark({id:"m"}).encodeTheta({field:"sourceRowIndex"}).encodeR({field:source.field}),base.createLineMark({id:"m"}).encodeTheta({field:"sourceRowIndex"}).encodeR({field:source.field}),base.createArcMark({id:"m",innerRadius:.2}).encodeTheta({field:source.field})];
    for(const from of programs){
      const to=from.reviseData({source:"raw",id:"reordered",values:[...rows].reverse()}).editCanvas({width:600,height:600});
      const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),frame=sampleTransition(plan,50);
      assert.ok(frame.decisions.some(d=>d.kernel==="polar-geometry"));
      assert.ok(frame.decisions.filter(d=>d.itemKey!==undefined).every(d=>d.kind!=="crossfade"));
      assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),frame);
      assertSvgIntegrity(renderToSVG(frame),`${source.id}/polar`);assert.deepEqual(from.semanticSpec.datasets.find(d=>d.id==="raw").values,rows);
    }
  }finally{releaseTidyTuesdaySourceCache(source.id);}
});

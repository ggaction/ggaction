import test from "node:test";
import assert from "node:assert/strict";
import { createMarginal } from "../../examples/marginal/program.js";
import { createLinkedOverlay } from "../../examples/linked-overlay/program.js";
import { createBullet } from "../../examples/bullet/program.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const sources = [
  ["tt-penguins","bill_length_mm","bill_depth_mm"],
  ["tt-stock-prices","open","close"],
  ["tt-movie-profit","production_budget","worldwide_gross"],
  ["tt-us-births","date_of_month","births"],
  ["tt-trash-wheel","Weight","Volume"]
];
for(const [id,x,y] of sources) test(`${id} Marginal, Bullet and Combo preserve raw units and explicit reference statistics`,()=>{
  try{
    const report=tidyTuesdayFixtureReport(id);assert.match(report.sha256,/^[a-f0-9]{64}$/);
    // The birth source stores calendar day as a numeric string; this declared
    // day-of-month projection retains its original field alongside numeric x.
    const rows=tidyTuesdaySourceRows(id).flatMap((row,index)=>{
      const xValue=id==="tt-us-births"?Number(row[x]):row[x];
      return Number.isFinite(xValue)&&Number.isFinite(row[y])?[{...row,id:index,x:xValue,y:row[y]}]:[];
    }).slice(0,24);
    assert.equal(rows.length,24);
    const domain=field=>[Math.min(...rows.map(row=>row[field])),Math.max(...rows.map(row=>row[field]))];
    const xDomain=domain("x"),yDomain=domain("y"),bins=([a,b])=>[a,a+(b-a)/4,a+(b-a)/2,a+3*(b-a)/4,b];
    const p=createMarginal(rows,{xDomain,yDomain,xBins:bins(xDomain),yBins:bins(yDomain),countDomain:[0,24]});
    assert.deepEqual(p.children.x.semanticSpec.datasets[0].values,rows);
    for(const child of [p.children.x,p.children.lower.children.y])assert.equal(child.semanticSpec.datasets.find(d=>d.id==="bins").values.reduce((s,row)=>s+row.count,0),24);
    assert.equal(getMarkItems(p,{target:{childPath:["lower","center"],id:"points"}}).length,24);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
    assertGraphicIntegrity(p,id);assertSvgIntegrity(renderToSVG(p),id);
    // Explicit references in the source field's original units: mean versus observed maximum.
    const upper=Math.max(...rows.map(row=>row.y)),actual=rows.reduce((s,row)=>s+row.y,0)/rows.length;
    const q=createBullet([{id,metric:y,actual,target:upper,sourceHash:report.sha256,sourceIndices:rows.map(row=>row.id),reference:"24-row mean and maximum"}],{metric:y,domain:[0,upper],referenceRanges:[
      {id:"low",lower:0,upper:upper/2,level:"Low"},
      {id:"middle",lower:upper/2,upper:upper*.75,level:"Middle"},
      {id:"high",lower:upper*.75,upper,level:"High"}
    ]});
    assert.equal(getMarkItems(q,{target:"measure"})[0].channels.x2,actual);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
    assertGraphicIntegrity(q,id);assertSvgIntegrity(renderToSVG(q),id);
    // A cohort position labels each observation; sales retains the original y units.
    const comboRows=rows.map(row=>({...row,month:String(row.id),sales:row.y,sourceHash:report.sha256}));
    const combo=createLinkedOverlay().editCanvas({plot:{width:960,height:240}}).editYScale({target:"bars",domain:[0,upper],nice:false})
      .reviseData({source:"data",id:"cohort",values:comboRows});
    const [bars,line]=combo.semanticSpec.layers;
    assert.equal(bars.encoding.y.scale,line.encoding.y.scale);
    assert.deepEqual(combo.semanticSpec.datasets.find(d=>d.id==="cohort").values,comboRows);
    assert.equal(getMarkItems(combo,{target:"bars"}).length,24);
    assert.deepEqual(deserializeProgram(serializeProgram(combo)).graphicSpec,combo.graphicSpec);
    assertGraphicIntegrity(combo,id);assertSvgIntegrity(renderToSVG(combo),id);
  }finally{releaseTidyTuesdaySourceCache(id);}
});

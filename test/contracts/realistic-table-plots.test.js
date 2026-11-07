import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { exportAccessibleData } from "../../src/accessibility.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets = [{id:"tt-us-births",field:"births"},{id:"tt-trash-wheel",field:"Weight"},{id:"tt-stock-prices",field:"volume"},
  {id:"tt-animal-rescues",field:"incident_notional_cost"},{id:"tt-movie-profit",field:"production_budget"}];
const witnesses = new Set();
for (const source of datasets) for (const cell of ["text", "bar"]) test(`${source.id}/${cell} Table preserves source rows and full-cohort footer behind an explicit limit`, () => {
  try {
    const report = tidyTuesdayFixtureReport(source.id); assert.match(report.sha256,/^[a-f0-9]{64}$/);
    const rows = tidyTuesdaySourceRows(source.id).flatMap((row,index)=>Number.isFinite(row[source.field]) ? [{...row,sourceRowIndex:index}] : []).slice(0,12);
    assert.equal(rows.length,12);
    const p = chart().createCanvas({width:640,height:300,margin:30}).createData({id:"raw",values:rows,keyField:"sourceRowIndex"})
      .createTablePlot({id:"observations",columns:[{field:"sourceRowIndex",label:"Source row",width:120},
        {field:source.field,cell,footer:"sum",format:".2f",align:"right"}],rowLimit:5,sortBy:[{field:source.field,order:"descending"},{field:"sourceRowIndex",order:"ascending"}]})
      .editTablePlot({target:"observations",cells:{stroke:"#475569"},headerStyle:{fill:"#e2e8f0"}});
    const cells = getMarkItems(p,{target:"observations"}), footer = cells.find(item=>item.channels.role==="footer" && item.channels.inputRows===12);
    assert.equal(cells.filter(item=>item.channels.role==="body").length,10);
    const sum=rows.reduce((total,row)=>total+row[source.field],0);
    assert.ok(Math.abs(footer.channels.value-sum)<=Math.max(1,Math.abs(sum))*1e-12);
    assert.equal(footer.rows.length,12); assert.equal(footer.channels.visibleRowCount,5); assert.equal(footer.channels.omittedRowCount,7);
    assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
    const before=serializeProgram(p),q=deserializeProgram(before).reviseData({source:"raw",id:"reordered",values:[...rows].reverse()});
    assert.deepEqual(new Set(getMarkItems(q,{target:"observations"}).map(item=>item.key)),new Set(cells.map(item=>item.key)));
    assert.equal(exportAccessibleData(q,{target:"observations"}).views[0].rows.length,14);
    assertGraphicIntegrity(q,source.id); assertSvgIntegrity(renderToSVG(q),source.id); assert.equal(serializeProgram(p),before);
    witnesses.add(`${source.id}/${cell}`);
  } finally { releaseTidyTuesdaySourceCache(source.id); }
});
test("Table witnesses retain five authentic tables and both scalar and bar-cell presentations",()=>assert.equal(witnesses.size,10));

for (const source of datasets) test(`${source.id}/sparkline preserves an explicit source cohort and its observation lineage`, () => {
  try {
    const report = tidyTuesdayFixtureReport(source.id), raw = tidyTuesdaySourceRows(source.id);
    const observations = raw.flatMap((row, index) => Number.isFinite(row[source.field]) ? [{sourceRowIndex:index, value:row[source.field]}] : []).slice(0,12);
    assert.equal(observations.length,12);
    // A declared nested cohort projection; no invented observation or financial role.
    const values = [{ id: source.id, sourceHash: report.sha256, observations }];
    const p = chart().createCanvas({width:500,height:180,margin:20}).createData({id:"cohort",values,keyField:"id"})
      .createTablePlot({columns:[{field:"id",label:"Source"},{field:"observations",label:source.field,
        cell:{type:"sparkline",x:"sourceRowIndex",y:"value"},footer:"count"}]});
    const cell = getMarkItems(p,{target:"table"}).find(item=>item.channels.role==="body"&&Array.isArray(item.channels.value));
    assert.deepEqual(cell.channels.value,observations);
    assert.equal(cell.rows.length,1); assert.equal(cell.fields.sourceHash,report.sha256);
    assert.equal(p.graphicSpec.objects.table.children.flatMap(id=>p.graphicSpec.objects[id].items).filter(item=>item.type==="path").length,1);
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
    assertGraphicIntegrity(p,source.id); assertSvgIntegrity(renderToSVG(p),source.id);
  } finally { releaseTidyTuesdaySourceCache(source.id); }
});
